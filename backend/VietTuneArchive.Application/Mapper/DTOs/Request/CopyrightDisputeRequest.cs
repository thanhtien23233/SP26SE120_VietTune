namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class CreateCopyrightDisputeRequest
    {
        public Guid RecordingId { get; set; }
        public Guid? SubmissionId { get; set; }
        public Guid ReportedByUserId { get; set; }
        public string ReasonCode { get; set; } = string.Empty; // ownership|unauthorized_use|plagiarism|other
        public string Description { get; set; } = string.Empty;
        public List<string> EvidenceUrls { get; set; } = new List<string>();
    }

    public class AssignReviewerRequest
    {
        public Guid ReviewerId { get; set; }
    }

    public class ResolveDisputeRequest
    {
        public string Resolution { get; set; } = string.Empty; // resolved_keep|resolved_remove|rejected_report
        public string ResolutionNotes { get; set; } = string.Empty;
        public bool NotifyContributor { get; set; }
    }
}
