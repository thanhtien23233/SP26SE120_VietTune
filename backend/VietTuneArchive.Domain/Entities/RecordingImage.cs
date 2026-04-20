using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class RecordingImage
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid RecordingId { get; set; }

        [ForeignKey("RecordingId")]
        public Recording? Recording { get; set; }

        [Required]
        [MaxLength(500)]
        public string ImageUrl { get; set; }

        [MaxLength(500)]
        public string? Caption { get; set; }

        [Required]
        public int SortOrder { get; set; }
    }
}
