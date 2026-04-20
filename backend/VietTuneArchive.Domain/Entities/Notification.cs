using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class Notification
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(300)]
        public string Title { get; set; }

        [Required]
        public string Message { get; set; }

        [Required]
        [MaxLength(50)]
        public string Type { get; set; }

        [MaxLength(100)]
        public string? RelatedEntityType { get; set; }

        public Guid? RelatedEntityId { get; set; }

        [Required]
        public bool IsRead { get; set; } = false;

        [Required]
        public DateTime CreatedAt { get; set; }

        // Navigation property
        [ForeignKey("UserId")]
        public virtual User User { get; set; }
    }
}
