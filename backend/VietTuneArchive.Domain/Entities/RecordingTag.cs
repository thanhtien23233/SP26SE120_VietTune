using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class RecordingTag
    {
        public Guid RecordingId { get; set; }

        [ForeignKey("RecordingId")]
        public Recording? Recording { get; set; }

        public Guid TagId { get; set; }

        [ForeignKey("TagId")]
        public Tag? Tag { get; set; }
    }
}
