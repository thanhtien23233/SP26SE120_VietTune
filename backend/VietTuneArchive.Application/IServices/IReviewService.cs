using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IReviewService : IGenericService<ReviewDto>
    {
        Task<Result<IEnumerable<ReviewDto>>> GetBySubmissionAsync(Guid submissionId);
        Task<Result<CreateReviewDto>> CreateAsync(CreateReviewDto dto);
        Task<Result<bool>> UpdateAsync(UpdateReviewDto dto);
        Task<Result<ReviewDto>> GetByIdAsync(Guid reviewId);
        Task<Result<bool>> SubmitReviewAsync(Guid submissionId, Guid reviewerId, int decision, string comments);
    }
}
