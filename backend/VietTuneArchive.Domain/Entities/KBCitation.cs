using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class KBCitation
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid EntryId { get; set; }

        [ForeignKey("EntryId")]
        public KBEntry? Entry { get; set; }

        [Required]
        [MaxLength(1000)]
        public string Citation { get; set; }

        [MaxLength(500)]
        public string? Url { get; set; }
    }
}
