using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface ISubmissionService2 : IGenericService<SubmissionDto>
    {
        Task<ServiceResponse<List<SubmissionDto>>> GetByContributorAsync(Guid contributorId);
        Task<ServiceResponse<List<SubmissionDto>>> GetByRecordingAsync(Guid recordingId);
        Task<ServiceResponse<List<SubmissionDto>>> GetByStatusAsync(int status);
        Task<ServiceResponse<List<SubmissionDto>>> GetByStageAsync(int stage);
        Task<ServiceResponse<List<SubmissionDto>>> GetRecentAsync(int count = 10);
    }
}
