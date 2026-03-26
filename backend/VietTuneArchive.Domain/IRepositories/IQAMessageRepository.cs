using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface IQAMessageRepository : IGenericRepository<QAMessage>
    {
        Task<IEnumerable<QAMessage>> GetByConversationId(Guid conversationId);
    }
}
