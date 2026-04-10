using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface IDistrictService : IGenericService<DistrictDto>
    {
        Task<Result<IEnumerable<DistrictDto>>> GetByProvinceIdAsync(Guid provinceId);
    }
}
