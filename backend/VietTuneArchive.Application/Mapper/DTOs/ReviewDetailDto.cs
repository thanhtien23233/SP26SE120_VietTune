namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class ReviewStatsDto
    {
        public int TotalReviews { get; set; }
        public int Pending { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int RequestedChanges { get; set; }
        public decimal ApprovalRate { get; set; }
        public decimal AverageReviewTime { get; set; }
    }

    public class ReviewQueueItemDto
    {
        public Guid Id { get; set; }
        public Guid SubmissionId { get; set; }
        public string SubmissionTitle { get; set; } = default!;
        public int Stage { get; set; }
        public DateTime SubmittedAt { get; set; }
        public int DaysWaiting { get; set; }
    }

    public class ReviewDetailDto
    {
        public Guid Id { get; set; }
        public Guid SubmissionId { get; set; }
        public Guid ReviewerId { get; set; }
        public string ReviewerName { get; set; } = default!;
        public int Stage { get; set; }
        public int Decision { get; set; }
        public string? Comments { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ReviewDecisionDto
    {
        public Guid ReviewId { get; set; }
        public int Decision { get; set; }
        public string DecisionName { get; set; } = default!;
        public DateTime DecidedAt { get; set; }
    }

    public class ReviewHistoryDto
    {
        public Guid Id { get; set; }
        public Guid ReviewerId { get; set; }
        public string ReviewerName { get; set; } = default!;
        public int Stage { get; set; }
        public int Decision { get; set; }
        public string? Comments { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ReviewSummaryDto
    {
        public Guid Id { get; set; }
        public Guid SubmissionId { get; set; }
        public string SubmissionTitle { get; set; } = default!;
        public int Decision { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ReviewStatisticsDto
    {
        public int TotalCompleted { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int RequestedChanges { get; set; }
        public decimal ApprovalRate { get; set; }
        public decimal AverageTime { get; set; }
    }
}
