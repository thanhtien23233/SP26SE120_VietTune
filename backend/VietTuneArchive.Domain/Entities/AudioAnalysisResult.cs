using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class AudioAnalysisResult
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid RecordingId { get; set; }

        [ForeignKey("RecordingId")]
        public Recording? Recording { get; set; }

        public string? DetectedInstrumentsJson { get; set; }

        public decimal? DetectedTempo { get; set; }

        [MaxLength(20)]
        public string? DetectedKey { get; set; }

        public string? SpectralFeaturesJson { get; set; }

        [MaxLength(100)]
        public string? SuggestedEthnicGroup { get; set; }

        public string? SuggestedMetadataJson { get; set; }

        [Required]
        public DateTime AnalyzedAt { get; set; }
    }
}
