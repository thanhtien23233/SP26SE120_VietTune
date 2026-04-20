using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class SubmissionVersionRepository : GenericRepository<SubmissionVersion>, ISubmissionVersionRepository
    {
        public SubmissionVersionRepository(DBContext context) : base(context)
        {
        }
    }
}
