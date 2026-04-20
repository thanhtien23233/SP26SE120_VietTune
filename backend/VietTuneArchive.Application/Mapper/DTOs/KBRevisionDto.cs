namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class KBRevisionDto
    {
        public Guid Id { get; set; }
        public Guid EntryId { get; set; }
        public Guid EditorId { get; set; }
        public string Content { get; set; } = default!;
        public string? RevisionNote { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
