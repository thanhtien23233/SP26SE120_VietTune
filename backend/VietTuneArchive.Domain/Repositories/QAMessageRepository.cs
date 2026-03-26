using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class QAMessageRepository : GenericRepository<QAMessage>, IQAMessageRepository
    {
        private readonly DBContext _context;
        public QAMessageRepository(DBContext context) : base(context)
        {
            _context = context;
        }
        public async Task<IEnumerable<QAMessage>> GetByConversationId(Guid conversationId)
        {
            return await _context.QAMessages
                .Where(m => m.ConversationId == conversationId)
                .ToListAsync();
        }
    }
}
