using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface IQAConversationService : IGenericService<QAConversationDto>
    {
        Task<Result<IEnumerable<QAConversationDto>>> GetByUserAsync(Guid userId);
    }
}
