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

    protected async Task<Guid> SeedRecording(SubmissionStatus status, string title = "Test Recording")
    {
        var uploader = await DbContext.Users.FirstAsync(u => u.Role == "Contributor");
        var recording = new Recording
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = "A test recording",
            AudioFileUrl = "http://test.com/audio.mp3",
            Status = status,
            UploadedById = uploader.Id,
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
            await SeedRecording(SubmissionStatus.Draft);

            var response = await GetAsync("/api/Recording?page=1&pageSize=5");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().NotBeNullOrEmpty();
        }

        [Fact]
        public async Task GetAll_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Recording");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Contributor")]
        [InlineData("Researcher")]
        public async Task GetAll_AuthenticatedRoles_Returns200(string role)
        {
            AuthenticateAs(role);
            var response = await GetAsync("/api/Recording");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    public class GetByIdTests : RecordingControllerTests
    {
        public GetByIdTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetById_ValidId_Returns200()
        {
            AuthenticateAs("Contributor");
            var id = await SeedRecording(SubmissionStatus.Draft);

            var response = await GetAsync($"/api/Recording/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetById_NonExistentId_Returns404()
        {
            AuthenticateAs("Contributor");
            var response = await GetAsync($"/api/Recording/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetById_Unauthenticated_Returns401()
        {
            var id = await SeedRecording(SubmissionStatus.Draft);
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync($"/api/Recording/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public class UploadRecordInfoTests : RecordingControllerTests
    {
        public UploadRecordInfoTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UploadRecordInfo_ValidPayloadAsContributor_Returns200()
        {
            AuthenticateAs("Contributor");
            var id = await SeedRecording(SubmissionStatus.Draft);

            var payload = new RecordingDto
            {
                Title = "Updated Title",
                Description = "Updated Desc",
                AudioFileUrl = "http://test.com/audio.mp3"
            };

            var response = await PutAsync($"/api/Recording/{id}/upload", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Reload from a fresh context to avoid cached state
            var updated = await DbContext.Recordings.AsNoTracking().FirstAsync(r => r.Id == id);
            updated.Title.Should().Be("Updated Title");
        }

        [Fact]
        public async Task UploadRecordInfo_AsResearcher_Returns403()
        {
            AuthenticateAs("Researcher");
            var id = await SeedRecording(SubmissionStatus.Draft);
            var response = await PutAsync($"/api/Recording/{id}/upload", new RecordingDto { Title = "Hack" });
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task UploadRecordInfo_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var id = Guid.NewGuid();
            var response = await PutAsync($"/api/Recording/{id}/upload", new RecordingDto { Title = "Hack" });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public class SearchByTitleTests : RecordingControllerTests
    {
        public SearchByTitleTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SearchByTitle_QueryMatches_Returns200()
        {
            AuthenticateAs("Researcher");
            await SeedRecording(SubmissionStatus.Draft, "Đàn Tranh Vietnamese");

            var response = await GetAsync("/api/Recording/search-by-title?title=Tranh");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchByTitle_NoMatch_Returns200EmptyResult()
        {
            AuthenticateAs("Researcher");
            var response = await GetAsync("/api/Recording/search-by-title?title=XYZ_NONEXISTENT_TITLE");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    public class GuestGetAllTests : RecordingControllerTests
    {
        public GuestGetAllTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GuestGetAll_AnonymousRequest_Returns200()
        {
            // Seed an approved recording (Status = Approved)
            await SeedRecording(SubmissionStatus.Approved, "Approved Rec For Guest");

            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/RecordingGuest");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    public class GuestGetByIdTests : RecordingControllerTests
    {
        public GuestGetByIdTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GuestGetById_ApprovedRecording_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var id = await SeedRecording(SubmissionStatus.Approved, "Approved For Guest");

            var response = await GetAsync($"/api/RecordingGuest/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GuestGetById_DraftRecording_ReturnsNotFound()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var id = await SeedRecording(SubmissionStatus.Draft, "Draft Should Be Hidden");

            var response = await GetAsync($"/api/RecordingGuest/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public class ApprovalVisibilityTests : RecordingControllerTests
    {
        public ApprovalVisibilityTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task Recording_AdminCanSeeAllStatuses_GuestSeesOnlyApproved()
        {
            var draftId = await SeedRecording(SubmissionStatus.Draft, "Draft Visibility");

            // Admin can see it
            AuthenticateAs("Admin");
            var adminResp = await GetAsync($"/api/Recording/{draftId}");
            adminResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // Guest cannot see Draft
            Client.DefaultRequestHeaders.Authorization = null;
            var guestResp = await GetAsync($"/api/RecordingGuest/{draftId}");
            guestResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public class EmbeddingSideEffectTests : RecordingControllerTests
    {
        public EmbeddingSideEffectTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UploadRecordInfo_ValidPayload_Returns200()
        {
            AuthenticateAs("Expert");
            var id = await SeedRecording(SubmissionStatus.Draft);

            var payload = new RecordingDto { Title = "Valid Update", AudioFileUrl = "http://test.com/audio.mp3" };
            var response = await PutAsync($"/api/Recording/{id}/upload", payload);

            // Core assertion: upload succeeds
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }
}
