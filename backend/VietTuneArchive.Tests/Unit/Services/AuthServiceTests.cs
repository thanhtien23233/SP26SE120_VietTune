using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using VietTuneArchive.Application.Common.Email;
using VietTuneArchive.Application.Services;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;
using Xunit;
using BCrypt.Net;

namespace VietTuneArchive.Tests.Unit.Services;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly EmailService _emailService;
    private readonly AuthService _sut;
    private readonly Mock<HttpMessageHandler> _httpMessageHandlerMock;

    public AuthServiceTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _configurationMock = new Mock<IConfiguration>();

        // Mock IConfiguration
        _configurationMock.Setup(c => c["Jwt:Key"]).Returns("ThisIsAVerySecretKeyForJwtAuthenticationThatIsLongEnough");

        // Mock EmailService (concrete class requires IOptions and HttpClient)
        var gmailOptions = Options.Create(new GmailApiSettings
        {
            ClientId = "test_client",
            ClientSecret = "test_secret",
            RefreshToken = "test_refresh",
            SenderEmail = "test@example.com"
        });

        _httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        _httpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"access_token\": \"fake_token\"}")
            });

        var httpClient = new HttpClient(_httpMessageHandlerMock.Object);
        _emailService = new EmailService(gmailOptions, httpClient);

        _sut = new AuthService(_userRepositoryMock.Object, _emailService, _configurationMock.Object);
    }

    #region Register

    [Fact]
    public async Task Register_WithValidInput_CreatesUserAndHashesPassword()
    {
        // Arrange
        var user = new User { Email = "test@example.com", FullName = "Test User" };
        var password = "password123";

        _userRepositoryMock.Setup(x => x.GetByEmailAsync(user.Email)).ReturnsAsync((User?)null);
        
        var transactionMock = new Mock<IDbContextTransaction>();
        _userRepositoryMock.Setup(x => x.BeginTransactionAsync()).ReturnsAsync(transactionMock.Object);

        // Act
        var result = await _sut.Register(user, password);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Message.Should().Contain("thành công");

        _userRepositoryMock.Verify(x => x.AddAsync(It.Is<User>(u => 
            u.Email == user.Email &&
            u.PasswordHash != password && // Password must be hashed
            !string.IsNullOrEmpty(u.PasswordHash) &&
            u.ConfirmEmailToken != null &&
            !u.IsEmailConfirmed &&
            u.Role == "Researcher"
        )), Times.Once);

        transactionMock.Verify(x => x.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ReturnsErrorResult()
    {
        // Arrange
        var user = new User { Email = "duplicate@example.com" };
        var password = "password123";

        _userRepositoryMock.Setup(x => x.GetByEmailAsync(user.Email)).ReturnsAsync(new User { Id = Guid.NewGuid() });

        // Act
        var result = await _sut.Register(user, password);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Be("Email đã được sử dụng.");
        _userRepositoryMock.Verify(x => x.AddAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task Register_WithMissingUser_ReturnsSuccessWithErrorMessage()
    {
        // Note: The current implementation of AuthService returns Success for missing user/password.
        // We test the actual implementation.
        
        // Arrange
        User? user = null;
        var password = "password123";

        // Act
        var result = await _sut.Register(user, password);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Message.Should().Be("Người dùng không được để trống.");
    }

    [Fact]
    public async Task Register_WithMissingPassword_ReturnsSuccessWithErrorMessage()
    {
        // Arrange
        var user = new User { Email = "test@example.com" };
        string password = "";

        // Act
        var result = await _sut.Register(user, password);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Message.Should().Be("Mật khẩu không được để trống.");
    }

    #endregion

    #region Authenticate & GenerateJwtToken (Login Flow)

    [Fact]
    public async Task Authenticate_WithCorrectCredentials_ReturnsUser()
    {
        // Arrange
        var password = "password123";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        var email = "test@example.com";
        var user = new User 
        { 
            Id = Guid.NewGuid(),
            Email = email, 
            PasswordHash = passwordHash,
            IsEmailConfirmed = true
        };

        _userRepositoryMock.Setup(x => x.GetByEmailAsync(email)).ReturnsAsync(user);

        // Act
        var result = await _sut.Authenticate(email, password);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(user.Id);
    }

    [Fact]
    public async Task Authenticate_WithWrongPassword_ReturnsNull()
    {
        // Arrange
        var correctPassword = "password123";
        var wrongPassword = "wrongPassword";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(correctPassword);
        var email = "test@example.com";
        var user = new User 
        { 
            Email = email, 
            PasswordHash = passwordHash,
            IsEmailConfirmed = true
        };

        _userRepositoryMock.Setup(x => x.GetByEmailAsync(email)).ReturnsAsync(user);

        // Act
        var result = await _sut.Authenticate(email, wrongPassword);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Authenticate_WithEmailNotFound_ReturnsNull()
    {
        // Arrange
        var email = "notfound@example.com";
        _userRepositoryMock.Setup(x => x.GetByEmailAsync(email)).ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Authenticate(email, "anypassword");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Authenticate_WithUnconfirmedEmail_ThrowsException()
    {
        // Arrange
        var password = "password123";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        var email = "test@example.com";
        var user = new User 
        { 
            Email = email, 
            PasswordHash = passwordHash,
            IsEmailConfirmed = false
        };

        _userRepositoryMock.Setup(x => x.GetByEmailAsync(email)).ReturnsAsync(user);

        // Act
        var action = async () => await _sut.Authenticate(email, password);

        // Assert
        await action.Should().ThrowAsync<Exception>().WithMessage("Vui lòng xác nhận email trước khi đăng nhập.");
    }

    [Fact]
    public void GenerateJwtToken_ReturnsValidTokenWithCorrectClaims()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Test User",
            Role = "Researcher"
        };

        // Act
        var token = _sut.GenerateJwtToken(user);

        // Assert
        token.Should().NotBeNullOrEmpty();

        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtToken = tokenHandler.ReadJwtToken(token);

        jwtToken.Claims.Should().Contain(c => c.Type == "nameid" && c.Value == user.Id.ToString());
        jwtToken.Claims.Should().Contain(c => c.Type == "id" && c.Value == user.Id.ToString());
        jwtToken.Claims.Should().Contain(c => c.Type == "unique_name" && c.Value == user.FullName);
        jwtToken.Claims.Should().Contain(c => c.Type == "role" && c.Value == user.Role);
    }

    [Fact]
    public void GenerateJwtToken_WithEmptyRole_ThrowsArgumentException()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Role = ""
        };

        // Act
        Action action = () => _sut.GenerateJwtToken(user);

        // Assert
        action.Should().Throw<ArgumentException>().WithMessage("User role is required");
    }

    #endregion
    
    // Note: RefreshToken method does not exist in IAuthService/AuthService,
    // so the RefreshToken tests specified in the prompt are skipped.
}
