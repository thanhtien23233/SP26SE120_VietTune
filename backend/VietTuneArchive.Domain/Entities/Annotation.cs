using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class Annotation
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid RecordingId { get; set; }

        [ForeignKey("RecordingId")]
        public Recording? Recording { get; set; }

        [Required]
        public Guid ExpertId { get; set; }

        [ForeignKey("ExpertId")]
        public User? Expert { get; set; }

        [Required]
        public string Content { get; set; }

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } // ScholarlyNote-Correction-Citation-RareVariant

        [MaxLength(500)]
        public string? ResearchCitation { get; set; }

        public int? TimestampStart { get; set; }

        public int? TimestampEnd { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
