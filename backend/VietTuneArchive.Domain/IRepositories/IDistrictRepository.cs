using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface IDistrictRepository : IGenericRepository<District>
    {
        Task<IEnumerable<District>> GetByProvinceAsync(Guid id);
    }
}
