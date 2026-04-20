using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Domain.Entities
{
    public class Ceremony
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; }

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } // Wedding-Funeral-Harvest-Festival-Daily-Ritual

        public string? Description { get; set; }

        [MaxLength(50)]
        public string? Season { get; set; }

        // Navigation properties
        public ICollection<Recording>? Recordings { get; set; }
        public ICollection<EthnicGroupCeremony>? EthnicGroupCeremonies { get; set; }
    }
}
