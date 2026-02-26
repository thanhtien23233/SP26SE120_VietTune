using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class DistrictRepository : GenericRepository<District>, IDistrictRepository
    {
        public DistrictRepository(DBContext context) : base(context)
        {
        }
    }
}
