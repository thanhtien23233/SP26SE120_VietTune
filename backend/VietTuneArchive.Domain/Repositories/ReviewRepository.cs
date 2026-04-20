using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class ReviewRepository : GenericRepository<Review>, IReviewRepository
    {
        private readonly DBContext _context;
        public ReviewRepository(DBContext context) : base(context)
        {
            _context = context;
        }
        public async Task<IEnumerable<Review>> GetBySubmissionAsync(Guid submissionId)
        {
            return await _context.Reviews
                .Where(r => r.SubmissionId == submissionId)
                .ToListAsync();
        }
    }
}
