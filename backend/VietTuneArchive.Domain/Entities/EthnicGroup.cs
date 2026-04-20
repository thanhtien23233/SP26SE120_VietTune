using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Domain.Entities
{
    public class EthnicGroup
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        public string? Description { get; set; }

        [MaxLength(100)]
        public string? LanguageFamily { get; set; }

        [MaxLength(200)]
        public string? PrimaryRegion { get; set; }

        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        // Navigation properties
        public ICollection<Instrument>? OriginInstruments { get; set; }
        public ICollection<VocalStyle>? VocalStyles { get; set; }
        public ICollection<Recording>? Recordings { get; set; }
        public ICollection<EthnicGroupCeremony>? EthnicGroupCeremonies { get; set; }
        public ICollection<InstrumentEthnicGroup>? InstrumentEthnicGroups { get; set; }
    }
}
