using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Application.IServices
{
    public interface IAuthService
    {
        string GenerateJwtToken(User user);
        Task<User> Authenticate(string email, string password);
        Task<Result<AuthDTO>> Register(User user, string password);
        Task ForgotPasswordAsync(string email);
        Task<bool> ResetPasswordAsync(string email, string otp, string newPassword);
    }
}
