using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IRecordingService : IGenericService<RecordingDto>
    {
        Task<Result<RecordingDto>> UploadRecordInfo(RecordingDto recordingDto, Guid recordingId);
        Task<Result<IEnumerable<GetRecordingDto>>> SearchByTitleAsync(string title);
        Task<Result<RecordingSearchResultDto>> SearchByFilterAsync(RecordingFilterDto filter);
        Task<ServiceResponse<List<RecordingDto>>> GetByEthnicGroupAsync(Guid ethnicGroupId);
        Task<ServiceResponse<List<RecordingDto>>> GetByCommuneAsync(Guid communeId);
        Task<ServiceResponse<List<RecordingDto>>> GetByPerformerAsync(string performerName);
        Task<ServiceResponse<List<RecordingDto>>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<ServiceResponse<List<RecordingDto>>> GetByCeremonyAsync(Guid ceremonyId);
        Task<ServiceResponse<List<RecordingDto>>> GetRecentAsync(int count = 10);
    }
}
