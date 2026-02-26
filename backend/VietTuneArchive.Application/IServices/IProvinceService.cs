using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IProvinceService : IGenericService<ProvinceDto>
    {
        Task<ServiceResponse<ProvinceDto>> GetByRegionCodeAsync(string regionCode);
        Task<ServiceResponse<List<ProvinceDto>>> SearchByNameAsync(string name);
        Task<ServiceResponse<List<ProvinceDto>>> GetAllWithDetailsAsync();
    }
}
