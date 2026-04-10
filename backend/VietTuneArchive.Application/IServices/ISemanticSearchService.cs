namespace VietTuneArchive.Application.IServices
{
    public interface ISemanticSearchService
    {
        /// <summary>
        /// Tìm kiếm Recording theo ngữ nghĩa.
        /// Trả về danh sách Recording kèm điểm similarity, sắp xếp từ cao đến thấp.
        /// </summary>
        Task<List<SemanticSearchResult>> SearchAsync(
            string query,
            int topK = 10,
            float minScore = 0.5f,
            CancellationToken ct = default);

        /// <summary>
        /// Tìm kiếm Recording sử dụng Gemini 768-dim embeddings.
        /// </summary>
        Task<List<SemanticSearchResult>> Search768Async(
            string query,
            int topK = 10,
            float minScore = 0.5f,
            CancellationToken ct = default);
    }

    public class SemanticSearchResult
    {
        public Guid RecordingId { get; set; }
        public string Title { get; set; } = string.Empty;
        public float SimilarityScore { get; set; }

        public string? EthnicGroupName { get; set; }
        public string? CeremonyName { get; set; }
        public string? PerformerName { get; set; }
        public List<string> InstrumentNames { get; set; } = new();
    }
}
