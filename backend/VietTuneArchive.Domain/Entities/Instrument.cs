using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class Instrument
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; }

        [Required]
        [MaxLength(50)]
        public string Category { get; set; } // String-Wind-Percussion-Vocal

        public string? Description { get; set; }

        [MaxLength(200)]
        public string? TuningSystem { get; set; }

        public string? ConstructionMethod { get; set; }

        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        public Guid? OriginEthnicGroupId { get; set; }

        [ForeignKey("OriginEthnicGroupId")]
        public EthnicGroup? OriginEthnicGroup { get; set; }

        // Navigation properties
        public ICollection<RecordingInstrument>? RecordingInstruments { get; set; }
        public ICollection<InstrumentEthnicGroup>? InstrumentEthnicGroups { get; set; }
    }
}
