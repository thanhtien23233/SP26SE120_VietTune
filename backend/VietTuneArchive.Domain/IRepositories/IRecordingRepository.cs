using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface IRecordingRepository : IGenericRepository<Recording>
    {
        Task<IEnumerable<Recording>> SearchByTitle(string title);
        Task<(IEnumerable<Recording> Data, int Total)> SearchByFilterAsync(
            Guid? ethnicGroupId,
            Guid? instrumentId,
            Guid? ceremonyId,
            string? regionCode,
            Guid? communeId,
            int page = 1,
            int pageSize = 10,
            string sortOrder = "desc");
    }
}
