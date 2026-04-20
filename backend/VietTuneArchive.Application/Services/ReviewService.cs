using AutoMapper;
using VietTuneArchive.Application.Common;
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
        private readonly IMapper _mapper;
        private readonly ISubmissionRepository _submissionRepository;
        private readonly IUserRepository _userRepository;
        public ReviewService(IReviewRepository repository, IMapper mapper, ISubmissionRepository submissionRepository, IUserRepository userRepository)
            : base(repository, mapper)
        {
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _reviewRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _submissionRepository = submissionRepository;
            _userRepository = userRepository;
        }

        /// <summary>
        /// Get reviews by submission
        /// </summary>
        public async Task<Result<IEnumerable<ReviewDto>>> GetBySubmissionAsync(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));
                var submission = await _submissionRepository.GetByIdAsync(submissionId);
                if (submission == null)
                    throw new KeyNotFoundException($"Submission with id {submissionId} not found");
                var reviews = await _reviewRepository.GetBySubmissionAsync(submissionId);
                var dtos = _mapper.Map<List<ReviewDto>>(reviews.OrderByDescending(r => r.CreatedAt).ToList());
                return Result<IEnumerable<ReviewDto>>.Success(dtos, $"Found {dtos.Count} reviews for submission {submissionId}");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<ReviewDto>>.Failure(ex.Message);
            }
        }

        public async Task<Result<CreateReviewDto>> CreateAsync(CreateReviewDto dto)
        {
            try
            {
                if (dto == null)
                    throw new ArgumentNullException(nameof(dto));
                var submission = await _submissionRepository.GetByIdAsync(dto.SubmissionId);
                if (submission == null)
                    throw new KeyNotFoundException($"Submission with id {dto.SubmissionId} not found");
                var reviewer = await _userRepository.GetByIdAsync(dto.ReviewerId);
                if (reviewer == null)
                    throw new KeyNotFoundException($"Reviewer with id {dto.ReviewerId} not found");
                var review = _mapper.Map<Review>(dto);
                review.Id = Guid.NewGuid();
                review.Stage = 0;
                review.Decision = 0;
                review.CreatedAt = DateTime.UtcNow;
                await _reviewRepository.AddAsync(review);
                var createdDto = _mapper.Map<CreateReviewDto>(review);
                return Result<CreateReviewDto>.Success(createdDto, "Review created successfully");
            }
            catch (Exception ex)
            {
                return Result<CreateReviewDto>.Failure(ex.Message);
            }
        }

        public async Task<Result<ReviewDto>> GetByIdAsync(Guid reviewId)
        {
            try
            {
                if (reviewId == Guid.Empty)
                    throw new ArgumentException("Review id cannot be empty", nameof(reviewId));
                var review = await _reviewRepository.GetByIdAsync(reviewId);
                if (review == null)
                    throw new KeyNotFoundException($"Review with id {reviewId} not found");
                var dto = _mapper.Map<ReviewDto>(review);
                return Result<ReviewDto>.Success(dto, $"Found review with id {reviewId}");
            }
            catch (Exception ex)
            {
                return Result<ReviewDto>.Failure(ex.Message);
            }
        }

        public async Task<Result<bool>> UpdateAsync(UpdateReviewDto dto)
        {
            try
            {
                if (dto == null)
                    throw new ArgumentNullException(nameof(dto));
                var review = await _reviewRepository.GetByIdAsync(dto.Id);
                if (review == null)
                    throw new KeyNotFoundException($"Review with id {dto.Id} not found");
                _mapper.Map(dto, review);
                await _reviewRepository.UpdateAsync(review);
                return Result<bool>.Success(true, "Review updated successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
    }
}
