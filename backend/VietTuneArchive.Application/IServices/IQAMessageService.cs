using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface IQAMessageService : IGenericService<QAMessageDto>
    {
        Task<Result<IEnumerable<QAMessageDto>>> GetByConversationAsync(Guid conversationId);
        Task<Result<bool>> FlagMessageAsync(Guid messageId);
        Task<Result<bool>> UnflagMessageAsync(Guid messageId);
    }
}