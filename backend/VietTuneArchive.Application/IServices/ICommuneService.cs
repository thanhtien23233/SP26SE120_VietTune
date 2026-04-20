using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface ICommuneService : IGenericService<CommuneDto>
    {
        Task<Result<IEnumerable<CommuneDto>>> GetByDistrictIdAsync(Guid districtId);
    }
}
