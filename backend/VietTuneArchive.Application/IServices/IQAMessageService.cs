using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface IQAMessageService : IGenericService<QAMessageDto>
    {
        Task<Result<IEnumerable<QAMessageDto>>> GetByConversationAsync(Guid conversationId);
    }
}