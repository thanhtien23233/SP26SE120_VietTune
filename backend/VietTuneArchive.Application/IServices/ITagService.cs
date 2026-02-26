using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface ITagService : IGenericService<TagDto>
    {
        Task<ServiceResponse<List<TagDto>>> GetByCategoryAsync(string category);
        Task<ServiceResponse<List<TagDto>>> SearchByNameAsync(string name);
        Task<ServiceResponse<List<string>>> GetAllCategoriesAsync();
        Task<ServiceResponse<TagDto>> GetOrCreateAsync(string name, string? category = null);
    }
}
