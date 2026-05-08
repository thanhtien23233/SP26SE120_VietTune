using AutoMapper;
using Microsoft.AspNetCore.Http;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class RecordingImageService : GenericService<RecordingImage, RecordingImageDto>, IRecordingImageService
    {
        private readonly IRecordingImageRepository _recordingImageRepository;
        private readonly ISupabaseStorageService _storageService;

        public RecordingImageService(
            IRecordingImageRepository repository,
            IMapper mapper,
            ISupabaseStorageService storageService)
            : base(repository, mapper)
        {
            _recordingImageRepository = repository ?? throw new ArgumentNullException(nameof(repository));
            _storageService           = storageService ?? throw new ArgumentNullException(nameof(storageService));
        }

        // =================================================================
        // UPLOAD (Supabase Storage → DB)
        // =================================================================

        /// <summary>
        /// Upload file ảnh lên Supabase bucket "recording-images",
        /// lưu thư mục theo recordingId, rồi persist URL vào DB.
        /// </summary>
        public async Task<ServiceResponse<RecordingImageDto>> UploadImageAsync(
            Guid recordingId,
            IFormFile file,
            string? caption = null)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty.", nameof(recordingId));

                // Upload lên Supabase — folder = "recordings/{recordingId}"
                var folder    = $"recordings/{recordingId}";
                var publicUrl = await _storageService.UploadImageAsync(file, folder);

                // Lưu metadata vào DB
                return await AddImageAsync(recordingId, publicUrl, caption);
            }
            catch (Exception ex)
            {
                return new ServiceResponse<RecordingImageDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors  = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Xoá ảnh: trước tiên xoá file khỏi Supabase Storage (dùng URL từ DB),
        /// sau đó mới xoá DB record.
        /// </summary>
        public override async Task<ServiceResponse<bool>> DeleteAsync(Guid id)
        {
            try
            {
                if (id == Guid.Empty)
                    throw new ArgumentException("Id cannot be empty.", nameof(id));

                // Lấy entity trước để lấy ImageUrl
                var image = await _recordingImageRepository.GetByIdAsync(id);
                if (image == null)
                    return new ServiceResponse<bool> { Success = false, Message = "Image not found." };

                // Xoá file khỏi Supabase Storage (bỏ qua nếu URL không thuộc Supabase)
                await _storageService.DeleteByUrlAsync(image.ImageUrl);

                // Xoá DB record
                return await base.DeleteAsync(id);
            }
            catch (Exception ex)
            {
                return new ServiceResponse<bool>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors  = new List<string> { ex.Message }
                };
            }
        }

        // =================================================================
        // QUERY
        // =================================================================

        /// <summary>Lấy tất cả ảnh của một recording, sắp xếp theo SortOrder.</summary>
        public async Task<ServiceResponse<List<RecordingImageDto>>> GetByRecordingAsync(Guid recordingId)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty.", nameof(recordingId));

                var images = await _recordingImageRepository.GetAsync(ri => ri.RecordingId == recordingId);
                var dtos   = _mapper.Map<List<RecordingImageDto>>(images.OrderBy(i => i.SortOrder).ToList());
                return new ServiceResponse<List<RecordingImageDto>>
                {
                    Success = true,
                    Data    = dtos,
                    Message = $"Found {dtos.Count} images"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<RecordingImageDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors  = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>Lấy ảnh đại diện (SortOrder == 0) của recording.</summary>
        public async Task<ServiceResponse<RecordingImageDto>> GetPrimaryImageAsync(Guid recordingId)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty.", nameof(recordingId));

                var image = await _recordingImageRepository.GetFirstOrDefaultAsync(ri =>
                    ri.RecordingId == recordingId && ri.SortOrder == 0);

                if (image == null)
                    return new ServiceResponse<RecordingImageDto>
                    {
                        Success = false,
                        Message = "Primary image not found"
                    };

                var dto = _mapper.Map<RecordingImageDto>(image);
                return new ServiceResponse<RecordingImageDto>
                {
                    Success = true,
                    Data    = dto,
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<RecordingImageDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors  = new List<string> { ex.Message }
                };
            }
        }

        // =================================================================
        // MUTATION HELPERS
        // =================================================================

        /// <summary>Thêm ảnh bằng URL có sẵn (không upload file).</summary>
        public async Task<ServiceResponse<RecordingImageDto>> AddImageAsync(
            Guid recordingId, string imageUrl, string? caption = null)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty.", nameof(recordingId));
                if (string.IsNullOrWhiteSpace(imageUrl))
                    throw new ArgumentException("Image URL cannot be empty.", nameof(imageUrl));

                var existingImages = await _recordingImageRepository.GetAsync(ri => ri.RecordingId == recordingId);
                var sortOrder      = existingImages.Any() ? existingImages.Max(i => i.SortOrder) + 1 : 0;

                var newImage = new RecordingImage
                {
                    RecordingId = recordingId,
                    ImageUrl    = imageUrl,
                    Caption     = caption,
                    SortOrder   = sortOrder
                };

                var created = await _recordingImageRepository.AddAsync(newImage);
                var dto     = _mapper.Map<RecordingImageDto>(created);
                return new ServiceResponse<RecordingImageDto>
                {
                    Success = true,
                    Data    = dto,
                    Message = "Image added successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<RecordingImageDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors  = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>Đổi thứ tự hiển thị ảnh của một recording.</summary>
        public async Task<ServiceResponse<bool>> ReorderImagesAsync(Guid recordingId, List<Guid> imageIds)
        {
            try
            {
                if (recordingId == Guid.Empty)
                    throw new ArgumentException("Recording id cannot be empty.", nameof(recordingId));
                if (imageIds == null || !imageIds.Any())
                    throw new ArgumentException("Image ids list cannot be empty.", nameof(imageIds));

                for (int i = 0; i < imageIds.Count; i++)
                {
                    var image = await _recordingImageRepository.GetByIdAsync(imageIds[i]);
                    if (image != null && image.RecordingId == recordingId)
                    {
                        image.SortOrder = i;
                        await _recordingImageRepository.UpdateAsync(image);
                    }
                }

                return new ServiceResponse<bool>
                {
                    Success = true,
                    Data    = true,
                    Message = "Images reordered successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<bool>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors  = new List<string> { ex.Message }
                };
            }
        }
    }
}
