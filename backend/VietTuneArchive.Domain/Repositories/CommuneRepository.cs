using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class CommuneRepository : GenericRepository<Commune>, ICommuneRepository
    {
        private readonly DBContext _context;
        public CommuneRepository(DBContext context) : base(context)
        {
            _context = context;
        }
        public async Task<IEnumerable<Commune>> GetByDistrictIdAsync(Guid districtId)
        {
            return await _context.Communes
                .Where(c => c.DistrictId == districtId)
                .ToListAsync();
        }
    }
}
