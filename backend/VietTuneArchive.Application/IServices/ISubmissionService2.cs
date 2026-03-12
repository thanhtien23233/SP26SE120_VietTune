using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Application.IServices
{
    public interface ISubmissionService2 : IGenericService<SubmissionDto>
    {
        Task<ServiceResponse<List<SubmissionDto>>> GetByContributorAsync(Guid contributorId);
        Task<ServiceResponse<List<SubmissionDto>>> GetByRecordingAsync(Guid recordingId);
        Task<ServiceResponse<List<SubmissionDto>>> GetByStageAsync(int stage);
        Task<ServiceResponse<List<SubmissionDto>>> GetRecentAsync(int count = 10);
        Task<Result<SubmissionResponseDto>> CreateAsync(SubmissionDto dto);
        Task<Result<bool>> ConfirmSubmit(Guid submissionId);
        Task<Result<bool>> EditRequest(Guid SubmissionId);
        Task<Result<bool>> ConfirmEdit(Guid SubmissionId);
        Task<Result<bool>> RejectSubmission(Guid submissionId);
        Task<Result<bool>> ApproveSubmission(Guid submissionId);
        Task<Result<GetSubmissionDto>> GetSubmissionByIdAsync(Guid id);
        Task<Result<IEnumerable<GetSubmissionDto>>> GetAllSubmissionsAsync();
        Task<Result<IEnumerable<GetSubmissionDto>>> GetSubmissionsByUserIdAsync(Guid userId);
        Task<Result<IEnumerable<GetSubmissionDto>>> GetSubmissionsByStatusAsync(SubmissionStatus status);
        Task<Result<bool>> DeleteSubmissionAsync(Guid submissionId);
    }
}
