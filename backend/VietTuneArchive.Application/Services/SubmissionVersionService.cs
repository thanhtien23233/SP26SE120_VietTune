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
        private readonly IMapper _mapper;

        public SubmissionVersionService(ISubmissionVersionRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _versionRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        }

        /// <summary>
        /// Get all versions of a submission
        /// </summary>
        public async Task<ServiceResponse<List<SubmissionVersionDto>>> GetBySubmissionIdAsync(Guid submissionId)
        {
            try
            {
                if (submissionId == Guid.Empty)
                    return new ServiceResponse<List<SubmissionVersionDto>>
                    {
                        Success = false,
                        Message = "Submission ID cannot be empty"
                    };

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
                    return new ServiceResponse<SubmissionVersionDto>
                    {
                        Success = false,
                        Message = "Submission ID cannot be empty"
                    };

                var versions = await _versionRepository.GetAsync(v => v.SubmissionId == submissionId);
                var latestVersion = versions.OrderByDescending(v => v.VersionNumber).FirstOrDefault();

                if (latestVersion == null)
                    return new ServiceResponse<SubmissionVersionDto>
                    {
                        Success = false,
                        Message = "No versions found for this submission"
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
        /// Create new version with auto-increment version number
        /// </summary>
        public async Task<ServiceResponse<SubmissionVersionDto>> CreateVersionAsync(CreateSubmissionVersionDto createDto)
        {
            try
            {
                if (createDto == null)
                    return new ServiceResponse<SubmissionVersionDto>
                    {
                        Success = false,
                        Message = "Create DTO cannot be null"
                    };

                if (createDto.SubmissionId == Guid.Empty)
                    return new ServiceResponse<SubmissionVersionDto>
                    {
                        Success = false,
                        Message = "Submission ID is required"
                    };

                // Get next version number
                var versions = await _versionRepository.GetAsync(v => v.SubmissionId == createDto.SubmissionId);
                var nextVersionNumber = (versions.Max(v => (int?)v.VersionNumber) ?? 0) + 1;

                var version = new SubmissionVersion
                {
                    Id = Guid.NewGuid(),
                    SubmissionId = createDto.SubmissionId,
                    VersionNumber = nextVersionNumber,
                    ChangesJson = createDto.ChangesJson,
                    CreatedAt = DateTime.UtcNow
                };

                var createdVersion = await _versionRepository.AddAsync(version);
                var dto = _mapper.Map<SubmissionVersionDto>(createdVersion);

                return new ServiceResponse<SubmissionVersionDto>
                {
                    Success = true,
                    Data = dto,
                    Message = $"Version {nextVersionNumber} created successfully"
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
    }
}
