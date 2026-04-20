using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class VocalStyleRepository : GenericRepository<VocalStyle>, IVocalStyleRepository
    {
        public VocalStyleRepository(DBContext context) : base(context)
        {
        }
    }
}
