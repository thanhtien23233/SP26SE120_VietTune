using Microsoft.AspNetCore.Http;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    public interface IRecordingImageService : IGenericService<RecordingImageDto>
    {
        /// <summary>
        /// Upload file ảnh lên Supabase Storage rồi lưu metadata vào DB.
        /// Trả về DTO chứa public URL của ảnh đã upload.
        /// </summary>
        Task<ServiceResponse<RecordingImageDto>> UploadImageAsync(
            Guid recordingId,
            IFormFile file,
            string? caption = null);

        /// <summary>Lấy tất cả ảnh của một recording, sắp xếp theo SortOrder.</summary>
        Task<ServiceResponse<List<RecordingImageDto>>> GetByRecordingAsync(Guid recordingId);

        /// <summary>Lấy ảnh đại diện (SortOrder == 0) của recording.</summary>
        Task<ServiceResponse<RecordingImageDto>> GetPrimaryImageAsync(Guid recordingId);

        /// <summary>Thêm ảnh bằng URL có sẵn (không upload file).</summary>
        Task<ServiceResponse<RecordingImageDto>> AddImageAsync(
            Guid recordingId, string imageUrl, string? caption = null);

        /// <summary>Đổi thứ tự hiển thị ảnh của một recording.</summary>
        Task<ServiceResponse<bool>> ReorderImagesAsync(Guid recordingId, List<Guid> imageIds);
    }
}
