using AutoMapper;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Domain.IRepositories;
using VietTuneArchive.Domain.Context;
using Microsoft.EntityFrameworkCore;

namespace VietTuneArchive.Application.Services
{
    public class SubmissionService2 : GenericService<Submission, SubmissionDto>, ISubmissionService2
    {
        private readonly IGenericRepository<Submission> _submissionRepository;
        private readonly ISubmissionRepository _submissionRepo;
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;
        private readonly IRecordingRepository _recordingRepository;
        private readonly INotificationService _notificationService;
        private readonly IEmbeddingService _localEmbeddingService;
        private readonly ILogger<SubmissionService2> _logger;
        private readonly DBContext _dbContext;
        public SubmissionService2(IGenericRepository<Submission> repository, ISubmissionRepository submissionRepo, IMapper mapper, IUserRepository userRepository, IRecordingRepository recordingRepository, INotificationService notificationService, IEmbeddingService localEmbeddingService, ILogger<SubmissionService2> logger, DBContext dbContext)
            : base(repository, mapper)
        {
            _submissionRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _submissionRepo = submissionRepo ?? throw new ArgumentNullException(nameof(submissionRepo));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _recordingRepository = recordingRepository ?? throw new ArgumentNullException(nameof(recordingRepository));
            _notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
            _localEmbeddingService = localEmbeddingService ?? throw new ArgumentNullException(nameof(localEmbeddingService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        }
        public async Task<Result<SubmissionResponseDto>> CreateAsync(SubmissionDto dto)
        {
            try
            {
                if (dto == null)
                    throw new ArgumentNullException(nameof(dto), "Submission data cannot be null");
                var user = await _userRepository.GetByIdAsync(dto.UploadedById);
                if (user == null)
                    throw new ArgumentException("Invalid user ID", nameof(dto.UploadedById));
                var recording = new Recording
                {
                    Id = Guid.NewGuid(),
                    AudioFileUrl = dto.AudioFileUrl,
                    UploadedById = dto.UploadedById,
                    Status = SubmissionStatus.Draft,
                    CreatedAt = DateTime.UtcNow
                };
                await _recordingRepository.AddAsync(recording);

                var submission = new Submission
                {
                    Id = Guid.NewGuid(),
                    RecordingId = recording.Id,
                    Recording = recording,
                    CurrentStage = 1,
                    Status = SubmissionStatus.Draft,
                    SubmittedAt = DateTime.UtcNow,
                    ContributorId = dto.UploadedById
                };
                await _submissionRepository.AddAsync(submission);
                recording.SubmissionId = submission.Id;
                recording.Submission = submission;
                await _recordingRepository.UpdateAsync(recording);

                var createdDto = new SubmissionResponseDto
                {
                    SubmissionId = submission.Id,
                    RecordingId = recording.Id,
                    UploadedById = submission.ContributorId,
                    AudioFileUrl = recording.AudioFileUrl
                };
                createdDto.AudioFileUrl = recording.AudioFileUrl;
                return Result<SubmissionResponseDto>.Success(createdDto, "Submission created successfully");
            }
            catch (Exception ex)
            {
                return Result<SubmissionResponseDto>.Failure($"Failed to create submission: {ex.Message}");
            }
        }
        public async Task<Result<bool>> ConfirmSubmit(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (submission == null)
                    return Result<bool>.Failure("Submission not found");

                var recording = await _recordingRepository.GetByIdAsync(submission.RecordingId.Value);
                if (recording == null)
                    return Result<bool>.Failure("NOT_FOUND", "Associated recording not found", "NotFound");
                if (recording.Status != SubmissionStatus.Pending)
                    return Result<bool>.Failure("INVALID_STATUS", "Recording is not in a state that can be submitted", "BadRequest");

                submission.Status = SubmissionStatus.Pending;
                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepo.UpdateAsync(submission);
                return Result<bool>.Success(true, "Submission confirmed successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure("INTERNAL_ERROR", $"Failed to confirm submission: {ex.Message}");
            }
        }

        public async Task<Result<bool>> EditRequest(Guid submissionId, Guid reviewerId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (submission == null)
                    return Result<bool>.Failure("NOT_FOUND", "Submission not found", "NotFound");
                if (submission.Status != SubmissionStatus.Pending)
                    return Result<bool>.Failure("INVALID_STATUS", "Submission is not in a state that can be marked for edit", "BadRequest");
                var recording = await _recordingRepository.GetByIdAsync(submission.RecordingId.Value);
                if (recording == null)
                    return Result<bool>.Failure("NOT_FOUND", "Associated recording not found", "NotFound");
                if (recording.Status != SubmissionStatus.Pending)
                    return Result<bool>.Failure("INVALID_STATUS", "Recording is not in a state that can be marked for edit", "BadRequest");

                submission.Status = SubmissionStatus.UpdateRequested;
                submission.ReviewerId = reviewerId;
                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepo.UpdateAsync(submission);
                recording.Status = SubmissionStatus.UpdateRequested;
                recording.UpdatedAt = DateTime.UtcNow;
                await _recordingRepository.UpdateAsync(recording);

                return Result<bool>.Success(true, "Submission marked as requires edit successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure("INTERNAL_ERROR", $"Failed to mark submission as requires edit: {ex.Message}");
            }
        }

        public async Task<Result<bool>> ConfirmEdit(Guid SubmissionId)
        {
            try
            {
                if (SubmissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(SubmissionId));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(SubmissionId);
                if (submission == null)
                    return Result<bool>.Failure("NOT_FOUND", "Submission not found", "NotFound");
                if (submission.Status != SubmissionStatus.UpdateRequested)
                    return Result<bool>.Failure("INVALID_STATUS", "Submission is not in a state that can be confirmed for edit", "BadRequest");
                var recording = await _recordingRepository.GetByIdAsync(submission.RecordingId.Value);
                if (recording == null)
                    return Result<bool>.Failure("NOT_FOUND", "Associated recording not found", "NotFound");
                if (recording.Status != SubmissionStatus.UpdateRequested)
                    return Result<bool>.Failure("INVALID_STATUS", "Recording is not in a state that can be confirmed for edit", "BadRequest");

                submission.Status = SubmissionStatus.Pending;
                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepo.UpdateAsync(submission);
                recording.Status = SubmissionStatus.Pending;
                recording.UpdatedAt = DateTime.UtcNow;
                await _recordingRepository.UpdateAsync(recording);

                return Result<bool>.Success(true, "Submission edit confirmed successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure("INTERNAL_ERROR", $"Failed to confirm submission edit: {ex.Message}");
            }
        }
        public async Task<Result<bool>> RejectSubmission(Guid submissionId, Guid reviewerId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (submission == null)
                    return Result<bool>.Failure("NOT_FOUND", "Submission not found", "NotFound");
                if (submission.Status != SubmissionStatus.Pending && submission.Status != SubmissionStatus.UpdateRequested && submission.Status != SubmissionStatus.InReview)
                    return Result<bool>.Failure("INVALID_STATUS", "Submission is not in a state that can be rejected", "BadRequest");
                var recording = await _recordingRepository.GetByIdAsync(submission.RecordingId.Value);
                if (recording == null)
                    return Result<bool>.Failure("NOT_FOUND", "Associated recording not found", "NotFound");
                if (recording.Status != SubmissionStatus.Pending && recording.Status != SubmissionStatus.UpdateRequested)
                    return Result<bool>.Failure("INVALID_STATUS", "Recording is not in a state that can be rejected", "BadRequest");

                submission.Status = SubmissionStatus.Rejected;
                submission.ReviewerId = reviewerId;
                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepo.UpdateAsync(submission);
                recording.Status = SubmissionStatus.Rejected;
                recording.UpdatedAt = DateTime.UtcNow;
                await _recordingRepository.UpdateAsync(recording);

                // Gửi thông báo cho người đóng góp
                await _notificationService.SendNotificationAsync(
                    submission.ContributorId,
                    "Bản ghi bị từ chối",
                    $"Rất tiếc, bản ghi '{recording.Title}' của bạn đã bị từ chối.",
                    "SubmissionRejected",
                    "Submission",
                    submission.Id
                );

                return Result<bool>.Success(true, "Submission rejected successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure("INTERNAL_ERROR", $"Failed to reject submission: {ex.Message}");
            }
        }

        public async Task<Result<bool>> ApproveSubmission(Guid submissionId, Guid reviewerId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (submission == null)
                    return Result<bool>.Failure("NOT_FOUND", "Submission not found", "NotFound");
                if (submission.Status != SubmissionStatus.Pending && submission.Status != SubmissionStatus.InReview)
                    return Result<bool>.Failure("INVALID_STATUS", "Submission is not in a state that can be approved", "BadRequest");
                var recording = await _recordingRepository.GetByIdAsync(submission.RecordingId.Value);
                if (recording == null)
                    return Result<bool>.Failure("NOT_FOUND", "Associated recording not found", "NotFound");
                if (recording.Status != SubmissionStatus.Pending)
                    return Result<bool>.Failure("INVALID_STATUS", "Recording is not in a state that can be approved", "BadRequest");

                submission.Status = SubmissionStatus.Approved;
                submission.ReviewerId = reviewerId;
                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepo.UpdateAsync(submission);
                recording.Status = SubmissionStatus.Approved;
                recording.UpdatedAt = DateTime.UtcNow;
                await _recordingRepository.UpdateAsync(recording);

                // Gửi thông báo cho người đóng góp
                await _notificationService.SendNotificationAsync(
                    submission.ContributorId,
                    "Bản ghi đã được duyệt",
                    $"Chúc mừng! Bản ghi '{recording.Title}' của bạn đã được duyệt và đăng tải.",
                    "SubmissionApproved",
                    "Submission",
                    submission.Id
                );

                // <<< THÊM: Sinh embedding sau khi duyệt >>>
                try
                {
                    // Sync Local Embedding (384-dim) for RAG chat efficiency
                    await _localEmbeddingService.GenerateEmbeddingForRecordingAsync(recording.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to generate local embedding for newly approved Recording {Id}", recording.Id);
                }

                return Result<bool>.Success(true, "Submission approved successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure("INTERNAL_ERROR", $"Failed to approve submission: {ex.Message}");
            }
        }

        public async Task<Result<bool>> AssignReviewer(Guid submissionId, Guid reviewerId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));

                var executionStrategy = _dbContext.Database.CreateExecutionStrategy();
                return await executionStrategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _dbContext.Database.BeginTransactionAsync();

                    var submission = await _dbContext.Submissions
                        .Include(s => s.Recording)
                        .FromSqlInterpolated($"SELECT * FROM Submissions WITH (UPDLOCK, ROWLOCK) WHERE Id = {submissionId}")
                        .FirstOrDefaultAsync();

                    if (submission == null)
                        return Result<bool>.Failure("NOT_FOUND", "Submission not found", "NotFound");

                    if (submission.ReviewerId.HasValue)
                    {
                        if (submission.ReviewerId.Value == reviewerId)
                            return Result<bool>.Success(true, "ALREADY_ASSIGNED_TO_YOU", "Submission is already assigned to this reviewer.");
                        
                        return Result<bool>.Failure("ALREADY_ASSIGNED", "Submission already has a reviewer assigned", "Conflict");
                    }

                    var reviewer = await _userRepository.GetByIdAsync(reviewerId);
                    if (reviewer == null || !reviewer.Role.Contains("Expert"))
                        return Result<bool>.Failure("INVALID_REVIEWER", "Invalid reviewer ID", "BadRequest");

                    submission.ReviewerId = reviewerId;
                    submission.Reviewer = reviewer;
                    submission.Status = SubmissionStatus.InReview;
                    submission.UpdatedAt = DateTime.UtcNow;

                    await _dbContext.SaveChangesAsync();
                    await tx.CommitAsync();

                    if (submission.Recording != null)
                    {
                        await _notificationService.SendNotificationAsync(
                            reviewerId,
                            "Bạn được phân công đánh giá bản ghi",
                            $"Bạn đã được phân công đánh giá bản ghi '{submission.Recording.Title}'. Vui lòng xem xét và đưa ra quyết định.",
                            "SubmissionAssigned",
                            "Submission",
                            submission.Id
                        );
                    }
                    
                    return Result<bool>.Success(true, "Reviewer assigned successfully");
                });
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure("INTERNAL_ERROR", $"Failed to assign reviewer: {ex.Message}");
            }
        }

        public async Task<Result<bool>> UnassignReviewer(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (submission == null)
                    return Result<bool>.Failure("NOT_FOUND", "Submission not found", "NotFound");
                if (!submission.ReviewerId.HasValue)
                    return Result<bool>.Failure("INVALID_STATUS", "Submission does not have a reviewer assigned", "BadRequest");
                
                var reviewerId = submission.ReviewerId.Value;
                submission.ReviewerId = null;
                submission.Reviewer = null;
                submission.Status = SubmissionStatus.Pending; // Optionally revert to Pending
                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepo.UpdateAsync(submission);
                
                if (submission.Recording != null)
                {
                    await _notificationService.SendNotificationAsync(
                        reviewerId,
                        "Bạn đã được gỡ phân công đánh giá bản ghi",
                        $"Phân công đánh giá bản ghi '{submission.Recording.Title}' đã được gỡ bỏ. Bạn không còn trách nhiệm đánh giá bản ghi này.",
                        "SubmissionUnassigned",
                        "Submission",
                        submission.Id
                    );
                }
                
                return Result<bool>.Success(true, "Reviewer unassigned successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure("INTERNAL_ERROR", $"Failed to unassign reviewer: {ex.Message}");
            }
        }

        public async Task<Result<IEnumerable<GetSubmissionDto>>> GetSubmissionByExpertIdAsync(Guid expertId)
        {
            try
            {
                if (expertId == Guid.Empty)
                    throw new ArgumentException("Expert id cannot be empty", nameof(expertId));
                var submissions = await _submissionRepo.GetByExpertIdAsync(expertId);
                var dtos = _mapper.Map<List<GetSubmissionDto>>(submissions);
                return Result<IEnumerable<GetSubmissionDto>>.Success(dtos, $"Found {dtos.Count} submissions for expert ID {expertId}");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<GetSubmissionDto>>.Failure($"Failed to retrieve submission: {ex.Message}");
            }
        }

        /// <summary>
        /// Get submissions by contributor
        /// </summary>
        public async Task<ServiceResponse<List<SubmissionDto>>> GetByContributorAsync(Guid contributorId)
        {
            try
            {
                if (contributorId == Guid.Empty)
                    throw new ArgumentException("Contributor id cannot be empty", nameof(contributorId));

                var submissions = await _submissionRepository.GetAsync(s => s.ContributorId == contributorId);
                var dtos = _mapper.Map<List<SubmissionDto>>(submissions);
                return new ServiceResponse<List<SubmissionDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} submissions"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<SubmissionDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get submissions by recording
        /// </summary>
        public async Task<ServiceResponse<List<SubmissionDto>>> GetByRecordingAsync(Guid recordingId)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty", nameof(recordingId));

                var submissions = await _submissionRepository.GetAsync(s => s.RecordingId == recordingId);
                var dtos = _mapper.Map<List<SubmissionDto>>(submissions);
                return new ServiceResponse<List<SubmissionDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} submissions"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<SubmissionDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }


        /// <summary>
        /// Get submissions by stage
        /// </summary>
        public async Task<ServiceResponse<List<SubmissionDto>>> GetByStageAsync(int stage)
        {
            try
            {
                var submissions = await _submissionRepository.GetAsync(s => s.CurrentStage == stage);
                var dtos = _mapper.Map<List<SubmissionDto>>(submissions);
                return new ServiceResponse<List<SubmissionDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} submissions at stage {stage}"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<SubmissionDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get recent submissions
        /// </summary>
        public async Task<ServiceResponse<List<SubmissionDto>>> GetRecentAsync(int count = 10)
        {
            try
            {
                if (count <= 0)
                    throw new ArgumentException("Count must be greater than 0", nameof(count));

                var submissions = await _submissionRepository.GetAllAsync();
                var recentSubmissions = submissions
                    .OrderByDescending(s => s.SubmittedAt)
                    .Take(count)
                    .ToList();

                var dtos = _mapper.Map<List<SubmissionDto>>(recentSubmissions);
                return new ServiceResponse<List<SubmissionDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Retrieved {dtos.Count} recent submissions"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<SubmissionDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
        public async Task<Result<GetSubmissionDto>> GetSubmissionByIdAsync(Guid id)
        {
            try
            {
                if (id == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(id));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(id);
                if (submission == null)
                    return Result<GetSubmissionDto>.Failure("Submission not found");
                var dto = _mapper.Map<GetSubmissionDto>(submission);
                return Result<GetSubmissionDto>.Success(dto, "Submission retrieved successfully");
            }
            catch (Exception ex)
            {
                return Result<GetSubmissionDto>.Failure($"Failed to retrieve submission: {ex.Message}");
            }
        }
        public async Task<Result<IEnumerable<GetSubmissionDto>>> GetAllSubmissionsAsync()
        {
            try
            {
                var submissions = await _submissionRepo.GetAllSubmissionsAsync();
                var dtos = _mapper.Map<List<GetSubmissionDto>>(submissions);
                return Result<IEnumerable<GetSubmissionDto>>.Success(dtos, $"Retrieved {dtos.Count} submissions");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<GetSubmissionDto>>.Failure($"Failed to retrieve submissions: {ex.Message}");
            }
        }
        public async Task<Result<IEnumerable<GetSubmissionDto>>> GetSubmissionsByUserIdAsync(Guid userId)
        {
            try
            {
                if (userId == Guid.Empty)
                    throw new ArgumentException("User id cannot be empty", nameof(userId));
                var submissions = await _submissionRepo.GetByUserIdAsync(userId);
                var dtos = _mapper.Map<List<GetSubmissionDto>>(submissions);
                return Result<IEnumerable<GetSubmissionDto>>.Success(dtos, $"Retrieved {dtos.Count} submissions for user {userId}");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<GetSubmissionDto>>.Failure($"Failed to retrieve submissions: {ex.Message}");
            }
        }
        public async Task<Result<IEnumerable<GetSubmissionDto>>> GetSubmissionsByStatusAsync(SubmissionStatus status)
        {
            try
            {
                var submissions = await _submissionRepo.GetByStatusAsync(status);

                // If status is Pending, only return submissions that do NOT have a ReviewerId assigned (null)
                if (status == SubmissionStatus.Pending)
                {
                    submissions = submissions.Where(s => !s.ReviewerId.HasValue).ToList();
                }

                var dtos = _mapper.Map<List<GetSubmissionDto>>(submissions);
                return Result<IEnumerable<GetSubmissionDto>>.Success(dtos, $"Retrieved {dtos.Count} submissions with status {status}");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<GetSubmissionDto>>.Failure($"Failed to retrieve submissions: {ex.Message}");
            }
        }
        public async Task<Result<bool>> DeleteSubmissionAsync(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));

                var submission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (submission == null)
                    return Result<bool>.Failure("Submission not found");

                if (submission.Status == SubmissionStatus.Approved)
                    return Result<bool>.Failure("Cannot delete an approved submission");

                // Delete recording if exists
                if (submission.RecordingId.HasValue)
                {
                    var recording = await _recordingRepository.GetByIdAsync(submission.RecordingId.Value);
                    if (recording != null)
                    {
                        await _recordingRepository.DeleteAsync(recording.Id);
                    }
                }

                // Delete submission
                await _submissionRepository.DeleteAsync(submissionId);
                return Result<bool>.Success(true, "Submission deleted successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure($"Failed to delete submission: {ex.Message}");
            }
        }
        public async Task<Result<bool>> DoneStageOneAsync(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (submission == null)
                    return Result<bool>.Failure("NOT_FOUND", "Submission not found", "NotFound");
                if (submission.CurrentStage != 0) // Screening
                    return Result<bool>.Failure("INVALID_STAGE_TRANSITION", "Invalid stage transition", "BadRequest");
                
                submission.CurrentStage = 1; // Move to Verification
                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepo.UpdateAsync(submission);
                return Result<bool>.Success(true, "Submission moved to the next stage successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure("INTERNAL_ERROR", $"Failed to move submission to the next stage: {ex.Message}");
            }
        }
        public async Task<Result<bool>> DoneStageTwoAsync(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (submission == null)
                    return Result<bool>.Failure("NOT_FOUND", "Submission not found", "NotFound");
                if (submission.CurrentStage != 1) // Verification
                    return Result<bool>.Failure("INVALID_STAGE_TRANSITION", "Invalid stage transition", "BadRequest");
                
                submission.CurrentStage = 2; // Move to Published
                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepo.UpdateAsync(submission);
                return Result<bool>.Success(true, "Submission moved to the next stage successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure("INTERNAL_ERROR", $"Failed to move submission to the next stage: {ex.Message}");
            }
        }

        public async Task<Result<bool>> UpdateStageAsync(Guid submissionId, SubmissionStage newStage, string note)
        {
            try
            {
                var submission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (submission == null)
                    return Result<bool>.Failure("NOT_FOUND", "Submission not found", "NotFound");

                if (submission.CurrentStage == 0 && (int)newStage != 1)
                    return Result<bool>.Failure("INVALID_STAGE_TRANSITION", "Invalid stage transition", "BadRequest");
                
                if (submission.CurrentStage == 1 && (int)newStage != 2)
                    return Result<bool>.Failure("INVALID_STAGE_TRANSITION", "Invalid stage transition", "BadRequest");

                submission.CurrentStage = (int)newStage;
                if (!string.IsNullOrEmpty(note))
                {
                    submission.Notes = string.IsNullOrEmpty(submission.Notes) ? note : submission.Notes + "\n" + note;
                }
                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepo.UpdateAsync(submission);

                return Result<bool>.Success(true, "Stage updated successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure("INTERNAL_ERROR", ex.Message);
            }
        }
        public async Task<Result<IEnumerable<GetRelatedSubmissionDto>>> GetRelatedSubmissionsAsync(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));

                // Get the current submission and its recording
                var currentSubmission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (currentSubmission == null)
                    return Result<IEnumerable<GetRelatedSubmissionDto>>.Failure("Submission not found");

                if (currentSubmission.RecordingId == null)
                    return Result<IEnumerable<GetRelatedSubmissionDto>>.Failure("Recording not found for this submission");

                var currentRecording = currentSubmission.Recording;
                if (currentRecording == null)
                    return Result<IEnumerable<GetRelatedSubmissionDto>>.Failure("Recording data not available");

                // Get all submissions with their recordings
                var allSubmissions = await _submissionRepo.GetAllSubmissionsAsync();

                // Filter and score related submissions
                var relatedSubmissions = allSubmissions
                    .Where(s => s.RecordingId.HasValue && s.RecordingId != currentRecording.Id && s.Recording != null)
                    .Select(submission =>
                    {
                        var recording = submission.Recording;
                        int score = 0;

                        // Scoring logic
                        // +3 if same MusicalScale
                        if (currentRecording.MusicalScaleId.HasValue &&
                            recording.MusicalScaleId == currentRecording.MusicalScaleId)
                            score += 3;

                        // +3 if same VocalStyle
                        if (currentRecording.VocalStyleId.HasValue &&
                            recording.VocalStyleId == currentRecording.VocalStyleId)
                            score += 3;

                        // +2 if same instrument
                        if (currentRecording.RecordingInstruments != null &&
                            recording.RecordingInstruments != null)
                        {
                            var currentInstrumentIds = currentRecording.RecordingInstruments
                                .Select(ri => ri.InstrumentId)
                                .ToHashSet();
                            var recordingInstrumentIds = recording.RecordingInstruments
                                .Select(ri => ri.InstrumentId)
                                .ToHashSet();

                            if (currentInstrumentIds.Overlaps(recordingInstrumentIds))
                                score += 2;
                        }

                        // +1 if same ethnicGroup
                        if (currentRecording.EthnicGroupId.HasValue &&
                            recording.EthnicGroupId == currentRecording.EthnicGroupId)
                            score += 1;

                        // +1 if same ceremony
                        if (currentRecording.CeremonyId.HasValue &&
                            recording.CeremonyId == currentRecording.CeremonyId)
                            score += 1;

                        // Map to DTO
                        var dto = _mapper.Map<GetRelatedSubmissionDto>(submission);
                        dto.RelatedScore = score;

                        return new { submission, dto, score, recording };
                    })
                    // Filter by title similarity
                    .Where(x => !string.IsNullOrEmpty(x.dto.Recording?.Title) &&
                                !string.IsNullOrEmpty(currentRecording.Title) &&
                                IsTitleSimilar(currentRecording.Title, x.recording.Title))
                    // Sort by score descending
                    .OrderByDescending(x => x.score)
                    // Limit to 10 results
                    .Take(10)
                    .Select(x => x.dto)
                    .ToList();

                return Result<IEnumerable<GetRelatedSubmissionDto>>.Success(
                    relatedSubmissions,
                    $"Retrieved {relatedSubmissions.Count} related submissions");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<GetRelatedSubmissionDto>>.Failure($"Failed to retrieve related submissions: {ex.Message}");
            }
        }

        /// <summary>
        /// Calculates string similarity using Levenshtein distance algorithm
        /// Returns true if similarity is above 60%
        /// </summary>
        public bool IsTitleSimilar(string title1, string title2, double similarityThreshold = 0.6)
        {
            if (string.IsNullOrWhiteSpace(title1) || string.IsNullOrWhiteSpace(title2))
                return false;

            // Xử lý chuỗi: Cắt khoảng trắng, đưa về chữ thường và xóa dấu tiếng Việt
            string s1 = NormalizeVietnameseString(title1);
            string s2 = NormalizeVietnameseString(title2);

            // Trùng khớp hoàn toàn sau khi bỏ dấu
            if (s1 == s2)
                return true;

            // Chỉ dùng Contains nếu chuỗi tìm kiếm có độ dài tương đối (tránh lỗi gõ 1-2 ký tự)
            string shorter = s1.Length < s2.Length ? s1 : s2;
            string longer = s1.Length >= s2.Length ? s1 : s2;

            if (shorter.Length >= 3 && longer.Contains(shorter))
                return true;

            // Tính toán độ tương đồng Levenshtein
            int distance = LevenshteinDistance(s1, s2);
            int maxLength = Math.Max(s1.Length, s2.Length);
            double similarity = 1.0 - ((double)distance / maxLength);

            return similarity >= similarityThreshold;
        }
        /// <summary>
        /// Hàm chuyển đổi chuỗi tiếng Việt có dấu thành không dấu và chuẩn hóa Unicode
        /// </summary>
        private string NormalizeVietnameseString(string text)
        {
            // Đưa về chữ thường và cắt khoảng trắng 2 đầu
            text = text.ToLower().Trim();

            // Xử lý riêng chữ 'đ' của tiếng Việt
            text = text.Replace('đ', 'd');

            // Phân rã chuỗi để tách các dấu thanh (huyền, sắc, hỏi, ngã, nặng) ra khỏi ký tự gốc
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder();

            foreach (var c in normalizedString)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                // Bỏ qua các ký tự là dấu thanh
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }

            // Ép ngược lại chuẩn Unicode dựng sẵn
            return stringBuilder.ToString().Normalize(NormalizationForm.FormC);
        }
        /// <summary>
        /// Calculates the Levenshtein distance between two strings
        /// </summary>
        private int LevenshteinDistance(string s1, string s2)
        {
            int len1 = s1.Length;
            int len2 = s2.Length;
            int[,] dp = new int[len1 + 1, len2 + 1];

            for (int i = 0; i <= len1; i++)
                dp[i, 0] = i;

            for (int j = 0; j <= len2; j++)
                dp[0, j] = j;

            for (int i = 1; i <= len1; i++)
            {
                for (int j = 1; j <= len2; j++)
                {
                    int cost = s1[i - 1] == s2[j - 1] ? 0 : 1;

                    dp[i, j] = Math.Min(
                        Math.Min(
                            dp[i - 1, j] + 1,      // Deletion
                            dp[i, j - 1] + 1),     // Insertion
                        dp[i - 1, j - 1] + cost   // Substitution
                    );
                }
            }

            return dp[len1, len2];
        }
    }
}
