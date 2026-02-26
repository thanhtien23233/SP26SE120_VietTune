using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class SubmissionVersionService : GenericService<SubmissionVersion, SubmissionVersionDto>, ISubmissionVersionService
    {
        private readonly ISubmissionVersionRepository _versionRepository;

        public SubmissionVersionService(ISubmissionVersionRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _versionRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get all versions of a submission
        /// </summary>
        public async Task<ServiceResponse<List<SubmissionVersionDto>>> GetBySubmissionAsync(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));

                var versions = await _versionRepository.GetAsync(v => v.SubmissionId == submissionId);
                var dtos = _mapper.Map<List<SubmissionVersionDto>>(versions.OrderBy(v => v.VersionNumber).ToList());
                return new ServiceResponse<List<SubmissionVersionDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} versions"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<SubmissionVersionDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get latest version of a submission
        /// </summary>
        public async Task<ServiceResponse<SubmissionVersionDto>> GetLatestVersionAsync(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));

                var versions = await _versionRepository.GetAsync(v => v.SubmissionId == submissionId);
                var latestVersion = versions.OrderByDescending(v => v.VersionNumber).FirstOrDefault();

                if (latestVersion == null)
                    return new ServiceResponse<SubmissionVersionDto>
                    {
                        Success = false,
                        Message = "No versions found"
                    };

                var dto = _mapper.Map<SubmissionVersionDto>(latestVersion);
                return new ServiceResponse<SubmissionVersionDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Retrieved latest version successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<SubmissionVersionDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get specific version
        /// </summary>
        public async Task<ServiceResponse<SubmissionVersionDto>> GetVersionAsync(Guid submissionId, int versionNumber)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));

                if (versionNumber <= 0)
                    throw new ArgumentException("Version number must be greater than 0", nameof(versionNumber));

                var version = await _versionRepository.GetFirstOrDefaultAsync(v => 
                    v.SubmissionId == submissionId && v.VersionNumber == versionNumber);

                if (version == null)
                    return new ServiceResponse<SubmissionVersionDto>
                    {
                        Success = false,
                        Message = $"Version {versionNumber} not found"
                    };

                var dto = _mapper.Map<SubmissionVersionDto>(version);
                return new ServiceResponse<SubmissionVersionDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Retrieved version successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<SubmissionVersionDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get version count for a submission
        /// </summary>
        public async Task<ServiceResponse<int>> GetVersionCountAsync(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    throw new ArgumentException("Submission id cannot be empty", nameof(submissionId));

                var count = await _versionRepository.CountAsync(v => v.SubmissionId == submissionId);
                return new ServiceResponse<int>
                {
                    Success = true,
                    Data = count,
                    Message = "Version count retrieved successfully"
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
