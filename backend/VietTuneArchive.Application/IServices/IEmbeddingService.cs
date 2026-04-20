namespace VietTuneArchive.Application.IServices
{
    public interface IEmbeddingService
    {
        // === Được gọi TỰ ĐỘNG từ ReviewService/KBEntryService ===
        Task GenerateEmbeddingForRecordingAsync(Guid recordingId);
        Task GenerateEmbeddingForKBEntryAsync(Guid entryId);

        // === Được gọi từ RagChatService khi user hỏi ===
        Task<float[]> GetEmbeddingAsync(string text);
        Task<List<(Guid RecordingId, double Score)>> SearchSimilarRecordingsAsync(float[] queryVector, int topK = 5);
        Task<List<(Guid EntryId, double Score)>> SearchSimilarKBEntriesAsync(float[] queryVector, int topK = 5);

        // === Được gọi từ Admin endpoint — chỉ để backfill/re-generate ===
        Task<int> BackfillAllMissingEmbeddingsAsync();

        // Removed GetStatsAsync since we don't have DTO for it yet, or we can just return a basic object
        // Task<EmbeddingStatsDto> GetStatsAsync(); 

        // Retained for backward compat if needed (but changed parameters in the controller)
        Task GenerateAndStoreEmbeddingAsync(Guid recordingId, string textContent);
    }
}
