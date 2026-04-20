using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VietTuneArchive.Domain.Entities
{
    public class QAMessage
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ConversationId { get; set; }

        [ForeignKey("ConversationId")]
        public QAConversation? Conversation { get; set; }

        [Required]
        public int Role { get; set; } // 0-User 1-Assistant

        [Required]
        public string Content { get; set; }

        public string? SourceRecordingIdsJson { get; set; }

        public string? SourceKBEntryIdsJson { get; set; }

        public decimal? ConfidenceScore { get; set; }

        [Required]
        public bool FlaggedByExpert { get; set; }

        public Guid? CorrectedByExpertId { get; set; }

        [ForeignKey("CorrectedByExpertId")]
        public User? CorrectedByExpert { get; set; }

        public string? ExpertCorrection { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
