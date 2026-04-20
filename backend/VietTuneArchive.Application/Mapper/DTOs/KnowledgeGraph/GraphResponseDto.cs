namespace VietTuneArchive.Application.Mapper.DTOs.KnowledgeGraph
{
    /// <summary>
    /// Response chứa subgraph — danh sách nodes và edges.
    /// Frontend D3.js sẽ dùng trực tiếp data này để render force-directed graph.
    /// </summary>
    public class GraphResponseDto
    {
        public List<GraphNodeDto> Nodes { get; set; } = new();
        public List<GraphEdgeDto> Edges { get; set; } = new();

        /// <summary>
        /// Tổng số nodes có thể có (trước khi limit), dùng cho pagination.
        /// </summary>
        public int TotalNodes { get; set; }
    }
}
