using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class KBRevisionRepository : GenericRepository<KBRevision>, IKBRevisionRepository
    {
        public KBRevisionRepository(DBContext context) : base(context)
        {
        }
    }
}
