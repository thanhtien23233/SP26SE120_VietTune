namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class KBEntryDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = default!;
        public string Slug { get; set; } = default!;
        public string Content { get; set; } = default!;
        public string Category { get; set; } = default!;
        public Guid AuthorId { get; set; }
        public int Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
