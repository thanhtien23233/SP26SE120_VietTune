using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IAuditLogService : IGenericService<AuditLogDto> 
    { 
        Task<ServiceResponse<List<AuditLogDto>>> GetByEntityIdAsync(string entityId);
        Task<ServiceResponse<List<AuditLogDto>>> GetByUserAsync(Guid userId);
        Task<ServiceResponse<List<AuditLogDto>>> GetByEntityTypeAsync(string entityType);
        Task<ServiceResponse<List<AuditLogDto>>> GetByActionAsync(string action);
        Task<ServiceResponse<List<AuditLogDto>>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<ServiceResponse<List<AuditLogDto>>> GetRecentAsync(int count = 50);
    }
}
