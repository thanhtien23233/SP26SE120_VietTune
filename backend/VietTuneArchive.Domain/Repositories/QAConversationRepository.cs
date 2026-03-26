using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class QAConversationRepository : GenericRepository<QAConversation>, IQAConversationRepository
    {
        private readonly DBContext _context;
        public QAConversationRepository(DBContext context) : base(context)
        {
            _context = context;
        }
        public async Task<IEnumerable<QAConversation>> GetByUserId(Guid userId)
        {
            return await _context.QAConversations
                .Where(c => c.UserId == userId)
                .ToListAsync();
        }
    }
}
