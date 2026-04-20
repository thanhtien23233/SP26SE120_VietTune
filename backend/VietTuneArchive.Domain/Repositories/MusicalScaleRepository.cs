using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class MusicalScaleRepository : GenericRepository<MusicalScale>, IMusicalScaleRepository
    {
        public MusicalScaleRepository(DBContext context) : base(context)
        {
        }
    }
}
