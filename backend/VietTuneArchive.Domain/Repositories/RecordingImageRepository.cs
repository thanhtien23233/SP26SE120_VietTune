using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class RecordingImageRepository : GenericRepository<RecordingImage>, IRecordingImageRepository
    {
        public RecordingImageRepository(DBContext context) : base(context)
        {
        }
    }
}
