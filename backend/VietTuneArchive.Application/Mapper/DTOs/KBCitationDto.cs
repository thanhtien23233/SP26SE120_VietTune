namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class KBCitationDto
    {
        public Guid Id { get; set; }
        public Guid EntryId { get; set; }
        public string Citation { get; set; } = default!;
        public string? Url { get; set; }
    }
}
