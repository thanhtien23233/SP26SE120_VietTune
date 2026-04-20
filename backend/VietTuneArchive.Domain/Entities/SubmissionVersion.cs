using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class SubmissionVersion
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SubmissionId { get; set; }

        [ForeignKey("SubmissionId")]
        public Submission? Submission { get; set; }

        [Required]
        public int VersionNumber { get; set; }

        public string? ChangesJson { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
