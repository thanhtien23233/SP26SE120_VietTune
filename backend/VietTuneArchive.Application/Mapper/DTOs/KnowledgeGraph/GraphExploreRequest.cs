namespace VietTuneArchive.Application.Mapper.DTOs.KnowledgeGraph
{
    /// <summary>
    /// Request explore graph từ một node trung tâm.
    /// </summary>
    public class GraphExploreRequest
    {
        /// <summary>
        /// ID của node trung tâm (UUID dạng string)
        /// </summary>
        public string NodeId { get; set; } = string.Empty;

        /// <summary>
        /// Loại node: "EthnicGroup", "Instrument", "Ceremony", "Recording"...
        /// </summary>
        public string NodeType { get; set; } = string.Empty;

        /// <summary>
        /// Số bước (hop) tối đa từ node trung tâm. Mặc định 1, tối đa 3.
        /// </summary>
        public int Depth { get; set; } = 1;

        /// <summary>
        /// Giới hạn số nodes trả về. Mặc định 50, tối đa 200.
        /// </summary>
        public int MaxNodes { get; set; } = 50;

        /// <summary>
        /// Lọc theo loại node cụ thể (null = tất cả).
        /// VD: ["Instrument", "Ceremony"] chỉ lấy instruments và ceremonies liên quan.
        /// </summary>
        public List<string>? FilterTypes { get; set; }
    }
}
