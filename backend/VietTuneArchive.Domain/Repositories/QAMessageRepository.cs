using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class QAMessageRepository : GenericRepository<QAMessage>, IQAMessageRepository
    {
        public QAMessageRepository(DBContext context) : base(context)
        {
        }
    }
}
