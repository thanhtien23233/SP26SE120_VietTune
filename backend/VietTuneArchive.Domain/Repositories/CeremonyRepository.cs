using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class CeremonyRepository : GenericRepository<Ceremony>, ICeremonyRepository
    {
        public CeremonyRepository(DBContext context) : base(context)
        {
        }
    }
}
