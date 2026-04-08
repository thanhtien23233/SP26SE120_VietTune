using AutoMapper;
using VietTuneArchive.Application.Common;
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
        private readonly IMapper _mapper;
        private readonly IRecordingRepository _recordingRepository;
        public AnnotationService(IAnnotationRepository repository, IMapper mapper, IRecordingRepository recordingRepository)
            : base(repository, mapper)
        {
            _annotationRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _recordingRepository = recordingRepository ?? throw new ArgumentNullException(nameof(recordingRepository));
        }

        /// <summary>
        /// Get annotations by recording
        /// </summary>
        public async Task<Result<IEnumerable<AnnotationDto>>> GetByRecordingAsync(Guid recordingId)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty", nameof(recordingId));
                var recording = await _recordingRepository.GetByIdAsync(recordingId);
                if (recording == null)
                    return Result<IEnumerable<AnnotationDto>>.Failure("Recording not found");
                var annotations = await _annotationRepository.GetAsync(a => a.RecordingId == recordingId);
                var dtos = _mapper.Map<List<AnnotationDto>>(annotations.OrderByDescending(a => a.CreatedAt).ToList());
                return Result<IEnumerable<AnnotationDto>>.Success(dtos, $"Found {dtos.Count} annotations");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<AnnotationDto>>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// Get annotations by expert
        /// </summary>
        public async Task<Result<IEnumerable<AnnotationDto>>> GetByExpertAsync(Guid expertId)
        {
            try
            {
                if (expertId == Guid.Empty)
                    throw new ArgumentException("Expert id cannot be empty", nameof(expertId));

                var annotations = await _annotationRepository.GetByExpertIdAsync(expertId);
                var dtos = _mapper.Map<List<AnnotationDto>>(annotations.OrderByDescending(a => a.CreatedAt).ToList());
                return Result<IEnumerable<AnnotationDto>>.Success(dtos, $"Found {dtos.Count} annotations");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<AnnotationDto>>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// Create annotation
        /// </summary>
        public async Task<Result<CreateAnnotationDto>> CreateAsync(CreateAnnotationDto annotationDto)
        {
            try
            {
                if (annotationDto == null)
                    throw new ArgumentNullException(nameof(annotationDto));
                var recording = await _recordingRepository.GetByIdAsync(annotationDto.RecordingId);
                if (recording == null)
                    return Result<CreateAnnotationDto>.Failure("Recording not found");
                var annotation = _mapper.Map<Annotation>(annotationDto);
                annotation.Id = Guid.NewGuid();
                annotation.CreatedAt = DateTime.UtcNow;
                await _annotationRepository.AddAsync(annotation);
                return Result<CreateAnnotationDto>.Success(annotationDto, "Annotation created successfully");
            }
            catch (Exception ex)
            {
                return Result<CreateAnnotationDto>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// Update annotation
        /// </summary>
        public async Task<Result<UpdateAnnotationDto>> UpdateAsync(UpdateAnnotationDto annotationDto)
        {
            try
            {
                if (annotationDto == null)
                    throw new ArgumentNullException(nameof(annotationDto));
                var existingAnnotation = await _annotationRepository.GetByIdAsync(annotationDto.Id);
                if (existingAnnotation == null)
                    return Result<UpdateAnnotationDto>.Failure("Annotation not found");
                var recording = await _recordingRepository.GetByIdAsync(annotationDto.RecordingId);
                if (recording == null)
                    return Result<UpdateAnnotationDto>.Failure("Recording not found");
                var annotation = _mapper.Map<Annotation>(annotationDto);
                annotation.CreatedAt = existingAnnotation.CreatedAt; // Preserve original created time
                await _annotationRepository.UpdateAsync(annotation);
                return Result<UpdateAnnotationDto>.Success(annotationDto, "Annotation updated successfully");
            }
            catch (Exception ex)
            {
                return Result<UpdateAnnotationDto>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// Delete annotation
        /// </summary>
        public async Task<Result<Guid>> DeleteAsync(Guid annotationId)
        {
            try
            {
                if (annotationId == Guid.Empty)
                    throw new ArgumentNullException(nameof(annotationId));
                var annotation = await _annotationRepository.GetByIdAsync(annotationId);
                if (annotation == null)
                    return Result<Guid>.Failure("Annotation not found");
                await _annotationRepository.DeleteAsync(annotation);
                return Result<Guid>.Success(annotationId, "Annotation deleted successfully");
            }
            catch (Exception ex)
            {
                return Result<Guid>.Failure(ex.Message);
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
