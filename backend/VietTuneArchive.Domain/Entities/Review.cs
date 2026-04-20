using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class Review
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SubmissionId { get; set; }

        [ForeignKey("SubmissionId")]
        public Submission? Submission { get; set; }

        [Required]
        public Guid ReviewerId { get; set; }

        [ForeignKey("ReviewerId")]
        public User? Reviewer { get; set; }

        [Required]
        public int Stage { get; set; } // 0-Screening 1-Verification 2-Approval

        [Required]
        public int Decision { get; set; } // 0-Approve 1-Reject 2-RequestRevision

        public string? Comments { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
