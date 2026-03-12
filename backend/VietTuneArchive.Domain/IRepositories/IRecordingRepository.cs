using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface IRecordingRepository : IGenericRepository<Recording>
    {
        Task<IEnumerable<Recording>> SearchByTitle(string title);
    }
}
