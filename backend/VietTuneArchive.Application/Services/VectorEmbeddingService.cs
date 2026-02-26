using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class VectorEmbeddingService : GenericService<VectorEmbedding, VectorEmbeddingDto>, IVectorEmbeddingService
    {
        private readonly IVectorEmbeddingRepository _vectorEmbeddingRepository;

        public VectorEmbeddingService(IVectorEmbeddingRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _vectorEmbeddingRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get embeddings by recording
        /// </summary>
        public async Task<ServiceResponse<List<VectorEmbeddingDto>>> GetByRecordingAsync(Guid recordingId)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty", nameof(recordingId));

                var embeddings = await _vectorEmbeddingRepository.GetAsync(ve => ve.RecordingId == recordingId);
                var dtos = _mapper.Map<List<VectorEmbeddingDto>>(embeddings);
                return new ServiceResponse<List<VectorEmbeddingDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} embeddings"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<VectorEmbeddingDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get embeddings by model version
        /// </summary>
        public async Task<ServiceResponse<List<VectorEmbeddingDto>>> GetByModelVersionAsync(string modelVersion)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(modelVersion))
                    throw new ArgumentException("Model version cannot be empty", nameof(modelVersion));

                var embeddings = await _vectorEmbeddingRepository.GetAsync(ve => ve.ModelVersion == modelVersion);
                var dtos = _mapper.Map<List<VectorEmbeddingDto>>(embeddings);
                return new ServiceResponse<List<VectorEmbeddingDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} embeddings"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<VectorEmbeddingDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get latest embedding for a recording
        /// </summary>
        public async Task<ServiceResponse<VectorEmbeddingDto>> GetLatestByRecordingAsync(Guid recordingId)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty", nameof(recordingId));

                var embeddings = await _vectorEmbeddingRepository.GetAsync(ve => ve.RecordingId == recordingId);
                var latestEmbedding = embeddings.OrderByDescending(e => e.CreatedAt).FirstOrDefault();

                if (latestEmbedding == null)
                    return new ServiceResponse<VectorEmbeddingDto>
                    {
                        Success = false,
                        Message = "Embedding not found"
                    };

                var dto = _mapper.Map<VectorEmbeddingDto>(latestEmbedding);
                return new ServiceResponse<VectorEmbeddingDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<VectorEmbeddingDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get all available model versions
        /// </summary>
        public async Task<ServiceResponse<List<string>>> GetAllModelVersionsAsync()
        {
            try
            {
                var embeddings = await _vectorEmbeddingRepository.GetAllAsync();
                var versions = embeddings
                    .Select(e => e.ModelVersion)
                    .Distinct()
                    .OrderByDescending(v => v)
                    .ToList();

                return new ServiceResponse<List<string>>
                {
                    Success = true,
                    Data = versions,
                    Message = "Retrieved all model versions successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<string>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
