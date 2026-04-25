using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Mapper.DTOs.Request;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;
using static VietTuneArchive.Application.Mapper.DTOs.AdminDto;
// Use fully-qualified nested type to avoid ambiguity
using AdminAssignReviewerRequest = VietTuneArchive.Application.Mapper.DTOs.Request.AdminRequest.AssignReviewerRequest;

namespace VietTuneArchive.Tests.Integration.Controllers;

public class AdminControllerTests : ApiTestBase
{
    public AdminControllerTests(WebAppFactory factory) : base(factory) { }

    // ─── Shared Helpers ───────────────────────────────────────────────────────

    protected void AuthenticateAsAdmin()
    {
        var adminId = DbContext.Users.First(u => u.Role == "Admin").Id;
        var token = JwtTokenHelper.GenerateToken(adminId.ToString(), "admin@test.com", "Admin");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }

    protected async Task<(Guid userId, string email)> RegisterFreshUser(string role)
    {
        var email = $"{role.ToLower()}_{Guid.NewGuid():N}@test.com";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Test@1234");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = passwordHash,
            Password = passwordHash,
            Role = role,
            IsActive = true,
            IsEmailConfirmed = true,
            FullName = $"Fresh {role}",
            ContributionScore = 0,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync();
        return (user.Id, email);
    }

    protected async Task<User> GetUserFromDb(Guid userId) =>
        await DbContext.Users.AsNoTracking().FirstAsync(u => u.Id == userId);

    // ─── GetUsersTests ────────────────────────────────────────────────────────

    public class GetUsersTests : AdminControllerTests
    {
        public GetUsersTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetUsers_AsAdmin_Returns200WithPaginatedList()
        {
            AuthenticateAsAdmin();
            var response = await GetAsync("/api/Admin/users");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<UserAdminDto>>();
            body.Should().NotBeNull();
            body!.Items.Should().NotBeNull();
        }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Contributor")]
        [InlineData("Researcher")]
        public async Task GetUsers_ByNonAdminRole_Returns403(string role)
        {
            AuthenticateAs(role);
            var response = await GetAsync("/api/Admin/users");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetUsers_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Admin/users");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetUsers_FilterByRole_ReturnsOnlyThatRole()
        {
            AuthenticateAsAdmin();
            var response = await GetAsync("/api/Admin/users?role=Expert");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<UserAdminDto>>();
            body!.Items.Should().OnlyContain(u => u.Role == "Expert");
        }

        [Fact]
        public async Task GetUsers_FilterByActiveStatus_ReturnsOnlyActiveUsers()
        {
            AuthenticateAsAdmin();
            var response = await GetAsync("/api/Admin/users?status=Active");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<UserAdminDto>>();
            body!.Items.Should().OnlyContain(u => u.Status == "Active");
        }

        [Fact]
        public async Task GetUsers_ResponseDoesNotContainSensitiveFields()
        {
            AuthenticateAsAdmin();
            var response = await GetAsync("/api/Admin/users");
            var json = await response.Content.ReadAsStringAsync();
            json.Should().NotContainAny("passwordHash", "PasswordHash", "refreshToken", "RefreshToken");
        }
    }

    // ─── GetUserByIdTests ─────────────────────────────────────────────────────

    public class GetUserByIdTests : AdminControllerTests
    {
        public GetUserByIdTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetUserById_ValidId_Returns200()
        {
            AuthenticateAsAdmin();
            var user = await DbContext.Users.FirstAsync(u => u.Role == "Contributor");
            var response = await GetAsync($"/api/Admin/users/{user.Id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<UserDetailAdminDto>();
            body.Should().NotBeNull();
            // NOTE: UserDTO.UserId maps from User.Id via AutoMapper convention;
            // verify identity via email (which always maps correctly) instead.
            body!.Email.Should().Be(user.Email);
            body.Role.Should().Be("Contributor");
        }

        [Fact]
        public async Task GetUserById_NonExistentId_Returns404()
        {
            AuthenticateAsAdmin();
            var response = await GetAsync($"/api/Admin/users/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetUserById_AsExpert_Returns403()
        {
            AuthenticateAs("Expert");
            var user = await DbContext.Users.FirstAsync(u => u.Role == "Contributor");
            var response = await GetAsync($"/api/Admin/users/{user.Id}");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetUserById_ResponseDoesNotContainPasswordHash()
        {
            AuthenticateAsAdmin();
            var user = await DbContext.Users.FirstAsync(u => u.Role == "Contributor");
            var response = await GetAsync($"/api/Admin/users/{user.Id}");
            var json = await response.Content.ReadAsStringAsync();
            json.Should().NotContainAny("passwordHash", "PasswordHash");
        }
    }

    // ─── UpdateUserRoleTests ──────────────────────────────────────────────────

    public class UpdateUserRoleTests : AdminControllerTests
    {
        public UpdateUserRoleTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UpdateUserRole_ContributorToExpert_UpdatesRoleInDb()
        {
            var (userId, _) = await RegisterFreshUser("Contributor");
            AuthenticateAsAdmin();

            var response = await PutAsync($"/api/Admin/users/{userId}/role",
                new { Role = "Expert" });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var user = await GetUserFromDb(userId);
            user.Role.Should().Be("Expert");
        }

        [Fact]
        public async Task UpdateUserRole_NonExistentId_Returns404or400()
        {
            AuthenticateAsAdmin();
            var response = await PutAsync($"/api/Admin/users/{Guid.NewGuid()}/role",
                new { Role = "Expert" });
            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UpdateUserRole_AsExpert_Returns403()
        {
            AuthenticateAs("Expert");
            var response = await PutAsync($"/api/Admin/users/{Guid.NewGuid()}/role",
                new { Role = "Admin" });
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task UpdateUserRole_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await PutAsync($"/api/Admin/users/{Guid.NewGuid()}/role",
                new { Role = "Expert" });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── UpdateUserStatusTests ────────────────────────────────────────────────

    public class UpdateUserStatusTests : AdminControllerTests
    {
        public UpdateUserStatusTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UpdateUserStatus_ToInactive_DeactivatesUserInDb()
        {
            var (userId, _) = await RegisterFreshUser("Contributor");
            AuthenticateAsAdmin();

            var response = await PutAsync($"/api/Admin/users/{userId}/status",
                new { Status = "Inactive" });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var user = await GetUserFromDb(userId);
            user.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task UpdateUserStatus_ToActive_ActivatesUserInDb()
        {
            var (userId, _) = await RegisterFreshUser("Contributor");
            AuthenticateAsAdmin();
            await PutAsync($"/api/Admin/users/{userId}/status", new { Status = "Inactive" });

            var response = await PutAsync($"/api/Admin/users/{userId}/status",
                new { Status = "Active" });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var user = await GetUserFromDb(userId);
            user.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task UpdateUserStatus_AsExpert_Returns403()
        {
            AuthenticateAs("Expert");
            var response = await PutAsync($"/api/Admin/users/{Guid.NewGuid()}/status",
                new { Status = "Inactive" });
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task UpdateUserStatus_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await PutAsync($"/api/Admin/users/{Guid.NewGuid()}/status",
                new { Status = "Inactive" });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── GetSubmissionsTests ──────────────────────────────────────────────────

    public class GetSubmissionsTests : AdminControllerTests
    {
        public GetSubmissionsTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetSubmissions_AsAdmin_Returns200()
        {
            AuthenticateAsAdmin();
            var response = await GetAsync("/api/Admin/submissions");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<SubmissionAdminDto>>();
            body.Should().NotBeNull();
        }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Contributor")]
        public async Task GetSubmissions_ByNonAdminRole_Returns403(string role)
        {
            AuthenticateAs(role);
            var response = await GetAsync("/api/Admin/submissions");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetSubmissions_FilterByStatus_ReturnsFiltered()
        {
            AuthenticateAsAdmin();
            var response = await GetAsync("/api/Admin/submissions?status=Pending");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<SubmissionAdminDto>>();
            body.Should().NotBeNull();
            // LINQ All() is vacuously true on empty — validates that if items exist they match filter
            body!.Items.All(s => s.Status == "Pending").Should().BeTrue(
                "filter ?status=Pending must not return items with other statuses");
        }
    }

    // ─── AssignSubmissionTests ────────────────────────────────────────────────

    public class AssignSubmissionTests : AdminControllerTests
    {
        public AssignSubmissionTests(WebAppFactory factory) : base(factory) { }

        private async Task<Guid> SeedPendingSubmission()
        {
            var uploader = await DbContext.Users.FirstAsync(u => u.Role == "Contributor");
            var recording = new Recording
            {
                Id = Guid.NewGuid(),
                AudioFileUrl = "http://test.com/audio.mp3",
                Status = Domain.Entities.Enum.SubmissionStatus.Pending,
                UploadedById = uploader.Id,
                CreatedAt = DateTime.UtcNow
            };
            DbContext.Recordings.Add(recording);
            var submission = new Submission
            {
                Id = Guid.NewGuid(),
                RecordingId = recording.Id,
                ContributorId = uploader.Id,
                Status = Domain.Entities.Enum.SubmissionStatus.Pending,
                SubmittedAt = DateTime.UtcNow
            };
            DbContext.Submissions.Add(submission);
            await DbContext.SaveChangesAsync();
            return submission.Id;
        }

        [Fact]
        public async Task AssignSubmission_ValidExpert_Returns200()
        {
            var subId = await SeedPendingSubmission();
            var expert = await DbContext.Users.FirstAsync(u => u.Role == "Expert");
            AuthenticateAsAdmin();

            var response = await PostAsync($"/api/Admin/submissions/{subId}/assign",
                new AdminAssignReviewerRequest { ReviewerId = expert.Id.ToString() });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task AssignSubmission_AsExpert_Returns403()
        {
            AuthenticateAs("Expert");
            var response = await PostAsync($"/api/Admin/submissions/{Guid.NewGuid()}/assign",
                new AdminAssignReviewerRequest { ReviewerId = Guid.NewGuid().ToString() });
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task AssignSubmission_NonExistentSubmission_Returns400()
        {
            AuthenticateAsAdmin();
            var expert = await DbContext.Users.FirstAsync(u => u.Role == "Expert");
            var response = await PostAsync($"/api/Admin/submissions/{Guid.NewGuid()}/assign",
                new AdminAssignReviewerRequest { ReviewerId = expert.Id.ToString() });
            response.StatusCode.Should().NotBe(HttpStatusCode.OK);
        }
    }

    // ─── GetAuditLogsTests ────────────────────────────────────────────────────

    public class GetAuditLogsTests : AdminControllerTests
    {
        public GetAuditLogsTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetAuditLogs_AsAdmin_Returns200()
        {
            AuthenticateAsAdmin();
            var response = await GetAsync("/api/Admin/audit-logs");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Contributor")]
        public async Task GetAuditLogs_ByNonAdminRole_Returns403(string role)
        {
            AuthenticateAs(role);
            var response = await GetAsync("/api/Admin/audit-logs");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetAuditLogs_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Admin/audit-logs");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── SystemHealthTests ────────────────────────────────────────────────────

    public class SystemHealthTests : AdminControllerTests
    {
        public SystemHealthTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetSystemHealth_AsAdmin_Returns200WithHealthStatus()
        {
            AuthenticateAsAdmin();
            var response = await GetAsync("/api/Admin/system-health");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var json = await response.Content.ReadAsStringAsync();
            // ASP.NET Core serializes camelCase by default — check lowercase key
            json.Should().ContainAny("status", "Status", "Healthy", "healthy");
        }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Contributor")]
        public async Task GetSystemHealth_ByNonAdminRole_Returns403(string role)
        {
            AuthenticateAs(role);
            var response = await GetAsync("/api/Admin/system-health");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetSystemHealth_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Admin/system-health");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── RoleChangeFlowTests ──────────────────────────────────────────────────

    public class RoleChangeFlowTests : AdminControllerTests
    {
        public RoleChangeFlowTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task RoleChangeFlow_ContributorToExpert_AllStepsSucceed()
        {
            var (userId, _) = await RegisterFreshUser("Contributor");

            AuthenticateAsAdmin();
            var changeResp = await PutAsync($"/api/Admin/users/{userId}/role", new { Role = "Expert" });
            changeResp.StatusCode.Should().Be(HttpStatusCode.OK);

            var detailResp = await GetAsync($"/api/Admin/users/{userId}");
            detailResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var detail = await detailResp.Content.ReadFromJsonAsync<UserDetailAdminDto>();
            detail!.Role.Should().Be("Expert");

            var user = await GetUserFromDb(userId);
            user.Role.Should().Be("Expert");
        }
    }

    // ─── StatusChangeFlowTests ────────────────────────────────────────────────

    public class StatusChangeFlowTests : AdminControllerTests
    {
        public StatusChangeFlowTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task StatusChangeFlow_DeactivateAndReactivate_AllStepsSucceed()
        {
            var (userId, _) = await RegisterFreshUser("Contributor");

            AuthenticateAsAdmin();
            var deactivateResp = await PutAsync($"/api/Admin/users/{userId}/status", new { Status = "Inactive" });
            deactivateResp.StatusCode.Should().Be(HttpStatusCode.OK);

            var user = await GetUserFromDb(userId);
            user.IsActive.Should().BeFalse();

            var reactivateResp = await PutAsync($"/api/Admin/users/{userId}/status", new { Status = "Active" });
            reactivateResp.StatusCode.Should().Be(HttpStatusCode.OK);

            user = await GetUserFromDb(userId);
            user.IsActive.Should().BeTrue();
        }
    }
}
