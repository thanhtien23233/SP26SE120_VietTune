namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AnalyzeFromUrlRequest
    {
        /// <summary>
        /// Public URL của file audio trên Supabase Storage.
        /// Ví dụ: https://xxx.supabase.co/storage/v1/object/public/recordings/file.flac
        /// </summary>
        public string AudioUrl { get; set; } = string.Empty;
        
        /// <summary>
        /// MIME type (optional). Nếu không truyền, tự detect từ URL extension.
        /// Ví dụ: "audio/flac", "audio/wav", "audio/mpeg"
        /// </summary>
        public string? MimeType { get; set; }
    }
}
