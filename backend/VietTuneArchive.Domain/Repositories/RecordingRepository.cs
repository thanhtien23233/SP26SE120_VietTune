using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class RecordingRepository : GenericRepository<Recording>, IRecordingRepository
    {
        public RecordingRepository(DBContext context) : base(context)
        {
        }
    }
}
