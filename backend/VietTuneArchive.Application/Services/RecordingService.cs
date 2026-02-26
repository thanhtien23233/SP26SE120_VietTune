using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class RecordingService : GenericService<Recording, RecordingDto>, IRecordingService
    {
        private readonly IRecordingRepository _recordingRepository;

        public RecordingService(IRecordingRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _recordingRepository = repository ?? throw new ArgumentNullException(nameof(repository));
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
        /// Search recordings by title
        /// </summary>
        public async Task<ServiceResponse<List<RecordingDto>>> SearchByTitleAsync(string title)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(title))
                    throw new ArgumentException("Search title cannot be empty", nameof(title));

                var recordings = await _recordingRepository.GetAsync(r => r.Title.Contains(title));
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
    }
}
