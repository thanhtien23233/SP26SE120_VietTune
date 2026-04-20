using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Model;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly IAuthService _authService;
        private readonly IUserRepository _userRepository;
        public AuthController(IConfiguration config, IAuthService authService, IUserRepository userRepository)
        {
            _config = config;
            _authService = authService;
            _userRepository = userRepository;
        }
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            try
            {
                var user = await _authService.Authenticate(model.Email, model.Password);

                if (user == null)
                    return Unauthorized(new { message = "Email hoặc mật khẩu không chính xác." });

                var token = _authService.GenerateJwtToken(user);
                return Ok(new
                {
                    Token = token,
                    UserId = user.Id,
                    Role = user.Role,
                    FullName = user.FullName,
                    PhoneNumber = user.Phone,
                    isActive = user.IsActive
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("register-contributor")]
        public async Task<IActionResult> RegisterForContributor([FromBody] RegisterModel model)
        {
            var user = new User
            {
                Email = model.Email,
                Password = model.Password,
                FullName = model.FullName,
                Phone = model.PhoneNumber,
                Role = "Contributor",
                ContributionScore = 0,
                IsActive = false,
                CreatedAt = DateTime.UtcNow
            };
            var result = await _authService.Register(user, model.Password);

            if (result.IsSuccess)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        [HttpPost("register-researcher")]
        public async Task<IActionResult> RegisterForResearcher([FromBody] RegisterModel model)
        {
            var user = new User
            {
                Email = model.Email,
                Password = model.Password,
                FullName = model.FullName,
                Phone = model.PhoneNumber,
                Role = "Researcher",
                ContributionScore = 0,
                IsActive = false,
                CreatedAt = DateTime.UtcNow
            };
            var result = await _authService.Register(user, model.Password);

            if (result.IsSuccess)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }

        [HttpGet("confirm-email")]
        public async Task<IActionResult> ConfirmEmail(string token)
        {
            var user = await _userRepository.GetByConfirmationTokenAsync(token);

            if (user == null)
            {
                return BadRequest("Token không hợp lệ.");
            }

            user.IsEmailConfirmed = true;
            user.ConfirmEmailToken = null;
            user.IsActive = true;

            await _userRepository.UpdateAsync(user);

            return Ok("Email đã được xác nhận thành công.");
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Email))
                return BadRequest("Email không được để trống.");

            await _authService.ForgotPasswordAsync(model.Email);

            return Ok("Mã reset đã được gửi. Kiểm tra hộp thư của bạn.");
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordModel model)
        {
            var success = await _authService.ResetPasswordAsync(model.Email, model.OTP, model.NewPassword);

            if (!success)
                return BadRequest("Mã OTP không hợp lệ hoặc đã hết hạn.");

            return Ok("Mật khẩu đã được reset thành công. Bạn có thể đăng nhập ngay.");
        }


        public class ForgotPasswordModel
        {
            public string Email { get; set; } = string.Empty;
        }

        public class ResetPasswordModel
        {
            public string Email { get; set; } = string.Empty;
            public string OTP { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }
    }
}
