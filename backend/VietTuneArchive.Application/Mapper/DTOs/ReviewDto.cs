namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class ReviewDto
    {
        public Guid Id { get; set; }
        public Guid SubmissionId { get; set; }
        public Guid ReviewerId { get; set; }
        public int Stage { get; set; }
        public int Decision { get; set; }
        public string? Comments { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
