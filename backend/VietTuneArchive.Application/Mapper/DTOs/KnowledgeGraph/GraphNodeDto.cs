namespace VietTuneArchive.Application.Mapper.DTOs.KnowledgeGraph
{
    /// <summary>
    /// Một node trong Knowledge Graph — đại diện cho một entity 
    /// (EthnicGroup, Instrument, Ceremony, Recording, VocalStyle, MusicalScale, Tag, Province)
    /// </summary>
    public class GraphNodeDto
    {
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// Loại entity: "EthnicGroup", "Instrument", "Ceremony", "Recording", 
        /// "VocalStyle", "MusicalScale", "Tag", "Province"
        /// </summary>
        public string Type { get; set; } = string.Empty;

        public string Label { get; set; } = string.Empty;

        /// <summary>
        /// Metadata bổ sung tuỳ theo Type.
        /// VD: Instrument có Category, TuningSystem; EthnicGroup có LanguageFamily, PrimaryRegion...
        /// </summary>
        public Dictionary<string, object?> Properties { get; set; } = new();
    }
}
