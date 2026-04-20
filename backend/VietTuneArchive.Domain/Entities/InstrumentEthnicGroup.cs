using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class InstrumentEthnicGroup
    {
        public Guid InstrumentId { get; set; }

        [ForeignKey("InstrumentId")]
        public Instrument? Instrument { get; set; }

        public Guid EthnicGroupId { get; set; }

        [ForeignKey("EthnicGroupId")]
        public EthnicGroup? EthnicGroup { get; set; }
    }
}
