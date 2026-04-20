using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class RefreshTokenService : GenericService<RefreshToken, RefreshTokenDto>, IRefreshTokenService
    {
        private readonly IRefreshTokenRepository _refreshTokenRepository;

        public RefreshTokenService(IRefreshTokenRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _refreshTokenRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get refresh tokens by user
        /// </summary>
        public async Task<ServiceResponse<List<RefreshTokenDto>>> GetByUserAsync(Guid userId)
        {
            try
            {
                if (userId == Guid.Empty)
                    throw new ArgumentException("User id cannot be empty", nameof(userId));

                var tokens = await _refreshTokenRepository.GetAsync(rt => rt.UserId == userId);
                var dtos = _mapper.Map<List<RefreshTokenDto>>(tokens.OrderByDescending(rt => rt.CreatedAt).ToList());
                return new ServiceResponse<List<RefreshTokenDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} tokens"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<RefreshTokenDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get token by value
        /// </summary>
        public async Task<ServiceResponse<RefreshTokenDto>> GetByTokenAsync(string token)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(token))
                    throw new ArgumentException("Token cannot be empty", nameof(token));

                var refreshToken = await _refreshTokenRepository.GetFirstOrDefaultAsync(rt => rt.Token == token);
                if (refreshToken == null)
                    return new ServiceResponse<RefreshTokenDto>
                    {
                        Success = false,
                        Message = "Token not found"
                    };

                var dto = _mapper.Map<RefreshTokenDto>(refreshToken);
                return new ServiceResponse<RefreshTokenDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<RefreshTokenDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Validate refresh token
        /// </summary>
        public async Task<ServiceResponse<bool>> ValidateTokenAsync(string token)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(token))
                    throw new ArgumentException("Token cannot be empty", nameof(token));

                var refreshToken = await _refreshTokenRepository.GetFirstOrDefaultAsync(rt => rt.Token == token);
                if (refreshToken == null)
                    return new ServiceResponse<bool>
                    {
                        Success = false,
                        Data = false,
                        Message = "Token not found"
                    };

                var isValid = refreshToken.ExpiresAt > DateTime.UtcNow;
                return new ServiceResponse<bool>
                {
                    Success = true,
                    Data = isValid,
                    Message = isValid ? "Token is valid" : "Token has expired"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<bool>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get expired tokens
        /// </summary>
        public async Task<ServiceResponse<List<RefreshTokenDto>>> GetExpiredTokensAsync()
        {
            try
            {
                var tokens = await _refreshTokenRepository.GetAsync(rt => rt.ExpiresAt <= DateTime.UtcNow);
                var dtos = _mapper.Map<List<RefreshTokenDto>>(tokens.OrderByDescending(rt => rt.ExpiresAt).ToList());
                return new ServiceResponse<List<RefreshTokenDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} expired tokens"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<RefreshTokenDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Delete expired tokens
        /// </summary>
        public async Task<ServiceResponse<int>> DeleteExpiredTokensAsync()
        {
            try
            {
                var expiredTokens = await _refreshTokenRepository.GetAsync(rt => rt.ExpiresAt <= DateTime.UtcNow);
                var deletedCount = 0;

                foreach (var token in expiredTokens)
                {
                    var result = await _refreshTokenRepository.DeleteAsync(token);
                    if (result) deletedCount++;
                }

                return new ServiceResponse<int>
                {
                    Success = true,
                    Data = deletedCount,
                    Message = $"Deleted {deletedCount} expired tokens"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<int>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get valid tokens count for user
        /// </summary>
        public async Task<ServiceResponse<int>> GetValidTokenCountAsync(Guid userId)
        {
            try
            {
                if (userId == Guid.Empty)
                    throw new ArgumentException("User id cannot be empty", nameof(userId));

                var count = await _refreshTokenRepository.CountAsync(rt =>
                    rt.UserId == userId && rt.ExpiresAt > DateTime.UtcNow);
                return new ServiceResponse<int>
                {
                    Success = true,
                    Data = count,
                    Message = "Token count retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<int>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Revoke all tokens for user
        /// </summary>
        public async Task<ServiceResponse<int>> RevokeAllUserTokensAsync(Guid userId)
        {
            try
            {
                if (userId == Guid.Empty)
                    throw new ArgumentException("User id cannot be empty", nameof(userId));

                var userTokens = await _refreshTokenRepository.GetAsync(rt => rt.UserId == userId);
                var revokedCount = 0;

                foreach (var token in userTokens)
                {
                    var result = await _refreshTokenRepository.DeleteAsync(token);
                    if (result) revokedCount++;
                }

                return new ServiceResponse<int>
                {
                    Success = true,
                    Data = revokedCount,
                    Message = $"Revoked {revokedCount} tokens"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<int>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
