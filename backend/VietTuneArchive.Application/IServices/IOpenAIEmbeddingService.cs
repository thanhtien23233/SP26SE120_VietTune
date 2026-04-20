namespace VietTuneArchive.Application.IServices
{
    public interface IOpenAIEmbeddingService
    {
        /// <summary>
        /// Gọi Embedding API để sinh embedding vector từ text.
        /// </summary>
        Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default);

        /// <summary>
        /// Sinh embedding với task type cụ thể (dành cho Gemini).
        /// </summary>
        Task<float[]> GetEmbeddingAsync(string text, string taskType, CancellationToken ct = default);

        /// <summary>
        /// Sinh embedding cho nhiều text cùng lúc (batch).
        /// </summary>
        Task<List<float[]>> GetEmbeddingBatchAsync(List<string> texts, CancellationToken ct = default);
    }
}

