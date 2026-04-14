using AutoMapper;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;
using Microsoft.Extensions.Logging;

namespace VietTuneArchive.Application.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;
        private readonly INotificationService _notificationService;
        private readonly ILogger<UserService> _logger;

        public UserService(IUserRepository userRepository, IMapper mapper, INotificationService notificationService, ILogger<UserService> logger)
        {
            _userRepository = userRepository;
            _mapper = mapper;
            _notificationService = notificationService;
            _logger = logger;
        }
        public async Task<Result<IEnumerable<UserDTO>>> GetAllAsync()
        {
            var users = await _userRepository.GetAllAsync();
            var dtos = _mapper.Map<IEnumerable<UserDTO>>(users);
            return Result<IEnumerable<UserDTO>>.Success(dtos);
        }

        public async Task<Result<UserDTO>> GetByIdAsync(Guid id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
            {
                return Result<UserDTO>.Failure("Người dùng không tồn tại! Kiểm tra lại Id.");
            }
            var dto = _mapper.Map<UserDTO>(user);
            return Result<UserDTO>.Success(dto);
        }

        public async Task<Result<CreateExpertUserDTO>> AddAsync(CreateExpertUserDTO expertUserDTO)
        {
            var getByEmail = await _userRepository.GetByEmailAsync(expertUserDTO.Email);
            if (getByEmail != null)
            {
                return Result<CreateExpertUserDTO>.Failure("Email đã được sử dụng.");
            }
            var dto = _mapper.Map<User>(expertUserDTO);
            var passwordHash = HashPassword(expertUserDTO.Password);
            var user = new User
            {
                Email = dto.Email,
                Password = dto.Password,
                PasswordHash = passwordHash,
                FullName = dto.FullName,
                Role = "Staff",
                ConfirmEmailToken = null,
                IsEmailConfirmed = true,
                ResetPasswordToken = null,
                ResetPasswordTokenExpiry = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true,
                ContributionScore = 0
            };
            await _userRepository.AddAsync(user);
            return Result<CreateExpertUserDTO>.Success(expertUserDTO, "Tạo tài khoản Expert thành công.");
        }

        public async Task<Result<UpdateUserDTO>> UpdateAsync(UpdateUserDTO updateUserDTO)
        {
            var getUser = await _userRepository.GetByIdAsync(updateUserDTO.UserId);
            if (getUser == null)
            {
                return Result<UpdateUserDTO>.Failure("Người dùng không tồn tại! Kiểm tra lại Id.");
            }
            var passwordHash = HashPassword(updateUserDTO.Password);
            getUser.Email = updateUserDTO.Email;
            getUser.Password = updateUserDTO.Password;
            getUser.PasswordHash = passwordHash;
            getUser.FullName = updateUserDTO.FullName;
            await _userRepository.UpdateAsync(getUser);
            return Result<UpdateUserDTO>.Success(updateUserDTO, "Cập nhật thông tin người dùng thành công.");
        }
        public async Task<Result<UpdateNameDTO>> UpdateNameAsync(UpdateNameDTO updateUserDTO)
        {
            var getUser = await _userRepository.GetByIdAsync(updateUserDTO.UserId);
            if (getUser == null)
            {
                return Result<UpdateNameDTO>.Failure("Người dùng không tồn tại! Kiểm tra lại Id.");
            }
            if (!getUser.Role.Equals("Contributor"))
            {
                return Result<UpdateNameDTO>.Failure("Chỉ có thể cập nhật tên cho người đóng góp.");
            }
            getUser.FullName = updateUserDTO.FullName;
            await _userRepository.UpdateAsync(getUser);
            return Result<UpdateNameDTO>.Success(updateUserDTO, "Cập nhật tên thành công.");
        }
        public async Task<Result<UpdatePasswordDTO>> UpdatePasswordAsync(UpdatePasswordDTO updateUserDTO)
        {
            var getUser = await _userRepository.GetByIdAsync(updateUserDTO.UserId);
            if (getUser == null)
            {
                return Result<UpdatePasswordDTO>.Failure("Người dùng không tồn tại! Kiểm tra lại Id.");
            }
            if (!getUser.Password.Equals(updateUserDTO.oldPassword))
            {
                return Result<UpdatePasswordDTO>.Failure("Mật khẩu cũ không đúng. Vui lòng thử lại.");
            }
            var passwordHash = HashPassword(updateUserDTO.newPassword);
            getUser.Password = updateUserDTO.newPassword;
            getUser.PasswordHash = passwordHash;
            await _userRepository.UpdateAsync(getUser);
            return Result<UpdatePasswordDTO>.Success(updateUserDTO, "Cập nhật mật khẩu thành công.");
        }
        public async Task<Result<UpdateUserActiveStatusDTO>> UpdateUserActiveStatusAsync(UpdateUserActiveStatusDTO updateUserActiveStatusDTO)
        {
            var getUser = await _userRepository.GetByIdAsync(updateUserActiveStatusDTO.UserId);
            if (getUser == null)
            {
                return Result<UpdateUserActiveStatusDTO>.Failure("Người dùng không tồn tại! Kiểm tra lại Id.");
            }
            getUser.IsActive = updateUserActiveStatusDTO.IsActive;
            getUser.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(getUser);
            var statusText = updateUserActiveStatusDTO.IsActive ? "kích hoạt" : "vô hiệu hóa";

            // Gửi thông báo cho user khi tài khoản bị vô hiệu hóa hoặc kích hoạt lại
            try
            {
                var notifType = updateUserActiveStatusDTO.IsActive ? "AccountActivated" : "AccountDeactivated";
                var notifTitle = updateUserActiveStatusDTO.IsActive ? "Tài khoản đã được kích hoạt" : "Tài khoản đã bị vô hiệu hóa";
                var notifMessage = updateUserActiveStatusDTO.IsActive
                    ? "Tài khoản của bạn đã được kích hoạt lại. Bạn có thể tiếp tục sử dụng hệ thống."
                    : "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.";

                await _notificationService.SendNotificationAsync(
                    updateUserActiveStatusDTO.UserId,
                    notifTitle,
                    notifMessage,
                    notifType,
                    "User",
                    updateUserActiveStatusDTO.UserId
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send status change notification for user {UserId}", updateUserActiveStatusDTO.UserId);
            }

            return Result<UpdateUserActiveStatusDTO>.Success(updateUserActiveStatusDTO, $"Cập nhật trạng thái người dùng thành công. Tài khoản đã được {statusText}.");
        }

        public async Task<Result<bool>> UpdateRoleAsync(Guid userId, string newRole)
        {
            var validRoles = new[] { "Contributor", "Researcher", "Expert", "Staff", "Admin" };
            if (!validRoles.Contains(newRole, StringComparer.OrdinalIgnoreCase))
                return Result<bool>.Failure($"Role không hợp lệ. Chọn: {string.Join(", ", validRoles)}");

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                return Result<bool>.Failure("Người dùng không tồn tại.");

            var oldRole = user.Role;
            user.Role = newRole;
            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            // Gửi thông báo đổi role
            try
            {
                await _notificationService.SendNotificationAsync(
                    userId,
                    "Vai trò tài khoản đã thay đổi",
                    $"Vai trò của bạn đã được thay đổi từ '{oldRole}' sang '{newRole}'.",
                    "RoleChanged",
                    "User",
                    userId
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send role change notification for user {UserId}", userId);
            }

            return Result<bool>.Success(true, $"Đã cập nhật role từ '{oldRole}' sang '{newRole}'.");
        }

        public async Task DeleteAsync(Guid id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user != null)
            {
                await _userRepository.DeleteAsync(id);
            }
        }
        private string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }
    }
}
