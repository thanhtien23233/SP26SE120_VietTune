using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class QAConversation
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [MaxLength(200)]
        public string? Title { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        // Navigation properties
        public ICollection<QAMessage>? QAMessages { get; set; }
    }
}
