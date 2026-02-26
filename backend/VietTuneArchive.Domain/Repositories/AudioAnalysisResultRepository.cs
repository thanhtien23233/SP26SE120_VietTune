using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class AudioAnalysisResultRepository : GenericRepository<AudioAnalysisResult>, IAudioAnalysisResultRepository
    {
        public AudioAnalysisResultRepository(DBContext context) : base(context)
        {
        }
    }
}
