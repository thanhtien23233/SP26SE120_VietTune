using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface ICeremonyService : IGenericService<CeremonyDto>
    {
        Task<ServiceResponse<List<CeremonyDto>>> GetByTypeAsync(string type);
        Task<ServiceResponse<List<CeremonyDto>>> GetBySeasonAsync(string season);
        Task<ServiceResponse<List<CeremonyDto>>> SearchByNameAsync(string name);
        Task<ServiceResponse<List<string>>> GetAllTypesAsync();
        Task<ServiceResponse<List<string>>> GetAllSeasonsAsync();
    }
}
