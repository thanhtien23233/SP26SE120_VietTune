namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AnnotationDetailDto
    {
        public Guid Id { get; set; }
        public Guid RecordingId { get; set; }
        public Guid ExpertId { get; set; }
        public string ExpertName { get; set; } = default!;
        public string Content { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string? ResearchCitation { get; set; }
        public int? TimestampStart { get; set; }
        public int? TimestampEnd { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
