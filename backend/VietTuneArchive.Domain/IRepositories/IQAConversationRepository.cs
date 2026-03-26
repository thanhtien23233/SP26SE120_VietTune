using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface IQAConversationRepository : IGenericRepository<QAConversation>
    {
        Task<IEnumerable<QAConversation>> GetByUserId(Guid userId);
    }
}
