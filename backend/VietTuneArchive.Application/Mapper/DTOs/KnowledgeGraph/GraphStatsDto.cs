namespace VietTuneArchive.Application.Mapper.DTOs.KnowledgeGraph
{
    /// <summary>
    /// Thống kê tổng quan Knowledge Graph.
    /// </summary>
    public class GraphStatsDto
    {
        public int TotalEthnicGroups { get; set; }
        public int TotalInstruments { get; set; }
        public int TotalCeremonies { get; set; }
        public int TotalRecordings { get; set; }
        public int TotalVocalStyles { get; set; }
        public int TotalMusicalScales { get; set; }
        public int TotalTags { get; set; }
        public int TotalProvinces { get; set; }
        public int TotalEdges { get; set; }
    }
}
