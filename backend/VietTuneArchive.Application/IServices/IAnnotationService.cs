using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IAnnotationService : IGenericService<AnnotationDto>
    {
        Task<Result<IEnumerable<AnnotationDto>>> GetByRecordingAsync(Guid recordingId);
        Task<Result<IEnumerable<AnnotationDto>>> GetByExpertAsync(Guid expertId);
        Task<Result<CreateAnnotationDto>> CreateAsync(CreateAnnotationDto annotationDto);
        Task<Result<UpdateAnnotationDto>> UpdateAsync(UpdateAnnotationDto annotationDto);
        Task<Result<Guid>> DeleteAsync(Guid annotationId);
        Task<ServiceResponse<List<AnnotationDto>>> GetByTypeAsync(string type);
        Task<ServiceResponse<List<AnnotationDto>>> SearchAsync(string keyword);
        Task<ServiceResponse<List<AnnotationDto>>> GetByTimeRangeAsync(Guid recordingId, int startTime, int endTime);
    }
}
