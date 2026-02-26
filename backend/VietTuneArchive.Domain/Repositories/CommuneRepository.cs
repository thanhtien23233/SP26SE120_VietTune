using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class CommuneRepository : GenericRepository<Commune>, ICommuneRepository
    {
        public CommuneRepository(DBContext context) : base(context)
        {
        }
    }
}
