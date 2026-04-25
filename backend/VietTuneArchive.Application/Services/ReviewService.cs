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
        private readonly INotificationService _notificationService;

        public ReviewService(
            IReviewRepository repository, 
            IMapper mapper, 
            ISubmissionRepository submissionRepository, 
            IUserRepository userRepository,
            INotificationService notificationService)
            : base(repository, mapper)
        {
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _reviewRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _submissionRepository = submissionRepository;
            _userRepository = userRepository;
            _notificationService = notificationService;
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

        public async Task<Result<bool>> SubmitReviewAsync(Guid submissionId, Guid reviewerId, int decision, string comments)
        {
            try
            {
                var submission = await _submissionRepository.GetByIdAsync(submissionId);
                if (submission == null) return Result<bool>.Failure("Submission not found");

                if (submission.Status == Domain.Entities.Enum.SubmissionStatus.Approved || 
                    submission.Status == Domain.Entities.Enum.SubmissionStatus.Rejected)
                {
                    return Result<bool>.Failure("Cannot review an already decided submission");
                }

                var reviewer = await _userRepository.GetByIdAsync(reviewerId);
                if (reviewer == null || reviewer.Role != "Expert")
                {
                    return Result<bool>.Failure("Unauthorized: Only Expert can review");
                }

                if (submission.ReviewerId != reviewerId)
                {
                    return Result<bool>.Failure("Forbidden: You are not assigned to review this submission");
                }

                if (string.IsNullOrWhiteSpace(comments) && (decision == 1 || decision == 2))
                {
                    return Result<bool>.Failure("Validation Error: Feedback is required when rejecting or requesting edits");
                }

                var review = new Review
                {
                    Id = Guid.NewGuid(),
                    SubmissionId = submissionId,
                    ReviewerId = reviewerId,
                    Decision = decision,
                    Stage = submission.CurrentStage,
                    Comments = comments,
                    CreatedAt = DateTime.UtcNow
                };

                await _reviewRepository.AddAsync(review);

                if (decision == 1) // Reject
                {
                    submission.Status = Domain.Entities.Enum.SubmissionStatus.Rejected;
                    await _notificationService.SendNotificationAsync(submission.ContributorId, "Submission Rejected", "Your submission was rejected.", "SubmissionRejected", "Submission", submission.Id);
                }
                else if (decision == 0) // Approve/Pass
                {
                    if (submission.CurrentStage == 0) // Screening
                    {
                        submission.CurrentStage = 1; // Verification
                        await _notificationService.SendNotificationAsync(submission.ContributorId, "Screening Passed", "Your submission passed screening.", "ScreeningPassed", "Submission", submission.Id);
                    }
                    else if (submission.CurrentStage == 1) // Verification
                    {
                        submission.CurrentStage = 2; // Approval
                        await _notificationService.SendNotificationAsync(submission.ContributorId, "Verification Passed", "Your submission passed verification.", "VerificationPassed", "Submission", submission.Id);
                    }
                    else if (submission.CurrentStage == 2) // Final Approval
                    {
                        submission.Status = Domain.Entities.Enum.SubmissionStatus.Approved;
                        await _notificationService.SendNotificationAsync(submission.ContributorId, "Submission Approved", "Your submission is approved.", "SubmissionApproved", "Submission", submission.Id);
                    }
                }

                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepository.UpdateAsync(submission);

                return Result<bool>.Success(true, "Review submitted successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
    }
}
