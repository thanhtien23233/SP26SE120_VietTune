using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class AuditLog
    {
        [Key]
        public Guid Id { get; set; }

        public Guid? UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        [MaxLength(100)]
        public string EntityType { get; set; }

        [Required]
        [MaxLength(100)]
        public string EntityId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Action { get; set; } // Create-Update-Delete

        public string? OldValuesJson { get; set; }

        public string? NewValuesJson { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
