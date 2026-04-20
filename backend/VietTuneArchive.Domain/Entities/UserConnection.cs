using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class UserConnection
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string ConnectionId { get; set; }

        [MaxLength(500)]
        public string? UserAgent { get; set; }

        [Required]
        public DateTime ConnectedAt { get; set; }

        // Navigation property
        [ForeignKey("UserId")]
        public virtual User User { get; set; }
    }
}
