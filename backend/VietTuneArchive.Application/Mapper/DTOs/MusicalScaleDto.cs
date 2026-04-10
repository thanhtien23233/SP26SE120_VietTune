namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class MusicalScaleDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public string? NotePattern { get; set; }
    }
}
