using System;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AudioAnalysisResultDto
    {
        public Guid Id { get; set; }
        public Guid RecordingId { get; set; }
        public string? DetectedInstrumentsJson { get; set; }
        public decimal? DetectedTempo { get; set; }
        public string? DetectedKey { get; set; }
        public string? SpectralFeaturesJson { get; set; }
        public string? SuggestedEthnicGroup { get; set; }
        public string? SuggestedMetadataJson { get; set; }
        public DateTime AnalyzedAt { get; set; }
    }
}
