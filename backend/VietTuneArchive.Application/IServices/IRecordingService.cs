using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface IRecordingService : IGenericService<RecordingDto> 
    {
        Task<Result<RecordingDto>> UploadRecordInfo (RecordingDto recordingDto);
    }
}
