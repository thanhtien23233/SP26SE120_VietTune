namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class AuthRequest
    {
        public class RegisterRequest
        {
            public string Email { get; set; } = default!;
            public string Password { get; set; } = default!;
            public string FullName { get; set; } = default!;
        }

        public class LoginRequest
        {
            public string Email { get; set; } = default!;
            public string Password { get; set; } = default!;
        }

        public class RefreshTokenRequest
        {
            public string RefreshToken { get; set; } = default!;
        }

        public class ForgotPasswordRequest
        {
            public string Email { get; set; } = default!;
        }

        public class ResetPasswordRequest
        {
            public string Email { get; set; } = default!;
            public string Token { get; set; } = default!;
            public string NewPassword { get; set; } = default!;
        }
    }
}
