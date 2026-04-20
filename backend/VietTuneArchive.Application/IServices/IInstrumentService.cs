using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IInstrumentService : IGenericService<InstrumentDto>
    {
        Task<ServiceResponse<List<InstrumentDto>>> GetByCategoryAsync(string category);
        Task<ServiceResponse<List<InstrumentDto>>> GetByEthnicGroupAsync(Guid ethnicGroupId);
        Task<ServiceResponse<List<InstrumentDto>>> SearchAsync(string keyword);
        Task<ServiceResponse<List<string>>> GetAllCategoriesAsync();
    }
}
