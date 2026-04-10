namespace VietTuneArchive.Application.Mapper.DTOs.KnowledgeGraph
{
    /// <summary>
    /// Một cạnh (edge) trong Knowledge Graph — quan hệ giữa 2 nodes.
    /// </summary>
    public class GraphEdgeDto
    {
        public string SourceId { get; set; } = string.Empty;
        public string TargetId { get; set; } = string.Empty;

        /// <summary>
        /// Loại quan hệ: "USES_INSTRUMENT", "BELONGS_TO_ETHNIC_GROUP", "PERFORMED_IN_CEREMONY",
        /// "HAS_VOCAL_STYLE", "HAS_SCALE", "HAS_TAG", "LOCATED_IN", "ORIGIN_ETHNIC_GROUP",
        /// "ETHNIC_GROUP_HAS_CEREMONY", "ETHNIC_GROUP_HAS_INSTRUMENT"
        /// </summary>
        public string Relation { get; set; } = string.Empty;

        /// <summary>
        /// Metadata bổ sung (VD: PlayingTechnique cho Recording-Instrument)
        /// </summary>
        public Dictionary<string, object?>? Properties { get; set; }
    }
}
