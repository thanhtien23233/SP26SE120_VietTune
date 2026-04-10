using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Domain.Entities
{
    public class Embargo
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid RecordingId { get; set; }

        [ForeignKey("RecordingId")]
        public Recording? Recording { get; set; }

        [Required]
        public EmbargoStatus Status { get; set; }

        public DateTime? EmbargoStartDate { get; set; }

        public DateTime? EmbargoEndDate { get; set; }

        public string? Reason { get; set; }

        [Required]
        public Guid CreatedBy { get; set; }

        [ForeignKey("CreatedBy")]
        public User? User { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}
