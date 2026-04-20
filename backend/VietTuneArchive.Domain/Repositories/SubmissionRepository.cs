using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class SubmissionRepository : GenericRepository<Submission>, ISubmissionRepository
    {
        private readonly DBContext _context;

        public SubmissionRepository(DBContext context) : base(context)
        {
            _context = context;
        }
        public async Task<IEnumerable<Submission>> GetAllSubmissionsAsync()
        {
            return await _context.Submissions
                .Include(r => r.Recording)
                .ThenInclude(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Include(sv => sv.SubmissionVersions)
                .Include(rv => rv.Reviews)
                .Include(re => re.Reviewer)
                .ToListAsync();
        }
        public async Task<Submission> GetSubmissionByIdAsync(Guid id)
        {
            return await _context.Submissions
                .Include(r => r.Recording)
                .ThenInclude(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Include(sv => sv.SubmissionVersions)
                .Include(rv => rv.Reviews)
                .Include(re => re.Reviewer)
                .FirstOrDefaultAsync(s => s.Id == id);
        }
        public async Task<IEnumerable<Submission>> GetByUserIdAsync(Guid userId)
        {
            return await _context.Submissions
                .Where(s => s.ContributorId == userId)
                .Include(r => r.Recording)
                .ThenInclude(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Include(sv => sv.SubmissionVersions)
                .Include(rv => rv.Reviews)
                .Include(re => re.Reviewer)
                .ToListAsync();
        }
        public async Task<IEnumerable<Submission>> GetByStatusAsync(SubmissionStatus status)
        {
            return await _context.Submissions
                .Where(s => s.Status == status)
                .Include(r => r.Recording)
                .ThenInclude(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Include(sv => sv.SubmissionVersions)
                .Include(rv => rv.Reviews)
                .Include(re => re.Reviewer)
                .ToListAsync();
        }
        public async Task<IEnumerable<Submission>> GetByExpertIdAsync(Guid expertId)
        {
            return await _context.Submissions
                .Where(s => s.ReviewerId == expertId)
                .Include(r => r.Recording)
                .ThenInclude(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Include(sv => sv.SubmissionVersions)
                .Include(rv => rv.Reviews)
                .Include(re => re.Reviewer)
                .OrderByDescending(s => s.UpdatedAt)
                .ToListAsync();
        }
    }
}
