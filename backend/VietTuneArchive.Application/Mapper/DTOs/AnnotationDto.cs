namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AnnotationDto
    {
        public Guid Id { get; set; }
        public Guid RecordingId { get; set; }
        public Guid ExpertId { get; set; }
        public string Content { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string? ResearchCitation { get; set; }
        public int? TimestampStart { get; set; }
        public int? TimestampEnd { get; set; }
        public DateTime CreatedAt { get; set; }
    }
    public class CreateAnnotationDto
    {
        public Guid RecordingId { get; set; }
        public Guid ExpertId { get; set; }
        public string Content { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string? ResearchCitation { get; set; }
        public int? TimestampStart { get; set; }
        public int? TimestampEnd { get; set; }
    }
    public class UpdateAnnotationDto
    {
        public Guid Id { get; set; }
        public Guid RecordingId { get; set; }
        public Guid ExpertId { get; set; }
        public string Content { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string? ResearchCitation { get; set; }
        public int? TimestampStart { get; set; }
        public int? TimestampEnd { get; set; }
    }
}
