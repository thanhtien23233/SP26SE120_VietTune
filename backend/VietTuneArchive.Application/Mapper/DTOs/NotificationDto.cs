namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class NotificationDto
    {
        public string Id { get; set; } = default!;
        public string Title { get; set; } = default!;
        public string Message { get; set; } = default!;
        public string Type { get; set; } = default!;  // submission_approved, review_assigned, new_comment
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? RelatedId { get; set; }  // submissionId, reviewId...
        public string Icon { get; set; } = default!;

        public class UnreadCountDto
        {
            public int Unread { get; set; }
            public int Total { get; set; }
        }
    }
}
