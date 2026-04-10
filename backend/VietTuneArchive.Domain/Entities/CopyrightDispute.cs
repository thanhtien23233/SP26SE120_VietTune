using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Domain.Entities
{
    public class CopyrightDispute
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid RecordingId { get; set; }

        [ForeignKey("RecordingId")]
        public Recording? Recording { get; set; }

        public Guid? SubmissionId { get; set; }

        [ForeignKey("SubmissionId")]
        public Submission? Submission { get; set; }

        [Required]
        public Guid ReportedByUserId { get; set; }

        [ForeignKey("ReportedByUserId")]
        public User? ReportedByUser { get; set; }

        [Required]
        public CopyrightDisputeReason ReasonCode { get; set; }

        [Required]
        public string Description { get; set; } = string.Empty;

        public List<string> EvidenceUrls { get; set; } = new List<string>();

        [Required]
        public CopyrightDisputeStatus Status { get; set; } = CopyrightDisputeStatus.Pending;

        public Guid? AssignedReviewerId { get; set; }

        [ForeignKey("AssignedReviewerId")]
        public User? AssignedReviewer { get; set; }

        public CopyrightDisputeResolution? Resolution { get; set; }

        public string? ResolutionNotes { get; set; }

        public DateTime? ResolvedAt { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}
