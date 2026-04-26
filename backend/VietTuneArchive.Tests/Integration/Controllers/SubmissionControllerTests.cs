using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;

namespace VietTuneArchive.Tests.Integration.Controllers;

public class SubmissionControllerTests : ApiTestBase
{
    public SubmissionControllerTests(WebAppFactory factory) : base(factory)
    {
    }

    protected async Task<Guid> CreateDraftSubmission(string role = "Contributor")
    {
        AuthenticateAs(role);

        var user = await DbContext.Users.FirstAsync(u => u.Role == "Contributor");

        var payload = new SubmissionDto
        {
            AudioFileUrl = "http://test.com/audio.mp3",
            UploadedById = user.Id
        };

        var response = await PostAsync("/api/Submission/create-submission", payload);
        response.EnsureSuccessStatusCode();

        // Controller returns Ok(result) where result is Result<SubmissionResponseDto>
        // JSON shape: { "isSuccess": true, "data": { "submissionId": "...", ... } }
        var result = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        string subIdStr = result.GetProperty("data").GetProperty("submissionId").GetString()!;
        var subId = Guid.Parse(subIdStr);

        // ConfirmSubmit checks recording.Status == Pending before allowing the transition
        // Draft → Pending. The upload pipeline would normally set the recording to Pending
        // after audio is verified. Simulate that here so state-machine tests proceed cleanly.
        var sub = await DbContext.Submissions.FindAsync(subId);
        if (sub?.RecordingId != null)
        {
            var rec = await DbContext.Recordings.FindAsync(sub.RecordingId.Value);
            if (rec != null)
            {
                rec.Status = SubmissionStatus.Pending;
                await DbContext.SaveChangesAsync();
                DbContext.ChangeTracker.Clear();
            }
        }

        return subId;
    }

    protected async Task AdvanceToPending(Guid submissionId)
    {
        AuthenticateAs("Contributor");
        var response = await PutAsync($"/api/Submission/confirm-submit-submission?submissionId={submissionId}", new { });
        response.EnsureSuccessStatusCode();
    }

    protected async Task AdvanceToUnderReview(Guid submissionId)
    {
        await AdvanceToPending(submissionId);
        
        // Setup reviewer
        var expert = await DbContext.Users.FirstAsync(u => u.Role == "Expert");
        
        AuthenticateAs("Admin");
        await PutAsync($"/api/Submission/assign-reviewer-submission?submissionId={submissionId}&reviewerId={expert.Id}", new { });
        
        var sub = await DbContext.Submissions.FirstAsync(s => s.Id == submissionId);
        sub.Status = SubmissionStatus.Pending; // UnderReview not in enum; Pending simulates reviewer-assigned state
        await DbContext.SaveChangesAsync();
        DbContext.ChangeTracker.Clear();
    }

    public class CreateSubmissionTests : SubmissionControllerTests
    {
        public CreateSubmissionTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task CreateSubmission_ValidPayloadContributor_Returns200()
        {
            AuthenticateAs("Contributor");
            var user = await DbContext.Users.FirstAsync(u => u.Role == "Contributor");

            var payload = new SubmissionDto
            {
                AudioFileUrl = "http://test.com/newaudio.mp3",
                UploadedById = user.Id
            };

            var response = await PostAsync("/api/Submission/create-submission", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            // Result<SubmissionResponseDto>: { "isSuccess": true, "data": { "submissionId": "..." } }
            var result = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            string submissionId = result.GetProperty("data").GetProperty("submissionId").GetString()!;
            submissionId.Should().NotBeNullOrEmpty();
            
            DbContext.ChangeTracker.Clear();
            var dbSub = await DbContext.Submissions.FirstOrDefaultAsync(s => s.Id == Guid.Parse(submissionId));
            dbSub.Should().NotBeNull();
            dbSub!.Status.Should().Be(SubmissionStatus.Draft);
        }

        [Fact]
        public async Task CreateSubmission_ByResearcher_Returns403()
        {
            AuthenticateAs("Researcher");
            var payload = new SubmissionDto
            {
                AudioFileUrl = "http://test.com/newaudio.mp3",
                UploadedById = Guid.NewGuid()
            };

            var response = await PostAsync("/api/Submission/create-submission", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    public class ConfirmSubmitTests : SubmissionControllerTests
    {
        public ConfirmSubmitTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task ConfirmSubmit_ValidDraft_Returns200()
        {
            var id = await CreateDraftSubmission("Contributor");

            AuthenticateAs("Contributor");
            var response = await PutAsync($"/api/Submission/confirm-submit-submission?submissionId={id}", new { });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            
            DbContext.ChangeTracker.Clear();
            var sub = await DbContext.Submissions.FirstAsync(s => s.Id == id);
            sub.Status.Should().Be(SubmissionStatus.Pending);
        }

        [Fact]
        public async Task ConfirmSubmit_Unauthenticated_Returns401()
        {
            var id = await CreateDraftSubmission();
            Client.DefaultRequestHeaders.Authorization = null;

            var response = await PutAsync($"/api/Submission/confirm-submit-submission?submissionId={id}", new { });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public class EditRequestTests : SubmissionControllerTests
    {
        public EditRequestTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task EditRequest_ValidUnderReview_Returns200()
        {
            var id = await CreateDraftSubmission();
            await AdvanceToUnderReview(id);

            AuthenticateAs("Expert");
            var response = await PutAsync($"/api/Submission/edit-request-submission?submissionId={id}", new { });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            
            DbContext.ChangeTracker.Clear();
            var sub = await DbContext.Submissions.FirstAsync(s => s.Id == id);
            sub.Status.Should().Be(SubmissionStatus.UpdateRequested);
        }
    }

    public class ConfirmEditTests : SubmissionControllerTests
    {
        public ConfirmEditTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task ConfirmEdit_ValidUpdateRequested_Returns200()
        {
            var id = await CreateDraftSubmission();
            await AdvanceToUnderReview(id);

            // Make it UpdateRequested
            AuthenticateAs("Expert");
            await PutAsync($"/api/Submission/edit-request-submission?submissionId={id}", new { });

            AuthenticateAs("Contributor");
            var response = await PutAsync($"/api/Submission/confirm-edit-submission?submissionId={id}", new { });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            
            DbContext.ChangeTracker.Clear();
            var sub = await DbContext.Submissions.FirstAsync(s => s.Id == id);
            sub.Status.Should().Be(SubmissionStatus.Pending);
        }
    }

    public class ApproveSubmissionTests : SubmissionControllerTests
    {
        public ApproveSubmissionTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task ApproveSubmission_ValidUnderReviewAsExpert_Returns200()
        {
            var id = await CreateDraftSubmission();
            await AdvanceToUnderReview(id);

            AuthenticateAs("Expert");
            var response = await PutAsync($"/api/Submission/approve-submission?submissionId={id}", new { });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            
            DbContext.ChangeTracker.Clear();
            var sub = await DbContext.Submissions.Include(s => s.Recording).FirstAsync(s => s.Id == id);
            sub.Status.Should().Be(SubmissionStatus.Approved);
            // Recording.Status also updated to Approved after submission approved
            sub.Recording?.Status.Should().Be(SubmissionStatus.Approved);
        }
    }

    public class StateMachineFlowTests : SubmissionControllerTests
    {
        public StateMachineFlowTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task FullFlow_DraftToPendingToApproved()
        {
            // 1. Create Draft
            var id = await CreateDraftSubmission("Contributor");

            // 2. Draft -> Pending
            AuthenticateAs("Contributor");
            var confirmResp = await PutAsync($"/api/Submission/confirm-submit-submission?submissionId={id}", new { });
            confirmResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // Assign Reviewer
            AuthenticateAs("Admin");
            var expert = await DbContext.Users.FirstAsync(u => u.Role == "Expert");
            await PutAsync($"/api/Submission/assign-reviewer-submission?submissionId={id}&reviewerId={expert.Id}", new { });

            // Force UnderReview because system logic might require manual check-in or it's automatic. Let's force it for tests
            var sub = await DbContext.Submissions.FirstAsync(s => s.Id == id);
            sub.Status = SubmissionStatus.Pending; // UnderReview not in enum; use Pending to represent review stage
            await DbContext.SaveChangesAsync();

            // 3. UnderReview -> UpdateRequested
            AuthenticateAs("Expert");
            var editReqResp = await PutAsync($"/api/Submission/edit-request-submission?submissionId={id}", new { });
            editReqResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // 4. UpdateRequested -> Pending
            AuthenticateAs("Contributor");
            var confirmEditResp = await PutAsync($"/api/Submission/confirm-edit-submission?submissionId={id}", new { });
            confirmEditResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // Back to UnderReview
            sub = await DbContext.Submissions.FirstAsync(s => s.Id == id);
            sub.Status = SubmissionStatus.Pending; // UnderReview not in enum; use Pending to represent review stage
            await DbContext.SaveChangesAsync();

            // 5. UnderReview -> Approved
            AuthenticateAs("Expert");
            var approveResp = await PutAsync($"/api/Submission/approve-submission?submissionId={id}", new { });
            approveResp.StatusCode.Should().Be(HttpStatusCode.OK);
            
            DbContext.ChangeTracker.Clear();
            var finalSub = await DbContext.Submissions.FirstAsync(s => s.Id == id);
            finalSub.Status.Should().Be(SubmissionStatus.Approved);
        }
    }
}
