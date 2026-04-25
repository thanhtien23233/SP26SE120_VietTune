using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using VietTuneArchive.Application.Common.Email;
using VietTuneArchive.Domain.Entities.Model;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;

namespace VietTuneArchive.Tests.Integration.Controllers;

public class AuthControllerTests : ApiTestBase
{
    public AuthControllerTests(WebAppFactory factory) : base(factory)
    {
    }

    public class RegisterContributorTests : AuthControllerTests
    {
        public RegisterContributorTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task RegisterContributor_ValidPayload_Returns200()
        {
            var uniqueEmail = $"contrib-{Guid.NewGuid()}@mail.com";
            var payload = new RegisterModel
            {
                Email = uniqueEmail,
                Password = "Password123!",
                FullName = "New Contrib",
                PhoneNumber = "0123456789"
            };

            var response = await PostAsync("/api/Auth/register-contributor", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            
            var userInDb = await DbContext.Users.FirstOrDefaultAsync(u => u.Email == uniqueEmail);
            userInDb.Should().NotBeNull();
            userInDb!.Role.Should().Be("Contributor");
            userInDb.PasswordHash.Should().NotBeNullOrEmpty();
            userInDb.PasswordHash.Should().NotBe(payload.Password);
        }

        [Fact]
        public async Task RegisterContributor_DuplicateEmail_Returns400()
        {
            var payload = new RegisterModel
            {
                Email = "contrib@test.com", // Seeded in DatabaseFixture
                Password = "Password123!",
                FullName = "Duplicate",
                PhoneNumber = "0123456789"
            };

            var response = await PostAsync("/api/Auth/register-contributor", payload);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public class RegisterResearcherTests : AuthControllerTests
    {
        public RegisterResearcherTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task RegisterResearcher_ValidPayload_Returns200()
        {
            var uniqueEmail = $"researcher-{Guid.NewGuid()}@mail.com";
            var payload = new RegisterModel
            {
                Email = uniqueEmail,
                Password = "Password123!",
                FullName = "New Researcher",
                PhoneNumber = "0123456789"
            };

            var response = await PostAsync("/api/Auth/register-researcher", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            
            var userInDb = await DbContext.Users.FirstOrDefaultAsync(u => u.Email == uniqueEmail);
            userInDb!.Role.Should().Be("Researcher");
        }
    }

    public class LoginTests : AuthControllerTests
    {
        public LoginTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task Login_ValidCredentials_Returns200AndToken()
        {
            var payload = new LoginModel
            {
                Email = "contrib@test.com", // Seeded user
                Password = "Test@1234"      // Seeded password
            };

            var response = await PostAsync("/api/Auth/login", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<dynamic>();
            string token = result.GetProperty("token").GetString();
            token.Should().NotBeNullOrWhiteSpace();
            
            // Basic token decode check
            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);
            jwt.Claims.Should().Contain(c => c.Type == "role" && c.Value == "Contributor");
        }

        [Fact]
        public async Task Login_WrongPassword_Returns401()
        {
            var payload = new LoginModel
            {
                Email = "contrib@test.com",
                Password = "WrongPassword!"
            };

            var response = await PostAsync("/api/Auth/login", payload);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public class ConfirmEmailTests : AuthControllerTests
    {
        public ConfirmEmailTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task ConfirmEmail_ValidToken_Returns200AndUpdatesUser()
        {
            var token = "123456";
            var email = $"unconfirmed-{Guid.NewGuid()}@test.com";
            
            DbContext.Users.Add(new Domain.Entities.User
            {
                Id = Guid.NewGuid(),
                Email = email,
                ConfirmEmailToken = token,
                IsEmailConfirmed = false,
                Role = "Contributor"
            });
            await DbContext.SaveChangesAsync();

            var response = await GetAsync($"/api/Auth/confirm-email?token={token}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            
            var updatedUser = await DbContext.Users.FirstAsync(u => u.Email == email);
            updatedUser.IsEmailConfirmed.Should().BeTrue();
            updatedUser.IsActive.Should().BeTrue();
            updatedUser.ConfirmEmailToken.Should().BeNull();
        }

        [Fact]
        public async Task ConfirmEmail_InvalidToken_Returns400()
        {
            var response = await GetAsync("/api/Auth/confirm-email?token=invalid_token");
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public class ForgotPasswordTests : AuthControllerTests
    {
        public ForgotPasswordTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task ForgotPassword_RegisteredEmail_Returns200()
        {
            var payload = new { email = "contrib@test.com" };
            var response = await PostAsync("/api/Auth/forgot-password", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            
            var user = await DbContext.Users.FirstAsync(u => u.Email == "contrib@test.com");
            user.ResetPasswordToken.Should().NotBeNull();
        }

        [Fact]
        public async Task ForgotPassword_UnregisteredEmail_Returns200() // Or 400 depending on actual impl
        {
            var payload = new { email = "notfound@test.com" };
            var response = await PostAsync("/api/Auth/forgot-password", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK); // As requested by prompt: same response for security
        }
    }

    public class ResetPasswordTests : AuthControllerTests
    {
        public ResetPasswordTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task ResetPassword_ValidToken_UpdatesPassword()
        {
            var token = "654321";
            var email = $"reset-{Guid.NewGuid()}@test.com";
            
            DbContext.Users.Add(new Domain.Entities.User
            {
                Id = Guid.NewGuid(),
                Email = email,
                ResetPasswordToken = token,
                ResetPasswordTokenExpiry = DateTime.UtcNow.AddMinutes(15),
                IsActive = true,
                Role = "Contributor"
            });
            await DbContext.SaveChangesAsync();

            var payload = new 
            { 
                email = email,
                otp = token,
                newPassword = "NewValidPassword123!"
            };

            var response = await PostAsync("/api/Auth/reset-password", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var updatedUser = await DbContext.Users.FirstAsync(u => u.Email == email);
            updatedUser.ResetPasswordToken.Should().BeNull();
            
            // Should be able to login
            var loginResponse = await PostAsync("/api/Auth/login", new LoginModel { Email = email, Password = "NewValidPassword123!" });
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task ResetPassword_ExpiredToken_Returns400()
        {
            var token = "expired_token";
            var email = $"expired-{Guid.NewGuid()}@test.com";
            
            DbContext.Users.Add(new Domain.Entities.User
            {
                Id = Guid.NewGuid(),
                Email = email,
                ResetPasswordToken = token,
                ResetPasswordTokenExpiry = DateTime.UtcNow.AddMinutes(-5), // Expired
                IsActive = true,
                Role = "Contributor"
            });
            await DbContext.SaveChangesAsync();

            var payload = new 
            { 
                email = email,
                otp = token,
                newPassword = "NewValidPassword123!"
            };

            var response = await PostAsync("/api/Auth/reset-password", payload);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public class TokenSessionTests : AuthControllerTests
    {
        public TokenSessionTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task ProtectedEndpoint_WithValidToken_Returns200()
        {
            AuthenticateAs("Contributor");
            
            // Using a protected endpoint if available, but Auth doesn't have one.
            // A typical protected endpoint might be GET /api/Recording
            var response = await GetAsync("/api/Recording");
            // If it returns 200 or 404 instead of 401, token is valid
            response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task ProtectedEndpoint_WithNoToken_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Recording");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
