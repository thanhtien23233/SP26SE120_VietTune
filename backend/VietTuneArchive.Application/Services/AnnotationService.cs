using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class AnnotationService : GenericService<Annotation, AnnotationDto>, IAnnotationService
    {
        private readonly IAnnotationRepository _annotationRepository;

        public AnnotationService(IAnnotationRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _annotationRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get annotations by recording
        /// </summary>
        public async Task<ServiceResponse<List<AnnotationDto>>> GetByRecordingAsync(Guid recordingId)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty", nameof(recordingId));

                var annotations = await _annotationRepository.GetAsync(a => a.RecordingId == recordingId);
                var dtos = _mapper.Map<List<AnnotationDto>>(annotations.OrderBy(a => a.TimestampStart).ToList());
                return new ServiceResponse<List<AnnotationDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} annotations"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AnnotationDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get annotations by expert
        /// </summary>
        public async Task<ServiceResponse<List<AnnotationDto>>> GetByExpertAsync(Guid expertId)
        {
            try
            {
                if (expertId == Guid.Empty)
                    throw new ArgumentException("Expert id cannot be empty", nameof(expertId));

                var annotations = await _annotationRepository.GetAsync(a => a.ExpertId == expertId);
                var dtos = _mapper.Map<List<AnnotationDto>>(annotations.OrderByDescending(a => a.CreatedAt).ToList());
                return new ServiceResponse<List<AnnotationDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} annotations"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AnnotationDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get annotations by type
        /// </summary>
        public async Task<ServiceResponse<List<AnnotationDto>>> GetByTypeAsync(string type)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(type))
                    throw new ArgumentException("Type cannot be empty", nameof(type));

                var annotations = await _annotationRepository.GetAsync(a => a.Type == type);
                var dtos = _mapper.Map<List<AnnotationDto>>(annotations);
                return new ServiceResponse<List<AnnotationDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} annotations of type {type}"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AnnotationDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get annotations in time range
        /// </summary>
        public async Task<ServiceResponse<List<AnnotationDto>>> GetByTimeRangeAsync(Guid recordingId, int startTime, int endTime)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty", nameof(recordingId));

                if (startTime > endTime)
                    throw new ArgumentException("Start time must be less than end time");

                var annotations = await _annotationRepository.GetAsync(a => 
                    a.RecordingId == recordingId &&
                    a.TimestampStart.HasValue && a.TimestampEnd.HasValue &&
                    a.TimestampStart <= endTime && a.TimestampEnd >= startTime);

                var dtos = _mapper.Map<List<AnnotationDto>>(annotations.OrderBy(a => a.TimestampStart).ToList());
                return new ServiceResponse<List<AnnotationDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} annotations in time range"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AnnotationDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Search annotations by content
        /// </summary>
        public async Task<ServiceResponse<List<AnnotationDto>>> SearchAsync(string keyword)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(keyword))
                    throw new ArgumentException("Search keyword cannot be empty", nameof(keyword));

                var annotations = await _annotationRepository.GetAsync(a => 
                    a.Content.Contains(keyword) || 
                    (a.ResearchCitation != null && a.ResearchCitation.Contains(keyword)));

                var dtos = _mapper.Map<List<AnnotationDto>>(annotations);
                return new ServiceResponse<List<AnnotationDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} annotations"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<AnnotationDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
