using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class DistrictRepository : GenericRepository<District>, IDistrictRepository
    {
        private readonly DBContext _context;
        public DistrictRepository(DBContext context) : base(context)
        {
            _context = context;
        }
        public async Task<IEnumerable<District>> GetByProvinceAsync(Guid id)
        {
            return await _context.Districts.Where(d => d.ProvinceId == id).ToListAsync();
        }
    }
}
