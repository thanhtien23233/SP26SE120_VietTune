namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class CeremonyDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string? Description { get; set; }
        public string? Season { get; set; }
    }
}
