using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class EthnicGroupCeremony
    {
        public Guid EthnicGroupId { get; set; }

        [ForeignKey("EthnicGroupId")]
        public EthnicGroup? EthnicGroup { get; set; }

        public Guid CeremonyId { get; set; }

        [ForeignKey("CeremonyId")]
        public Ceremony? Ceremony { get; set; }
    }
}
