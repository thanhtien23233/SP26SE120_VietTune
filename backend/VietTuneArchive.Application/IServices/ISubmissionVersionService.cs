using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface ISubmissionVersionService : IGenericService<SubmissionVersionDto>
    {
        Task<ServiceResponse<List<SubmissionVersionDto>>> GetBySubmissionIdAsync(Guid submissionId);
        Task<ServiceResponse<SubmissionVersionDto>> GetLatestVersionAsync(Guid submissionId);
        Task<ServiceResponse<SubmissionVersionDto>> CreateVersionAsync(CreateSubmissionVersionDto createDto);
    }
}
