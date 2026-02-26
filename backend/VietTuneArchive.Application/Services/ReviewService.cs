using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class ReviewService : GenericService<Review, ReviewDto>, IReviewService
    {
        private readonly IReviewRepository _reviewRepository;

        public ReviewService(IReviewRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _reviewRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get reviews by submission
        /// </summary>
        public async Task<ServiceResponse<List<ReviewDto>>> GetBySubmissionAsync(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));

                var reviews = await _reviewRepository.GetAsync(r => r.SubmissionId == submissionId);
                var dtos = _mapper.Map<List<ReviewDto>>(reviews.OrderBy(r => r.Stage).ToList());
                return new ServiceResponse<List<ReviewDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} reviews"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<ReviewDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get reviews by reviewer
        /// </summary>
        public async Task<ServiceResponse<List<ReviewDto>>> GetByReviewerAsync(Guid reviewerId)
        {
            try
            {
                if (reviewerId == Guid.Empty)
                    throw new ArgumentException("Reviewer id cannot be empty", nameof(reviewerId));

                var reviews = await _reviewRepository.GetAsync(r => r.ReviewerId == reviewerId);
                var dtos = _mapper.Map<List<ReviewDto>>(reviews.OrderByDescending(r => r.CreatedAt).ToList());
                return new ServiceResponse<List<ReviewDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} reviews"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<ReviewDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get reviews by decision
        /// </summary>
        public async Task<ServiceResponse<List<ReviewDto>>> GetByDecisionAsync(int decision)
        {
            try
            {
                var reviews = await _reviewRepository.GetAsync(r => r.Decision == decision);
                var dtos = _mapper.Map<List<ReviewDto>>(reviews);
                return new ServiceResponse<List<ReviewDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} reviews with decision {decision}"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<ReviewDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get reviews by stage
        /// </summary>
        public async Task<ServiceResponse<List<ReviewDto>>> GetByStageAsync(int stage)
        {
            try
            {
                var reviews = await _reviewRepository.GetAsync(r => r.Stage == stage);
                var dtos = _mapper.Map<List<ReviewDto>>(reviews);
                return new ServiceResponse<List<ReviewDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} reviews at stage {stage}"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<ReviewDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get recent reviews
        /// </summary>
        public async Task<ServiceResponse<List<ReviewDto>>> GetRecentAsync(int count = 10)
        {
            try
            {
                if (count <= 0)
                    throw new ArgumentException("Count must be greater than 0", nameof(count));

                var reviews = await _reviewRepository.GetAllAsync();
                var recentReviews = reviews
                    .OrderByDescending(r => r.CreatedAt)
                    .Take(count)
                    .ToList();

                var dtos = _mapper.Map<List<ReviewDto>>(recentReviews);
                return new ServiceResponse<List<ReviewDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Retrieved {dtos.Count} recent reviews"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<ReviewDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get pending reviews count
        /// </summary>
        public async Task<ServiceResponse<int>> GetPendingCountAsync()
        {
            try
            {
                var count = await _reviewRepository.CountAsync(r => r.Decision == 0); // 0 = pending
                return new ServiceResponse<int>
                {
                    Success = true,
                    Data = count,
                    Message = "Pending reviews count retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<int>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
