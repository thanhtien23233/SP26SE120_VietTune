using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Domain.Entities
{
    public class Province
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [Required]
        [MaxLength(20)]
        public string RegionCode { get; set; } // Bac-Trung-Nam

        // Navigation properties
        public ICollection<District>? Districts { get; set; }
    }
}
