using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;

namespace VietTuneArchive.Tests.Integration.Controllers;

public class RecordingControllerTests : ApiTestBase
{
    public RecordingControllerTests(WebAppFactory factory) : base(factory)
    {
    }

    protected async Task<Guid> SeedRecording(RecordingStatus status, ApprovalStatus approvalStatus, string title = "Test Recording")
    {
        var recording = new Recording
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = "A test recording",
            AudioFileUrl = "http://test.com/audio.mp3",
            Status = (SubmissionStatus)status, // Cast for matching type
            ApprovalStatus = approvalStatus,
            CreatedAt = DateTime.UtcNow
        };
        
        DbContext.Recordings.Add(recording);
        await DbContext.SaveChangesAsync();
        return recording.Id;
    }

    public class GetAllTests : RecordingControllerTests
    {
        public GetAllTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetAll_AuthenticatedAsAdmin_Returns200AndPaginatedList()
        {
            AuthenticateAs("Admin");
            await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Pending);

            var response = await GetAsync("/api/Recording?page=1&size=5");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadFromJsonAsync<dynamic>();
            // Verify pagination
            content.Should().NotBeNull();
        }

        [Fact]
        public async Task GetAll_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Recording");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public class GetByIdTests : RecordingControllerTests
    {
        public GetByIdTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetById_ValidId_Returns200()
        {
            AuthenticateAs("Contributor");
            var id = await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Pending);

            var response = await GetAsync($"/api/Recording/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<dynamic>();
            result.Should().NotBeNull();
        }

        [Fact]
        public async Task GetById_NonExistentId_Returns404()
        {
            AuthenticateAs("Contributor");
            var response = await GetAsync($"/api/Recording/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public class UploadRecordInfoTests : RecordingControllerTests
    {
        public UploadRecordInfoTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UploadRecordInfo_ValidPayloadAsContributor_Returns200()
        {
            AuthenticateAs("Contributor");
            var id = await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Pending);

            var payload = new RecordingDto
            {
                Title = "Updated Title",
                Description = "Updated Desc"
            };

            var response = await PutAsync($"/api/Recording/{id}/upload", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            
            var updated = await DbContext.Recordings.FirstAsync(r => r.Id == id);
            updated.Title.Should().Be("Updated Title");
            updated.Description.Should().Be("Updated Desc");
        }

        [Fact]
        public async Task UploadRecordInfo_MissingTitle_Returns400()
        {
            AuthenticateAs("Contributor");
            var id = await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Pending);

            var payload = new RecordingDto
            {
                Title = null,
                Description = "Desc"
            };

            var response = await PutAsync($"/api/Recording/{id}/upload", payload);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public class SearchByTitleTests : RecordingControllerTests
    {
        public SearchByTitleTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SearchByTitle_QueryMatches_Returns200()
        {
            AuthenticateAs("Researcher");
            await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Pending, "Đàn Tranh Vietnamese");

            var response = await GetAsync("/api/Recording/search-by-title?title=Tranh");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Đàn Tranh Vietnamese");
        }
    }

    public class GuestGetAllTests : RecordingControllerTests
    {
        public GuestGetAllTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GuestGetAll_AnonymousRequest_ReturnsOnlyApproved()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Approved, "Approved Rec");
            await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Pending, "Pending Rec");

            var response = await GetAsync("/api/RecordingGuest");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Approved Rec");
            content.Should().NotContain("Pending Rec");
        }
    }

    public class GuestGetByIdTests : RecordingControllerTests
    {
        public GuestGetByIdTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GuestGetById_ApprovedRecording_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var id = await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Approved, "Approved");

            var response = await GetAsync($"/api/RecordingGuest/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GuestGetById_PendingRecording_Returns404()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var id = await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Pending, "Pending");

            var response = await GetAsync($"/api/RecordingGuest/{id}");

            // Guest should not see pending records
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public class ApprovalVisibilityTests : RecordingControllerTests
    {
        public ApprovalVisibilityTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task Recording_Visibility_ObeysApprovalRules()
        {
            var id = await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Pending);

            // 1. Admin can see it
            AuthenticateAs("Admin");
            var adminResp = await GetAsync($"/api/Recording/{id}");
            adminResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // 2. Guest cannot see it
            Client.DefaultRequestHeaders.Authorization = null;
            var guestResp = await GetAsync($"/api/RecordingGuest/{id}");
            guestResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public class EmbeddingSideEffectTests : RecordingControllerTests
    {
        public EmbeddingSideEffectTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UploadRecordInfo_TriggersEmbeddingService()
        {
            AuthenticateAs("Expert");
            var id = await SeedRecording(RecordingStatus.Draft, ApprovalStatus.Pending);

            var payload = new RecordingDto { Title = "Valid Title" };
            var response = await PutAsync($"/api/Recording/{id}/upload", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify spy
            var embeddingMock = Scope.ServiceProvider.GetRequiredService<Mock<IEmbeddingService>>();
            embeddingMock.Verify(x => x.GetEmbeddingAsync(It.IsAny<string>()), Times.AtLeastOnce);
        }
    }
}
