using AutoMapper;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Domain.IRepositories;

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
        private readonly IVectorEmbeddingService _vectorEmbeddingService;
        private readonly ILogger<SubmissionService2> _logger;
        public SubmissionService2(IGenericRepository<Submission> repository, ISubmissionRepository submissionRepo, IMapper mapper, IUserRepository userRepository, IRecordingRepository recordingRepository, INotificationService notificationService, IVectorEmbeddingService vectorEmbeddingService, ILogger<SubmissionService2> logger)
            : base(repository, mapper)
        {
            _submissionRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _submissionRepo = submissionRepo ?? throw new ArgumentNullException(nameof(submissionRepo));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _recordingRepository = recordingRepository ?? throw new ArgumentNullException(nameof(recordingRepository));
            _notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
            _vectorEmbeddingService = vectorEmbeddingService ?? throw new ArgumentNullException(nameof(vectorEmbeddingService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
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
                    CurrentStage = 0,
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
                    return Result<bool>.Failure("Associated recording not found");
                if (recording.Status != SubmissionStatus.Pending)
                    return Result<bool>.Failure("Recording is not in a state that can be submitted");

                submission.Status = SubmissionStatus.Pending;
                submission.UpdatedAt = DateTime.UtcNow;
                await _submissionRepo.UpdateAsync(submission);
                return Result<bool>.Success(true, "Submission confirmed successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure($"Failed to confirm submission: {ex.Message}");
            }
        }

        public async Task<Result<bool>> EditRequest (Guid submissionId, Guid reviewerId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(submissionId);
                if (submission == null)
                    return Result<bool>.Failure("Submission not found");
                if (submission.Status != SubmissionStatus.Pending)
                    return Result<bool>.Failure("Submission is not in a state that can be marked for edit");
                var recording = await _recordingRepository.GetByIdAsync(submission.RecordingId.Value);
                if (recording == null)
                    return Result<bool>.Failure("Associated recording not found");
                if (recording.Status != SubmissionStatus.Pending)
                    return Result<bool>.Failure("Recording is not in a state that can be marked for edit");

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
                return Result<bool>.Failure($"Failed to mark submission as requires edit: {ex.Message}");
            }
        }

        public async Task<Result<bool>> ConfirmEdit (Guid SubmissionId)
        {
            try
            {
                if (SubmissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(SubmissionId));
                var submission = await _submissionRepo.GetSubmissionByIdAsync(SubmissionId);
                if (submission == null)
                    return Result<bool>.Failure("Submission not found");
                if (submission.Status != SubmissionStatus.UpdateRequested)
                    return Result<bool>.Failure("Submission is not in a state that can be confirmed for edit");
                var recording = await _recordingRepository.GetByIdAsync(submission.RecordingId.Value);
                if (recording == null)
                    return Result<bool>.Failure("Associated recording not found");
                if (recording.Status != SubmissionStatus.UpdateRequested)
                    return Result<bool>.Failure("Recording is not in a state that can be confirmed for edit");

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
                return Result<bool>.Failure($"Failed to confirm submission edit: {ex.Message}");
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
                    return Result<bool>.Failure("Submission not found");
                if (submission.Status != SubmissionStatus.Pending && submission.Status != SubmissionStatus.UpdateRequested)
                    return Result<bool>.Failure("Submission is not in a state that can be rejected");
                var recording = await _recordingRepository.GetByIdAsync(submission.RecordingId.Value);
                if (recording == null)
                    return Result<bool>.Failure("Associated recording not found");
                if (recording.Status != SubmissionStatus.Pending && recording.Status != SubmissionStatus.UpdateRequested)
                    return Result<bool>.Failure("Recording is not in a state that can be rejected");

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
                return Result<bool>.Failure($"Failed to reject submission: {ex.Message}");
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
                    return Result<bool>.Failure("Submission not found");
                if (submission.Status != SubmissionStatus.Pending)
                    return Result<bool>.Failure("Submission is not in a state that can be approved");
                var recording = await _recordingRepository.GetByIdAsync(submission.RecordingId.Value);
                if (recording == null)
                    return Result<bool>.Failure("Associated recording not found");
                if (recording.Status != SubmissionStatus.Pending)
                    return Result<bool>.Failure("Recording is not in a state that can be approved");

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
                    await _vectorEmbeddingService.GenerateAndSaveAsync(recording.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to generate embedding for newly approved Recording {Id}", recording.Id);
                }

                return Result<bool>.Success(true, "Submission approved successfully");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure($"Failed to approve submission: {ex.Message}");
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
    }
}
