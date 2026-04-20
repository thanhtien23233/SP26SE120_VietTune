namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class EthnicGroupDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public string? LanguageFamily { get; set; }
        public string? PrimaryRegion { get; set; }
        public string? ImageUrl { get; set; }
    }
}
