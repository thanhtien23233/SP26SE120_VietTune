using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Domain.Entities
{
    public class Submission
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid? RecordingId { get; set; }

        [ForeignKey("RecordingId")]
        public Recording? Recording { get; set; }

        [Required]
        public Guid ContributorId { get; set; }

        [ForeignKey("ContributorId")]
        public User? Contributor { get; set; }

        [Required]
        public int CurrentStage { get; set; } // 0-Screening 1-Verification 2-Approval

        [Required]
        public SubmissionStatus Status { get; set; }

        public Guid? ReviewerId { get; set; }

        [ForeignKey("ReviewerId")]
        public User? Reviewer { get; set; }

        public string? Notes { get; set; }

        [Required]
        public DateTime SubmittedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public ICollection<SubmissionVersion>? SubmissionVersions { get; set; }
        public ICollection<Review>? Reviews { get; set; }
    }
}
