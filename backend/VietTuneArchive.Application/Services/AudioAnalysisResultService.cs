using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class AudioAnalysisResultService : GenericService<AudioAnalysisResult, AudioAnalysisResultDto>, IAudioAnalysisResultService
    {
        private readonly IAudioAnalysisResultRepository _analysisRepository;

        public AudioAnalysisResultService(IAudioAnalysisResultRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _analysisRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get analysis result by recording
        /// </summary>
        public async Task<ServiceResponse<AudioAnalysisResultDto>> GetByRecordingAsync(Guid recordingId)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty", nameof(recordingId));

                var result = await _analysisRepository.GetFirstOrDefaultAsync(ar => ar.RecordingId == recordingId);
                if (result == null)
                    return new ServiceResponse<AudioAnalysisResultDto>
                    {
                        Success = false,
                        Message = "Analysis result not found"
                    };

                var dto = _mapper.Map<AudioAnalysisResultDto>(result);
                return new ServiceResponse<AudioAnalysisResultDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<AudioAnalysisResultDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get results by detected ethnic group
        /// </summary>
        public async Task<ServiceResponse<List<AudioAnalysisResultDto>>> GetByDetectedEthnicGroupAsync(string ethnicGroup)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(ethnicGroup))
                    throw new ArgumentException("Ethnic group cannot be empty", nameof(ethnicGroup));

                var results = await _analysisRepository.GetAsync(ar => 
                    ar.SuggestedEthnicGroup == ethnicGroup);
                var dtos = _mapper.Map<List<AudioAnalysisResultDto>>(results);
                return new ServiceResponse<List<AudioAnalysisResultDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} results"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AudioAnalysisResultDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get results with detected tempo
        /// </summary>
        public async Task<ServiceResponse<List<AudioAnalysisResultDto>>> GetWithDetectedTempoAsync()
        {
            try
            {
                var results = await _analysisRepository.GetAsync(ar => ar.DetectedTempo.HasValue);
                var dtos = _mapper.Map<List<AudioAnalysisResultDto>>(results);
                return new ServiceResponse<List<AudioAnalysisResultDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = "Retrieved results with detected tempo successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AudioAnalysisResultDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get results with detected key
        /// </summary>
        public async Task<ServiceResponse<List<AudioAnalysisResultDto>>> GetWithDetectedKeyAsync()
        {
            try
            {
                var results = await _analysisRepository.GetAsync(ar => ar.DetectedKey != null);
                var dtos = _mapper.Map<List<AudioAnalysisResultDto>>(results);
                return new ServiceResponse<List<AudioAnalysisResultDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = "Retrieved results with detected key successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AudioAnalysisResultDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get recently analyzed recordings
        /// </summary>
        public async Task<ServiceResponse<List<AudioAnalysisResultDto>>> GetRecentlyAnalyzedAsync(int count = 10)
        {
            try
            {
                if (count <= 0)
                    throw new ArgumentException("Count must be greater than 0", nameof(count));

                var results = await _analysisRepository.GetAllAsync();
                var recent = results
                    .OrderByDescending(r => r.AnalyzedAt)
                    .Take(count)
                    .ToList();

                var dtos = _mapper.Map<List<AudioAnalysisResultDto>>(recent);
                return new ServiceResponse<List<AudioAnalysisResultDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Retrieved {dtos.Count} recently analyzed results"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AudioAnalysisResultDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get tempo range statistics
        /// </summary>
        public async Task<ServiceResponse<TempoStatisticsDto>> GetTempoStatisticsAsync()
        {
            try
            {
                var results = await _analysisRepository.GetAsync(ar => ar.DetectedTempo.HasValue);
                var tempos = results.Select(r => r.DetectedTempo!.Value).ToList();

                if (!tempos.Any())
                    return new ServiceResponse<TempoStatisticsDto>
                    {
                        Success = false,
                        Message = "No tempo data available"
                    };

                var statistics = new TempoStatisticsDto
                {
                    AverageTempo = tempos.Average(),
                    MinTempo = tempos.Min(),
                    MaxTempo = tempos.Max(),
                    Count = tempos.Count
                };

                return new ServiceResponse<TempoStatisticsDto>
                {
                    Success = true,
                    Data = statistics,
                    Message = "Tempo statistics retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<TempoStatisticsDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }

    public class TempoStatisticsDto
    {
        public decimal AverageTempo { get; set; }
        public decimal MinTempo { get; set; }
        public decimal MaxTempo { get; set; }
        public int Count { get; set; }
    }
}
