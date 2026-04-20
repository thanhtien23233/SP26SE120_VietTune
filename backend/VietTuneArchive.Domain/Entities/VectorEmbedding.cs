using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class VectorEmbedding
    {
        [Key]
        public Guid Id { get; set; }

        public Guid? RecordingId { get; set; }

        [ForeignKey("RecordingId")]
        public Recording? Recording { get; set; }

        public Guid? KBEntryId { get; set; }

        // Optionally configure ForeignKey for KBEntryId in DbContext or here if needed, but the prompt says EF can infer or handle it if we create a relation, or we just leave it for ad-hoc mapping.
        [ForeignKey("KBEntryId")]
        public KBEntry? KBEntry { get; set; }

        [Required]
        public string EmbeddingJson { get; set; } // vector-float-array

        [Required]
        [MaxLength(100)]
        public string ModelVersion { get; set; } // Gemini-embedding

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
