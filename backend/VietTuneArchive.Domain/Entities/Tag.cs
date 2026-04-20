using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Domain.Entities
{
    public class Tag
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }

        // Navigation properties
        public ICollection<RecordingTag>? RecordingTags { get; set; }
    }
}
