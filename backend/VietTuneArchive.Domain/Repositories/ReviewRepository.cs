using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class ReviewRepository : GenericRepository<Review>, IReviewRepository
    {
        public ReviewRepository(DBContext context) : base(context)
        {
        }
    }
}
