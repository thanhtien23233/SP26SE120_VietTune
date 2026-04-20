using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Domain.Entities
{
    public class MusicalScale
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; }

        public string? Description { get; set; }

        [MaxLength(200)]
        public string? NotePattern { get; set; }

        // Navigation properties
        public ICollection<Recording>? Recordings { get; set; }
    }
}
