using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class KBRevision
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid EntryId { get; set; }

        [ForeignKey("EntryId")]
        public KBEntry? Entry { get; set; }

        [Required]
        public Guid EditorId { get; set; }

        [ForeignKey("EditorId")]
        public User? Editor { get; set; }

        [Required]
        public string Content { get; set; }

        [MaxLength(500)]
        public string? RevisionNote { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
