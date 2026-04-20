namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class TagDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Category { get; set; }
    }
}
