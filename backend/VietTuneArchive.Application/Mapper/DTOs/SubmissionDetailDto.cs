namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class SubmissionDetailDto
    {
        public Guid Id { get; set; }
        public Guid RecordingId { get; set; }
        public Guid ContributorId { get; set; }
        public int CurrentStage { get; set; }
        public int Status { get; set; }
        public string? Notes { get; set; }
        public DateTime SubmittedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class BasicInfoDto
    {
        public string Title { get; set; } = default!;
        public string? Description { get; set; }
    }

    public class CulturalContextDto
    {
        public Guid? EthnicGroupId { get; set; }
        public Guid? CeremonyId { get; set; }
        public string? PerformanceContext { get; set; }
    }

    public class AdditionalInfoDto
    {
        public string? PerformerName { get; set; }
        public int? PerformerAge { get; set; }
        public DateTime? RecordingDate { get; set; }
    }

    public class CopyrightInfoDto
    {
        public string? CopyrightInfo { get; set; }
        public string? Permission { get; set; }
    }

    public class SubmissionStatusDto
    {
        public Guid Id { get; set; }
        public int Status { get; set; }
        public int CurrentStage { get; set; }
        public string StatusName { get; set; } = default!;
        public DateTime UpdatedAt { get; set; }
    }

    public class SubmissionHistoryDto
    {
        public Guid Id { get; set; }
        public DateTime ChangedAt { get; set; }
        public string Action { get; set; } = default!;
        public string? Changes { get; set; }
    }

    public class FeedbackDto
    {
        public Guid Id { get; set; }
        public Guid ReviewerId { get; set; }
        public string Comments { get; set; } = default!;
        public DateTime CreatedAt { get; set; }
    }

    public class SubmissionInstrumentDto
    {
        public Guid InstrumentId { get; set; }
        public string InstrumentName { get; set; } = default!;
    }

    public class SubmissionStatsDto
    {
        public int TotalSubmissions { get; set; }
        public int Pending { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int InReview { get; set; }
        public decimal ApprovalRate { get; set; }
    }
}
