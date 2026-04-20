using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class Commune
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid DistrictId { get; set; }

        [ForeignKey("DistrictId")]
        public District? District { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        public decimal? Latitude { get; set; }

        public decimal? Longitude { get; set; }

        // Navigation properties
        public ICollection<Recording>? Recordings { get; set; }
    }
}
