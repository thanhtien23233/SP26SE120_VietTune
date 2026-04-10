namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class QAMessageDto
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public int Role { get; set; }
        public string Content { get; set; } = default!;
        public string? SourceRecordingIdsJson { get; set; }
        public string? SourceKBEntryIdsJson { get; set; }
        public decimal? ConfidenceScore { get; set; }
        public bool FlaggedByExpert { get; set; }
        public Guid? CorrectedByExpertId { get; set; }
        public string? ExpertCorrection { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
