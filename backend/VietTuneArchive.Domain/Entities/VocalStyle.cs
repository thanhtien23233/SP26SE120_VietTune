using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class VocalStyle
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; }

        public string? Description { get; set; }

        public Guid? EthnicGroupId { get; set; }

        [ForeignKey("EthnicGroupId")]
        public EthnicGroup? EthnicGroup { get; set; }

        // Navigation properties
        public ICollection<Recording>? Recordings { get; set; }
    }
}
