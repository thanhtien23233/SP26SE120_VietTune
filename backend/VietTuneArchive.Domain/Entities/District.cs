using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class District
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ProvinceId { get; set; }

        [ForeignKey("ProvinceId")]
        public Province? Province { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        // Navigation properties
        public ICollection<Commune>? Communes { get; set; }
    }
}
