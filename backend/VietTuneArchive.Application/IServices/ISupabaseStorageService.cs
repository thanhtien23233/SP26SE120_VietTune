using Microsoft.AspNetCore.Http;

namespace VietTuneArchive.Application.IServices
{
    /// <summary>
    /// Upload / xoá file trên Supabase Storage qua REST API.
    /// Không dùng SDK Supabase — giữ dependency tối thiểu.
    /// </summary>
    public interface ISupabaseStorageService
    {
        /// <summary>
        /// Upload file lên bucket chỉ định.
        /// </summary>
        /// <param name="file">IFormFile nhận từ HTTP multipart request.</param>
        /// <param name="bucketName">Tên bucket đích trên Supabase Storage.</param>
        /// <param name="folder">Thư mục con bên trong bucket (vd: "recordings/abc-123"). Có thể bỏ trống.</param>
        /// <returns>Public URL của file vừa upload.</returns>
        Task<string> UploadAsync(IFormFile file, string bucketName, string folder = "");

        /// <summary>
        /// Upload hình ảnh lên bucket ảnh mặc định (cấu hình tại Supabase:ImageBucketName).
        /// Tự động validate loại file và kích thước ≤ 10 MB.
        /// </summary>
        Task<string> UploadImageAsync(IFormFile file, string folder = "");

        /// <summary>
        /// Xoá file khỏi bucket.
        /// </summary>
        /// <param name="bucketName">Tên bucket.</param>
        /// <param name="filePath">Đường dẫn object trong bucket (không gồm base URL).</param>
        Task DeleteAsync(string bucketName, string filePath);

        /// <summary>
        /// Xoá file bằng public URL đã lưu trong DB.
        /// Tự parse bucket + object path từ URL format:
        /// {supabaseUrl}/storage/v1/object/public/{bucket}/{objectPath}
        /// Nếu URL không thuộc Supabase thì bỏ qua (không throw).
        /// </summary>
        Task DeleteByUrlAsync(string publicUrl);
    }
}
