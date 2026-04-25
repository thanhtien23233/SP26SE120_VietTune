using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IKBRevisionService : IGenericService<KBRevisionDto> 
    { 
        Task<ServiceResponse<bool>> RollbackAsync(Guid entryId, Guid revisionId, Guid currentUserId);
    }
}
