namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class SubmissionVersionDto
    {
        public Guid Id { get; set; }
        public Guid SubmissionId { get; set; }
        public int VersionNumber { get; set; }
        public string? ChangesJson { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateSubmissionVersionDto
    {
        public Guid SubmissionId { get; set; }
        public string? ChangesJson { get; set; }
    }

    public class UpdateSubmissionVersionDto
    {
        public string? ChangesJson { get; set; }
    }
}
