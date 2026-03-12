using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Domain.IRepositories;
using Microsoft.EntityFrameworkCore;

namespace VietTuneArchive.Domain.Repositories
{
    public class RecordingRepository : GenericRepository<Recording>, IRecordingRepository
    {
        private readonly DBContext _context;
        public RecordingRepository(DBContext context) : base(context)
        {
            _context = context;
        }
        public async Task<IEnumerable<Recording>> SearchByTitle (string title)
        {
            return await _context.Recordings
                .Include(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Where(r => r.Title.Contains(title))
                .Where(r => r.Status == SubmissionStatus.Approved)
                .ToListAsync();
        }
    }
}
