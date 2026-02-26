using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class VectorEmbedding
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid RecordingId { get; set; }

        [ForeignKey("RecordingId")]
        public Recording? Recording { get; set; }

        [Required]
        public string EmbeddingJson { get; set; } // vector-float-array

        [Required]
        [MaxLength(100)]
        public string ModelVersion { get; set; } // Gemini-embedding

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
