using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class AuditLogService : GenericService<AuditLog, AuditLogDto>, IAuditLogService
    {
        private readonly IAuditLogRepository _auditLogRepository;

        public AuditLogService(IAuditLogRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _auditLogRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get audit logs by user
        /// </summary>
        public async Task<ServiceResponse<List<AuditLogDto>>> GetByUserAsync(Guid userId)
        {
            try
            {
                if (userId == Guid.Empty)
                    throw new ArgumentException("User id cannot be empty", nameof(userId));

                var logs = await _auditLogRepository.GetAsync(al => al.UserId == userId);
                var dtos = _mapper.Map<List<AuditLogDto>>(logs.OrderByDescending(al => al.CreatedAt).ToList());
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} audit logs"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get audit logs by entity type
        /// </summary>
        public async Task<ServiceResponse<List<AuditLogDto>>> GetByEntityTypeAsync(string entityType)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(entityType))
                    throw new ArgumentException("Entity type cannot be empty", nameof(entityType));

                var logs = await _auditLogRepository.GetAsync(al => al.EntityType == entityType);
                var dtos = _mapper.Map<List<AuditLogDto>>(logs.OrderByDescending(al => al.CreatedAt).ToList());
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} audit logs"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get audit logs by action
        /// </summary>
        public async Task<ServiceResponse<List<AuditLogDto>>> GetByActionAsync(string action)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(action))
                    throw new ArgumentException("Action cannot be empty", nameof(action));

                var logs = await _auditLogRepository.GetAsync(al => al.Action == action);
                var dtos = _mapper.Map<List<AuditLogDto>>(logs.OrderByDescending(al => al.CreatedAt).ToList());
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} audit logs"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get audit logs for specific entity
        /// </summary>
        public async Task<ServiceResponse<List<AuditLogDto>>> GetByEntityIdAsync(string entityId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(entityId))
                    throw new ArgumentException("Entity id cannot be empty", nameof(entityId));

                var logs = await _auditLogRepository.GetAsync(al => al.EntityId == entityId);
                var dtos = _mapper.Map<List<AuditLogDto>>(logs.OrderByDescending(al => al.CreatedAt).ToList());
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} audit logs"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get audit logs in date range
        /// </summary>
        public async Task<ServiceResponse<List<AuditLogDto>>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            try
            {
                if (startDate > endDate)
                    throw new ArgumentException("Start date must be before end date");

                var logs = await _auditLogRepository.GetAsync(al =>
                    al.CreatedAt >= startDate && al.CreatedAt <= endDate);
                var dtos = _mapper.Map<List<AuditLogDto>>(logs.OrderByDescending(al => al.CreatedAt).ToList());
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} audit logs"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get recent audit logs
        /// </summary>
        public async Task<ServiceResponse<List<AuditLogDto>>> GetRecentAsync(int count = 50)
        {
            try
            {
                if (count <= 0)
                    throw new ArgumentException("Count must be greater than 0", nameof(count));

                var logs = await _auditLogRepository.GetAllAsync();
                var recent = logs
                    .OrderByDescending(al => al.CreatedAt)
                    .Take(count)
                    .ToList();

                var dtos = _mapper.Map<List<AuditLogDto>>(recent);
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Retrieved {dtos.Count} recent audit logs"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AuditLogDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
