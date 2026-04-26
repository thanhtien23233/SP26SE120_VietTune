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
    public class RecordingService : GenericService<Recording, RecordingDto>, IRecordingService
    {
        private readonly IRecordingRepository _recordingRepository;
        private readonly IMapper _mapper;
        private readonly ICommuneRepository _communeRepository;
        private readonly IEthnicGroupRepository _ethnicGroupRepository;
        private readonly ICeremonyRepository _ceremonyRepository;
        private readonly IMusicalScaleRepository _musicalScaleRepository;
        private readonly IInstrumentRepository _instrumentRepository;
        private readonly IVocalStyleRepository _vocalStyleRepository;
        private readonly ISubmissionRepository _submissionRepository;
        private readonly INotificationService _notificationService;
        private readonly IUserRepository _userRepository;
        private readonly IVectorEmbeddingService _vectorEmbeddingService;
        private readonly ILogger<RecordingService> _logger;
        public RecordingService(IRecordingRepository repository, IMapper mapper, ICommuneRepository communeRepository, IEthnicGroupRepository ethnicGroupRepository, ICeremonyRepository ceremonyRepository, IMusicalScaleRepository musicalScaleRepository, IInstrumentRepository instrumentRepository, IVocalStyleRepository vocalStyleRepository, ISubmissionRepository submissionRepository, INotificationService notificationService, IUserRepository userRepository, IVectorEmbeddingService vectorEmbeddingService, ILogger<RecordingService> logger)
            : base(repository, mapper)
        {
            _recordingRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _submissionRepository = submissionRepository ?? throw new ArgumentNullException(nameof(submissionRepository));
            _notificationService = notificationService;
            _userRepository = userRepository;
            _communeRepository = communeRepository;
            _ethnicGroupRepository = ethnicGroupRepository;
            _ceremonyRepository = ceremonyRepository;
            _musicalScaleRepository = musicalScaleRepository;
            _instrumentRepository = instrumentRepository;
            _vocalStyleRepository = vocalStyleRepository;
            _vectorEmbeddingService = vectorEmbeddingService;
            _logger = logger;
        }
        public async Task<Result<RecordingDto>> UploadRecordInfo(RecordingDto recordingDto, Guid recordingId)
        {
            try
            {
                if (recordingDto == null)
                    throw new ArgumentNullException(nameof(recordingDto), "Recording data cannot be null");

                // Check if recording exists
                var existingRecording = await _recordingRepository.GetByIdAsync(recordingId);
                if (existingRecording == null)
                    throw new ArgumentException("Recording not found", nameof(recordingId));

                var communeExists = recordingDto.CommuneId.HasValue && await _communeRepository.GetByIdAsync(recordingDto.CommuneId.Value) != null;
                if (recordingDto.CommuneId.HasValue && !communeExists)
                    throw new ArgumentException("Invalid commune ID", nameof(recordingDto.CommuneId));
                var ethnicGroupExists = recordingDto.EthnicGroupId.HasValue && await _ethnicGroupRepository.GetByIdAsync(recordingDto.EthnicGroupId.Value) != null;
                if (recordingDto.EthnicGroupId.HasValue && !ethnicGroupExists)
                    throw new ArgumentException("Invalid ethnic group ID", nameof(recordingDto.EthnicGroupId));
                var ceremonyExists = recordingDto.CeremonyId.HasValue && await _ceremonyRepository.GetByIdAsync(recordingDto.CeremonyId.Value) != null;
                if (recordingDto.CeremonyId.HasValue && !ceremonyExists)
                    throw new ArgumentException("Invalid ceremony ID", nameof(recordingDto.CeremonyId));
                var musicalScaleExists = recordingDto.MusicalScaleId.HasValue && await _musicalScaleRepository.GetByIdAsync(recordingDto.MusicalScaleId.Value) != null;
                if (recordingDto.MusicalScaleId.HasValue && !musicalScaleExists)
                    throw new ArgumentException("Invalid musical scale ID", nameof(recordingDto.MusicalScaleId));
                var vocalStyleExists = recordingDto.VocalStyleId.HasValue && await _vocalStyleRepository.GetByIdAsync(recordingDto.VocalStyleId.Value) != null;
                if (recordingDto.VocalStyleId.HasValue && !vocalStyleExists)
                    throw new ArgumentException("Invalid vocal style ID", nameof(recordingDto.VocalStyleId));

                // Validate all instruments exist
                if (recordingDto.InstrumentIds != null && recordingDto.InstrumentIds.Any())
                {
                    foreach (var instrumentId in recordingDto.InstrumentIds)
                    {
                        var instrumentExists = await _instrumentRepository.GetByIdAsync(instrumentId) != null;
                        if (!instrumentExists)
                            throw new ArgumentException($"Invalid instrument ID: {instrumentId}", nameof(recordingDto.InstrumentIds));
                    }
                }

                // Update only the properties from DTO, preserving critical fields
                existingRecording.Title = recordingDto.Title;
                existingRecording.Description = recordingDto.Description;
                existingRecording.VideoFileUrl = recordingDto.VideoFileUrl;
                existingRecording.AudioFormat = recordingDto.AudioFormat;
                existingRecording.DurationSeconds = recordingDto.DurationSeconds;
                existingRecording.FileSizeBytes = recordingDto.FileSizeBytes;
                existingRecording.CommuneId = recordingDto.CommuneId;
                existingRecording.EthnicGroupId = recordingDto.EthnicGroupId;
                existingRecording.CeremonyId = recordingDto.CeremonyId;
                existingRecording.VocalStyleId = recordingDto.VocalStyleId;
                existingRecording.MusicalScaleId = recordingDto.MusicalScaleId;
                existingRecording.PerformanceContext = recordingDto.PerformanceContext;
                existingRecording.LyricsOriginal = recordingDto.LyricsOriginal;
                existingRecording.LyricsVietnamese = recordingDto.LyricsVietnamese;
                existingRecording.PerformerName = recordingDto.PerformerName;
                existingRecording.PerformerAge = recordingDto.PerformerAge;
                existingRecording.RecordingDate = recordingDto.RecordingDate;
                existingRecording.GpsLatitude = recordingDto.GpsLatitude;
                existingRecording.GpsLongitude = recordingDto.GpsLongitude;
                existingRecording.Tempo = recordingDto.Tempo;
                existingRecording.KeySignature = recordingDto.KeySignature;
                existingRecording.UpdatedAt = DateTime.UtcNow;
                existingRecording.Status = SubmissionStatus.Pending;

                // Update instruments
                if (recordingDto.InstrumentIds != null && recordingDto.InstrumentIds.Any())
                {
                    // Clear old instruments
                    existingRecording.RecordingInstruments?.Clear();

                    // Add new instruments
                    var newInstruments = recordingDto.InstrumentIds.Select(instrumentId => new RecordingInstrument
                    {
                        RecordingId = recordingId,
                        InstrumentId = instrumentId
                    }).ToList();

                    existingRecording.RecordingInstruments = newInstruments;
                }
                else
                {
                    // If no instruments provided, clear them
                    existingRecording.RecordingInstruments?.Clear();
                }

                var updatedRecording = await _recordingRepository.UpdateAsync(existingRecording);

                // Gửi thông báo cho toàn bộ Expert khi status là Pending (1)
                if (existingRecording.Status == SubmissionStatus.Pending)
                {
                    var experts = (await _userRepository.GetAllAsync()).Where(u => u.Role == "Expert");
                    foreach (var expert in experts)
                    {
                        await _notificationService.SendNotificationAsync(
                            expert.Id,
                            "Bản ghi mới cần duyệt",
                            $"Bản ghi '{existingRecording.Title}' vừa được tải lên và đang chờ duyệt.",
                            "NewRecordingPending",
                            "Recording",
                            existingRecording.Id
                        );
                    }
                }

                // <<< THÊM: Re-generate embedding nếu bản ghi đã được duyệt (Published) >>>
                // LƯU Ý: Ở trên đã set Pending, nên chỗ này chỉ chạy nếu logic bên trên thay đổi hoặc status được giữ nguyên.
                if (existingRecording.Status == SubmissionStatus.Approved)
                {
                    try
                    {
                        await _vectorEmbeddingService.GenerateAndSaveAsync(existingRecording.Id);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to regenerate embedding for updated Recording {Id}", existingRecording.Id);
                    }
                }

                var addedDto = _mapper.Map<RecordingDto>(updatedRecording);
                return Result<RecordingDto>.Success(addedDto, "Recording information uploaded successfully");
            }
            catch (Exception ex)
            {
                return Result<RecordingDto>.Failure($"Failed to upload recording information: {ex.Message}");
            }
        }
        /// <summary>
        /// Search recordings by title
        /// </summary>
        public async Task<Result<IEnumerable<GetRecordingDto>>> SearchByTitleAsync(string title)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(title))
                    throw new ArgumentException("Search title cannot be empty", nameof(title));

                var recordings = await _recordingRepository.SearchByTitle(title);
                var dtos = _mapper.Map<List<GetRecordingDto>>(recordings);
                return Result<IEnumerable<GetRecordingDto>>.Success(dtos, $"Found {dtos.Count} recordings");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<GetRecordingDto>>.Failure($"Failed to search recordings by title: {ex.Message}");
            }
        }

        /// <summary>
        /// Search recordings by filter
        /// </summary>
        public async Task<Result<RecordingSearchResultDto>> SearchByFilterAsync(RecordingFilterDto filter)
        {
            try
            {
                if (filter == null)
                    throw new ArgumentNullException(nameof(filter), "Filter cannot be null");

                var (recordings, total) = await _recordingRepository.SearchByFilterAsync(
                    filter.EthnicGroupId,
                    filter.InstrumentId,
                    filter.CeremonyId,
                    filter.RegionCode,
                    filter.CommuneId,
                    filter.Page,
                    filter.PageSize,
                    filter.SortOrder ?? "desc");

                var dtos = _mapper.Map<List<GetRecordingDto>>(recordings);
                var result = new RecordingSearchResultDto
                {
                    Data = dtos,
                    Total = total
                };

                return Result<RecordingSearchResultDto>.Success(
                    result,
                    $"Found {total} recordings, returned {dtos.Count}");
            }
            catch (Exception ex)
            {
                return Result<RecordingSearchResultDto>.Failure($"Failed to search recordings by filter: {ex.Message}");
            }
        }

        public async Task<Result<IEnumerable<GetRecordingDto>>> SearchByTitleApprovedAsync(string title)
        {
            var result = await SearchByTitleAsync(title);
            if (result.IsSuccess)
            {
                var filtered = result.Data.Where(r => r.Status == SubmissionStatus.Approved).ToList();
                return Result<IEnumerable<GetRecordingDto>>.Success(filtered, $"Found {filtered.Count} approved recordings");
            }
            return result;
        }

        public async Task<Result<RecordingSearchResultDto>> SearchByFilterApprovedAsync(RecordingFilterDto filter)
        {
            var result = await SearchByFilterAsync(filter);
            if (result.IsSuccess)
            {
                var filteredData = result.Data.Data.Where(r => r.Status == SubmissionStatus.Approved).ToList();
                result.Data.Data = filteredData;
                result.Data.Total = filteredData.Count; 
                return Result<RecordingSearchResultDto>.Success(result.Data, $"Found {filteredData.Count} approved recordings");
            }
            return result;
        }

        /// <summary>
        /// Get recordings by ethnic group
        /// </summary>
        public async Task<ServiceResponse<List<RecordingDto>>> GetByEthnicGroupAsync(Guid ethnicGroupId)
        {
            try
            {
                if (ethnicGroupId == Guid.Empty)
                    throw new ArgumentException("Ethnic group id cannot be empty", nameof(ethnicGroupId));

                var recordings = await _recordingRepository.GetAsync(r => r.EthnicGroupId == ethnicGroupId);
                var dtos = _mapper.Map<List<RecordingDto>>(recordings);
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} recordings"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get recordings by commune
        /// </summary>
        public async Task<ServiceResponse<List<RecordingDto>>> GetByCommuneAsync(Guid communeId)
        {
            try
            {
                if (communeId == Guid.Empty)
                    throw new ArgumentException("Commune id cannot be empty", nameof(communeId));

                var recordings = await _recordingRepository.GetAsync(r => r.CommuneId == communeId);
                var dtos = _mapper.Map<List<RecordingDto>>(recordings);
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} recordings"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get recordings by performer name
        /// </summary>
        public async Task<ServiceResponse<List<RecordingDto>>> GetByPerformerAsync(string performerName)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(performerName))
                    throw new ArgumentException("Performer name cannot be empty", nameof(performerName));

                var recordings = await _recordingRepository.GetAsync(r =>
                    r.PerformerName != null && r.PerformerName.Contains(performerName));
                var dtos = _mapper.Map<List<RecordingDto>>(recordings);
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} recordings"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get recordings recorded on or after a specific date
        /// </summary>
        public async Task<ServiceResponse<List<RecordingDto>>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            try
            {
                if (startDate > endDate)
                    throw new ArgumentException("Start date must be before end date");

                var recordings = await _recordingRepository.GetAsync(r =>
                    r.RecordingDate.HasValue && r.RecordingDate >= startDate && r.RecordingDate <= endDate);
                var dtos = _mapper.Map<List<RecordingDto>>(recordings);
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} recordings in date range"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get recordings by ceremony
        /// </summary>
        public async Task<ServiceResponse<List<RecordingDto>>> GetByCeremonyAsync(Guid ceremonyId)
        {
            try
            {
                if (ceremonyId == Guid.Empty)
                    throw new ArgumentException("Ceremony id cannot be empty", nameof(ceremonyId));

                var recordings = await _recordingRepository.GetAsync(r => r.CeremonyId == ceremonyId);
                var dtos = _mapper.Map<List<RecordingDto>>(recordings);
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} recordings"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get most recent recordings
        /// </summary>
        public async Task<ServiceResponse<List<RecordingDto>>> GetRecentAsync(int count = 10)
        {
            try
            {
                if (count <= 0)
                    throw new ArgumentException("Count must be greater than 0", nameof(count));

                var recordings = await _recordingRepository.GetAllAsync();
                var recentRecordings = recordings
                    .OrderByDescending(r => r.CreatedAt)
                    .Take(count)
                    .ToList();

                var dtos = _mapper.Map<List<RecordingDto>>(recentRecordings);
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Retrieved {dtos.Count} recent recordings"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<RecordingDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<PagedResponse<GetRecordingDto>> GetPaginatedApprovedAsync(int page, int pageSize)
        {
            var (items, totalItems) = await _recordingRepository.GetPaginatedAsync(r => r.Status == SubmissionStatus.Approved, page, pageSize);
            return new PagedResponse<GetRecordingDto>
            {
                Success = true,
                Data = _mapper.Map<List<GetRecordingDto>>(items),
                Page = page,
                PageSize = pageSize,
                Total = totalItems
            };
        }

        public async Task<PagedResponse<GetRecordingDto>> GetAllRecordingsAsync(int page, int pageSize)
        {
            try
            {
                if (page < 1)
                    throw new ArgumentException("Page number must be greater than 0", nameof(page));
                if (pageSize < 1)
                    throw new ArgumentException("Page size must be greater than 0", nameof(pageSize));

                var (entities, total) = await _recordingRepository.GetPaginatedAsync(page, pageSize);
                var dtos = _mapper.Map<List<GetRecordingDto>>(entities);

                return new PagedResponse<GetRecordingDto>
                {
                    Success = true,
                    Data = dtos,
                    Total = total,
                    Page = page,
                    PageSize = pageSize,
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new PagedResponse<GetRecordingDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<ServiceResponse<GetRecordingDto>> GetRecordingByIdAsync(Guid id)
        {
            try
            {
                if (id == Guid.Empty)
                    throw new ArgumentException("Id cannot be empty", nameof(id));

                var entity = await _recordingRepository.GetByIdAsync(id);
                if (entity == null)
                    return new ServiceResponse<GetRecordingDto>
                    {
                        Success = false,
                        Message = "Entity not found"
                    };

                var dto = _mapper.Map<GetRecordingDto>(entity);
                return new ServiceResponse<GetRecordingDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<GetRecordingDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<ServiceResponse<GetRecordingDto>> GetByIdApprovedAsync(Guid id)
        {
            var recording = await _recordingRepository.GetFirstOrDefaultAsync(r => r.Id == id && r.Status == SubmissionStatus.Approved);
            if (recording == null)
            {
                return new ServiceResponse<GetRecordingDto> { Success = false, Message = "Recording not found or not available" };
            }
            return new ServiceResponse<GetRecordingDto> { Success = true, Data = _mapper.Map<GetRecordingDto>(recording) };
        }

        public override async Task<ServiceResponse<RecordingDto>> UpdateAsync(Guid id, RecordingDto dto)
        {
            var response = await base.UpdateAsync(id, dto);
            if (response.Success && response.Data != null)
            {
                var recording = await _recordingRepository.GetByIdAsync(id);
                if (recording != null && recording.Status == SubmissionStatus.Approved)
                {
                    try
                    {
                        await _vectorEmbeddingService.GenerateAndSaveAsync(id);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to regenerate embedding for updated Recording {Id} in base update", id);
                    }
                }
            }
            return response;
        }
    }
}
