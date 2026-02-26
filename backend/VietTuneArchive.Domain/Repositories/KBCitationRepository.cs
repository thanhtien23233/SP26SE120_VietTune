using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class KBCitationRepository : GenericRepository<KBCitation>, IKBCitationRepository
    {
        public KBCitationRepository(DBContext context) : base(context)
        {
        }
    }
}
