using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class ProvinceRepository : GenericRepository<Province>, IProvinceRepository
    {
        public ProvinceRepository(DBContext context) : base(context)
        {
        }
    }
}
