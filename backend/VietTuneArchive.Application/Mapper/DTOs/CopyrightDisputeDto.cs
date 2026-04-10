using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class CopyrightDisputeDto
    {
        public Guid Id { get; set; }
        public Guid RecordingId { get; set; }
        public string? RecordingTitle { get; set; }
        public Guid? SubmissionId { get; set; }
        public Guid ReportedByUserId { get; set; }
        public string? ReportedByUserName { get; set; }
        public CopyrightDisputeReason ReasonCode { get; set; }
        public string Description { get; set; } = string.Empty;
        public List<string> EvidenceUrls { get; set; } = new List<string>();
        public CopyrightDisputeStatus Status { get; set; }
        public Guid? AssignedReviewerId { get; set; }
        public string? AssignedReviewerName { get; set; }
        public CopyrightDisputeResolution? Resolution { get; set; }
        public string? ResolutionNotes { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
