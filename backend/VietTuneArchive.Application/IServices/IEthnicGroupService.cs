using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IEthnicGroupService : IGenericService<EthnicGroupDto>
    {
        Task<ServiceResponse<List<EthnicGroupDto>>> SearchAsync(string keyword);
        Task<ServiceResponse<List<EthnicGroupDto>>> GetByRegionAsync(string region);
        Task<ServiceResponse<List<EthnicGroupDto>>> GetByLanguageFamilyAsync(string languageFamily);
        Task<ServiceResponse<List<string>>> GetAllRegionsAsync();
    }
}
