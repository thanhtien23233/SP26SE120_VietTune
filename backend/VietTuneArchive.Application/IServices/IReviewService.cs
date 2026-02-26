using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IReviewService : IGenericService<ReviewDto>
    {
        Task<ServiceResponse<List<ReviewDto>>> GetBySubmissionAsync(Guid submissionId);
        Task<ServiceResponse<List<ReviewDto>>> GetByReviewerAsync(Guid reviewerId);
        Task<ServiceResponse<List<ReviewDto>>> GetByDecisionAsync(int decision);
        Task<ServiceResponse<List<ReviewDto>>> GetByStageAsync(int stage);
        Task<ServiceResponse<List<ReviewDto>>> GetRecentAsync(int count = 10);
        Task<ServiceResponse<int>> GetPendingCountAsync();
    }
}
