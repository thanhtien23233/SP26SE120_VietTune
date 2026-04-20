using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class KBEntry
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Title { get; set; }

        [Required]
        [MaxLength(500)]
        public string Slug { get; set; }

        [Required]
        public string Content { get; set; } // rich-text-html

        [Required]
        [MaxLength(50)]
        public string Category { get; set; } // Instrument-Ceremony-MusicTheory-EthnicGroup-History

        [Required]
        public Guid AuthorId { get; set; }

        [ForeignKey("AuthorId")]
        public User? Author { get; set; }

        [Required]
        public int Status { get; set; } // 0-Draft 1-Published 2-Archived

        [Required]
        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public ICollection<KBRevision>? KBRevisions { get; set; }
        public ICollection<KBCitation>? KBCitations { get; set; }
    }
}
