using AutoMapper;
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
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;
        private readonly IRecordingRepository _recordingRepository;
        public SubmissionService2(IGenericRepository<Submission> repository, IMapper mapper, IUserRepository userRepository, IRecordingRepository recordingRepository)
            : base(repository, mapper)
        {
            _submissionRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _recordingRepository = recordingRepository ?? throw new ArgumentNullException(nameof(recordingRepository));
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
                    Status = SubmissionStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };
                await _recordingRepository.AddAsync(recording);

                var submission = new Submission
                {
                    Id = Guid.NewGuid(),
                    RecordingId = recording.Id,
                    Recording = recording,
                    CurrentStage = 0,
                    Status = SubmissionStatus.Pending,
                    SubmittedAt = DateTime.UtcNow,
                    ContributorId = dto.UploadedById
                };
                await _submissionRepository.AddAsync(submission);
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
    }
}
