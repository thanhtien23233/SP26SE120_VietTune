using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class RecordingInstrument
    {
        public Guid RecordingId { get; set; }

        [ForeignKey("RecordingId")]
        public Recording? Recording { get; set; }

        public Guid InstrumentId { get; set; }

        [ForeignKey("InstrumentId")]
        public Instrument? Instrument { get; set; }

        [MaxLength(500)]
        public string? PlayingTechnique { get; set; }
    }
}
