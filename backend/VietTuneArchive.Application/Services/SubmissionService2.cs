using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class SubmissionService2 : GenericService<Submission, SubmissionDto>, ISubmissionService2
    {
        private readonly IGenericRepository<Submission> _submissionRepository;

        public SubmissionService2(IGenericRepository<Submission> repository, IMapper mapper)
            : base(repository, mapper)
        {
            _submissionRepository = repository ?? throw new ArgumentNullException(nameof(repository));
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
        /// Get submissions by status
        /// </summary>
        public async Task<ServiceResponse<List<SubmissionDto>>> GetByStatusAsync(int status)
        {
            try
            {
                var submissions = await _submissionRepository.GetAsync(s => s.Status == status);
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
