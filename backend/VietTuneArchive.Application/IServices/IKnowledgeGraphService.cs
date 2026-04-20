using VietTuneArchive.Application.Mapper.DTOs.KnowledgeGraph;

namespace VietTuneArchive.Application.IServices
{
    public interface IKnowledgeGraphService
    {
        /// <summary>
        /// Lấy subgraph xung quanh một node (explore/expand).
        /// </summary>
        Task<GraphResponseDto> ExploreNodeAsync(GraphExploreRequest request);

        /// <summary>
        /// Tìm kiếm nodes theo keyword.
        /// </summary>
        Task<List<GraphNodeDto>> SearchNodesAsync(GraphSearchRequest request);

        /// <summary>
        /// Lấy overview graph — top entities và quan hệ chính (cho trang chủ knowledge graph).
        /// </summary>
        Task<GraphResponseDto> GetOverviewGraphAsync(int maxNodes = 100);

        /// <summary>
        /// Lấy thống kê tổng quan graph.
        /// </summary>
        Task<GraphStatsDto> GetStatsAsync();

        /// <summary>
        /// Lấy subgraph giữa 2 entity types cụ thể.
        /// VD: Tất cả Instrument <-> EthnicGroup relationships.
        /// </summary>
        Task<GraphResponseDto> GetRelationshipGraphAsync(string sourceType, string targetType, int limit = 100);
    }
}
