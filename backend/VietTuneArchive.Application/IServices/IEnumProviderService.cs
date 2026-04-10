namespace VietTuneArchive.Application.IServices
{
    public interface IEnumProviderService
    {
        /// <summary>
        /// Trả về nội dung file music_schema.txt (JSON Schema)
        /// </summary>
        string GetJsonSchema();

        /// <summary>
        /// Trả về system prompt ĐÃ INJECT database context.
        /// Gọi hàm này thay vì đọc file prompt trực tiếp.
        /// </summary>
        string GetSystemPrompt();

        /// <summary>
        /// Build chuỗi DB context từ cache để inject vào prompt.
        /// </summary>
        string BuildDbContext();

        /// <summary>
        /// Refresh cache khi data trong DB thay đổi (gọi từ Admin hoặc background job).
        /// </summary>
        Task RefreshCacheAsync();
    }
}
