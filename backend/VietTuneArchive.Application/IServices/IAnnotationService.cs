using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IAnnotationService : IGenericService<AnnotationDto>
    {
        Task<ServiceResponse<List<AnnotationDto>>> GetByRecordingAsync(Guid recordingId);
        Task<ServiceResponse<List<AnnotationDto>>> GetByExpertAsync(Guid expertId);
        Task<ServiceResponse<List<AnnotationDto>>> GetByTypeAsync(string type);
        Task<ServiceResponse<List<AnnotationDto>>> SearchAsync(string keyword);
        Task<ServiceResponse<List<AnnotationDto>>> GetByTimeRangeAsync(Guid recordingId, int startTime, int endTime);
    }
}
