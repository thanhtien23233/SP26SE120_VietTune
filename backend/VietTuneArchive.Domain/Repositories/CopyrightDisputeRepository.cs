using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class CopyrightDisputeRepository : GenericRepository<CopyrightDispute>, ICopyrightDisputeRepository
    {
        private readonly DBContext _context;

        public CopyrightDisputeRepository(DBContext context) : base(context)
        {
            _context = context;
        }

        public async Task<(IEnumerable<CopyrightDispute> Data, int Total)> GetPagedAsync(
            CopyrightDisputeStatus? status,
            Guid? assignedReviewerId,
            Guid? recordingId,
            int page,
            int pageSize)
        {
            var query = _context.CopyrightDisputes
                .Include(c => c.Recording)
                .Include(c => c.ReportedByUser)
                .Include(c => c.AssignedReviewer)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(c => c.Status == status.Value);

            if (assignedReviewerId.HasValue)
                query = query.Where(c => c.AssignedReviewerId == assignedReviewerId.Value);

            if (recordingId.HasValue)
                query = query.Where(c => c.RecordingId == recordingId.Value);

            var total = await query.CountAsync();
            var data = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }

        public async Task<CopyrightDispute?> GetByIdWithDetailsAsync(Guid id)
        {
            return await _context.CopyrightDisputes
                .Include(c => c.Recording)
                .Include(c => c.Submission)
                .Include(c => c.ReportedByUser)
                .Include(c => c.AssignedReviewer)
                .FirstOrDefaultAsync(c => c.Id == id);
        }
    }
}
