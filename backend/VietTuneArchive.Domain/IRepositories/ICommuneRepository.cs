using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface ICommuneRepository : IGenericRepository<Commune>
    {
        Task<IEnumerable<Commune>> GetByDistrictIdAsync(Guid districtId);
    }
}
