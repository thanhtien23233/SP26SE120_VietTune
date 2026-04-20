using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Domain.Entities
{
    public class User
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string FullName { get; set; }

        [Required]
        [MaxLength(256)]
        public string Email { get; set; }

        [Required]
        [MaxLength(500)]
        public string PasswordHash { get; set; }
        [Required]
        [MaxLength(500)]
        public string Password { get; set; }
        public string? ConfirmEmailToken { get; set; }
        public bool IsEmailConfirmed { get; set; } = false;
        public string? ResetPasswordToken { get; set; }
        public DateTime? ResetPasswordTokenExpiry { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(500)]
        public string? AvatarUrl { get; set; }

        [Required]
        public string Role { get; set; } // 1-Contributor 2-Researcher 3-Expert 4-Admin

        [MaxLength(1000)]
        public string? AcademicCredentials { get; set; }

        [Required]
        public decimal ContributionScore { get; set; }

        [Required]
        public bool IsActive { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public ICollection<RefreshToken>? RefreshTokens { get; set; }
        public ICollection<Recording>? Recordings { get; set; }
        public ICollection<Submission>? Submissions { get; set; }
        public ICollection<Submission>? AssignedSubmissions { get; set; }
        public ICollection<Review>? Reviews { get; set; }
        public ICollection<Annotation>? Annotations { get; set; }
        public ICollection<QAConversation>? QAConversations { get; set; }
        public ICollection<QAMessage>? CorrectedQAMessages { get; set; }
        public ICollection<KBEntry>? KBEntries { get; set; }
        public ICollection<KBRevision>? KBRevisions { get; set; }
        public ICollection<AuditLog>? AuditLogs { get; set; }
        public ICollection<Notification>? Notifications { get; set; }
        public ICollection<UserConnection>? UserConnections { get; set; }
    }
}
