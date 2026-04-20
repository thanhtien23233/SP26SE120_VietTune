using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class ProvinceRepository : GenericRepository<Province>, IProvinceRepository
    {
        private readonly DBContext _context;
        public ProvinceRepository(DBContext context) : base(context)
        {
            _context = context;
        }
    }
}
