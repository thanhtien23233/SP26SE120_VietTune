using Microsoft.AspNetCore.Http;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    /// <summary>
    /// Request model cho endpoint upload ảnh (multipart/form-data).
    /// Bắt buộc dùng class thay vì tham số rời để Swashbuckle generate đúng schema.
    /// </summary>
    public class UploadImageRequest
    {
        /// <summary>File ảnh cần upload (JPG, PNG, GIF, WebP, BMP, SVG, TIFF — tối đa 10 MB).</summary>
        public IFormFile File { get; set; } = null!;

        /// <summary>Chú thích ảnh (tuỳ chọn).</summary>
        public string? Caption { get; set; }
    }
}
