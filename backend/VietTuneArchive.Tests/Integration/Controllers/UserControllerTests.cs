using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;

namespace VietTuneArchive.Tests.Integration.Controllers;

public class UserControllerTests : ApiTestBase
{
    public UserControllerTests(WebAppFactory factory) : base(factory) { }

    // ─── Shared Helpers ───────────────────────────────────────────────────────

    protected async Task<(Guid userId, string email, string token)> RegisterAndLogin(string role)
    {
        var email = $"{role.ToLower()}_{Guid.NewGuid():N}@test.com";
        var rawPassword = "Test@1234";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = passwordHash,
            Password = rawPassword,
            Role = role,
            IsActive = true,
            IsEmailConfirmed = true,
            FullName = $"Fresh {role}",
            ContributionScore = 0,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync();

        var token = JwtTokenHelper.GenerateToken(user.Id.ToString(), email, role);
        return (user.Id, email, token);
    }

    protected void SetToken(string token) =>
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

    protected async Task<User> GetUserFromDb(Guid userId) =>
        await DbContext.Users.AsNoTracking().FirstAsync(u => u.Id == userId);

    protected async Task AssertNoSensitiveFields(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        json.Should().NotContainAny("passwordHash", "PasswordHash", "refreshToken", "RefreshToken");
    }

    // ─── GetAllTests ──────────────────────────────────────────────────────────

    public class GetAllTests : UserControllerTests
    {
        public GetAllTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetAll_AsAdmin_Returns200WithUserList()
        {
            AuthenticateAs("Admin");
            var response = await GetAsync("/api/User/GetAll");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var json = await response.Content.ReadAsStringAsync();
            json.Should().NotBeNullOrEmpty();
        }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Contributor")]
        [InlineData("Researcher")]
        public async Task GetAll_ByNonAdminRole_Returns403(string role)
        {
            AuthenticateAs(role);
            var response = await GetAsync("/api/User/GetAll");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetAll_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/User/GetAll");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetAll_ResponseDoesNotContainSensitiveFields()
        {
            AuthenticateAs("Admin");
            var response = await GetAsync("/api/User/GetAll");
            await AssertNoSensitiveFields(response);
        }
    }

    // ─── GetByIdTests ─────────────────────────────────────────────────────────

    public class GetByIdTests : UserControllerTests
    {
        public GetByIdTests(WebAppFactory factory) : base(factory) { }

        [Theory]
        [InlineData("Contributor")]
        [InlineData("Expert")]
        [InlineData("Researcher")]
        [InlineData("Admin")]
        public async Task GetById_AnyRole_Returns200(string role)
        {
            var (userId, _, token) = await RegisterAndLogin(role);
            SetToken(token);

            var response = await GetAsync($"/api/User/GetById?id={userId}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetById_NonExistentId_ReturnsFailureResult()
        {
            // NOTE: UserController.GetById returns Result<T> wrapper (never null),
            // so always HTTP 200. Assert via IsSuccess=false in response body instead.
            AuthenticateAs("Admin");
            var response = await GetAsync($"/api/User/GetById?id={Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var json = await response.Content.ReadAsStringAsync();
            json.Should().ContainAny("false", "không tồn tại", "Failure", "failure");
        }

        [Fact]
        public async Task GetById_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync($"/api/User/GetById?id={Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetById_ResponseDoesNotContainPasswordHash()
        {
            var (userId, _, token) = await RegisterAndLogin("Contributor");
            SetToken(token);
            var response = await GetAsync($"/api/User/GetById?id={userId}");
            await AssertNoSensitiveFields(response);
        }
    }

    // ─── UpdatePasswordTests ──────────────────────────────────────────────────

    public class UpdatePasswordTests : UserControllerTests
    {
        public UpdatePasswordTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UpdatePassword_ValidOldAndNew_Returns200()
        {
            var (userId, _, token) = await RegisterAndLogin("Contributor");
            SetToken(token);

            var payload = new UpdatePasswordDTO
            {
                UserId = userId,
                OldPassword = "Test@1234",
                NewPassword = "NewPass@5678",
                ConfirmPassword = "NewPass@5678"
            };
            var response = await PutAsync("/api/User/update-password", payload);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task UpdatePassword_WrongOldPassword_Returns400()
        {
            var (userId, _, token) = await RegisterAndLogin("Contributor");
            SetToken(token);

            var payload = new UpdatePasswordDTO
            {
                UserId = userId,
                OldPassword = "WrongPassword!",
                NewPassword = "NewPass@5678",
                ConfirmPassword = "NewPass@5678"
            };
            var response = await PutAsync("/api/User/update-password", payload);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UpdatePassword_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await PutAsync("/api/User/update-password", new UpdatePasswordDTO
            {
                UserId = Guid.NewGuid(),
                OldPassword = "old",
                NewPassword = "new",
                ConfirmPassword = "new"
            });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── UpdateProfileTests ───────────────────────────────────────────────────

    public class UpdateProfileTests : UserControllerTests
    {
        public UpdateProfileTests(WebAppFactory factory) : base(factory) { }

        [Theory]
        [InlineData("Contributor")]
        [InlineData("Expert")]
        [InlineData("Researcher")]
        [InlineData("Admin")]
        public async Task UpdateProfile_ValidPayload_Returns200(string role)
        {
            var (userId, _, token) = await RegisterAndLogin(role);
            SetToken(token);

            var payload = new UpdateInfoDTO
            {
                UserId = userId,
                FullName = $"Updated {role} Name",
                AvatarUrl = "https://example.com/avatar.png",
                Phone = "0901234567"
            };
            var response = await PutAsync("/api/User/update-profile", payload);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task UpdateProfile_ValidPayload_UpdatesDbFields()
        {
            var (userId, _, token) = await RegisterAndLogin("Contributor");
            SetToken(token);

            var payload = new UpdateInfoDTO
            {
                UserId = userId,
                FullName = "Updated Full Name",
                AvatarUrl = "https://example.com/avatar.png",
                Phone = "0909999999"
            };
            await PutAsync("/api/User/update-profile", payload);

            var user = await GetUserFromDb(userId);
            user.FullName.Should().Be("Updated Full Name");
        }

        [Fact]
        public async Task UpdateProfile_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await PutAsync("/api/User/update-profile",
                new UpdateInfoDTO { UserId = Guid.NewGuid(), FullName = "X" });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── AdminUpdateTests ─────────────────────────────────────────────────────

    public class AdminUpdateTests : UserControllerTests
    {
        public AdminUpdateTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task AdminUpdate_ValidPayload_Returns200()
        {
            var (targetId, targetEmail, _) = await RegisterAndLogin("Contributor");
            AuthenticateAs("Admin");

            var payload = new UpdateUserDTO
            {
                UserId = targetId,
                Email = targetEmail,
                FullName = "Admin Updated Name",
                Password = "Test@1234"
            };
            var response = await PutAsync("/api/User", payload);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Contributor")]
        public async Task AdminUpdate_ByNonAdmin_Returns403(string role)
        {
            AuthenticateAs(role);
            var response = await PutAsync("/api/User", new UpdateUserDTO
            {
                UserId = Guid.NewGuid(),
                Email = "x@x.com",
                FullName = "X",
                Password = "Test@1234"
            });
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task AdminUpdate_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await PutAsync("/api/User", new UpdateUserDTO
            {
                UserId = Guid.NewGuid(),
                Email = "x@x.com",
                FullName = "X",
                Password = "Test@1234"
            });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── DeleteUserTests ──────────────────────────────────────────────────────

    public class DeleteUserTests : UserControllerTests
    {
        public DeleteUserTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task DeleteUser_AsAdmin_Returns200AndUserDeactivated()
        {
            var (userId, _, _) = await RegisterAndLogin("Contributor");
            AuthenticateAs("Admin");

            var response = await Client.DeleteAsync($"/api/User/{userId}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // NOTE: UserRepository.DeleteAsync is a SOFT DELETE (IsActive = false),
            // not a hard delete. User record still exists in DB.
            // Use AsNoTracking() to bypass EF Core change tracker cache.
            var deactivatedUser = await DbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId);
            deactivatedUser.Should().NotBeNull();
            deactivatedUser!.IsActive.Should().BeFalse("delete sets IsActive=false (soft delete)");
        }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Contributor")]
        public async Task DeleteUser_ByNonAdminRole_Returns403(string role)
        {
            AuthenticateAs(role);
            var response = await Client.DeleteAsync($"/api/User/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task DeleteUser_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await Client.DeleteAsync($"/api/User/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── PasswordUpdateFlowTests ──────────────────────────────────────────────

    public class PasswordUpdateFlowTests : UserControllerTests
    {
        public PasswordUpdateFlowTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UpdatePassword_AfterSuccess_OldPasswordInvalidated_NewPasswordWorks()
        {
            var (userId, email, token) = await RegisterAndLogin("Contributor");
            SetToken(token);

            // Change password
            var changeResp = await PutAsync("/api/User/update-password", new UpdatePasswordDTO
            {
                UserId = userId,
                OldPassword = "Test@1234",
                NewPassword = "NewPass@5678",
                ConfirmPassword = "NewPass@5678"
            });
            changeResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // Try login with old password → should fail
            Client.DefaultRequestHeaders.Authorization = null;
            var oldLoginResp = await PostAsync("/api/Auth/login", new { Email = email, Password = "Test@1234" });
            oldLoginResp.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.Unauthorized);

            // Login with new password → should succeed
            var newLoginResp = await PostAsync("/api/Auth/login", new { Email = email, Password = "NewPass@5678" });
            newLoginResp.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── ProfileUpdateFlowTests ───────────────────────────────────────────────

    public class ProfileUpdateFlowTests : UserControllerTests
    {
        public ProfileUpdateFlowTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task ProfileUpdateFlow_UpdateAndVerify_AllStepsSucceed()
        {
            // 1. Register fresh user
            var (userId, _, token) = await RegisterAndLogin("Contributor");
            SetToken(token);

            // 2. Update profile
            var updateResp = await PutAsync("/api/User/update-profile", new UpdateInfoDTO
            {
                UserId = userId,
                FullName = "E2E Updated Name",
                AvatarUrl = "https://cdn.test.com/avatar.jpg",
                Phone = "0912345678"
            });
            updateResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // 3. Assert DB
            var user = await GetUserFromDb(userId);
            user.FullName.Should().Be("E2E Updated Name");
            user.AvatarUrl.Should().Be("https://cdn.test.com/avatar.jpg");
        }
    }

    // ─── SensitiveDataTests ───────────────────────────────────────────────────

    public class SensitiveDataTests : UserControllerTests
    {
        public SensitiveDataTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetAll_DoesNotExposePasswordHash()
        {
            AuthenticateAs("Admin");
            var response = await GetAsync("/api/User/GetAll");
            await AssertNoSensitiveFields(response);
        }

        [Fact]
        public async Task GetById_DoesNotExposePasswordHash()
        {
            var (userId, _, token) = await RegisterAndLogin("Contributor");
            SetToken(token);
            var response = await GetAsync($"/api/User/GetById?id={userId}");
            await AssertNoSensitiveFields(response);
        }
    }
}
