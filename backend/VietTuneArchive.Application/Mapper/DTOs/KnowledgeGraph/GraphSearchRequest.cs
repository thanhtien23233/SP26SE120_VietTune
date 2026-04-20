namespace VietTuneArchive.Application.Mapper.DTOs.KnowledgeGraph
{
    /// <summary>
    /// Tìm kiếm nodes trong graph theo keyword.
    /// </summary>
    public class GraphSearchRequest
    {
        public string Query { get; set; } = string.Empty;

        /// <summary>
        /// Lọc theo loại (null = tìm tất cả types)
        /// </summary>
        public List<string>? Types { get; set; }

        public int Limit { get; set; } = 20;
    }
}
