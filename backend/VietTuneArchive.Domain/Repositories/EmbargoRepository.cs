using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class EmbargoRepository : GenericRepository<Embargo>, IEmbargoRepository
    {
        private readonly DBContext _context;

        public EmbargoRepository(DBContext context) : base(context)
        {
            _context = context;
        }

        public async Task<Embargo?> GetByRecordingIdAsync(Guid recordingId)
        {
            return await _context.Embargoes.FirstOrDefaultAsync(e => e.RecordingId == recordingId);
        }
    }
}
