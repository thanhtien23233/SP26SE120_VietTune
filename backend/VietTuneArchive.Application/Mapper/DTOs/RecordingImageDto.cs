namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class RecordingImageDto
    {
        public Guid Id { get; set; }
        public Guid RecordingId { get; set; }
        public string ImageUrl { get; set; } = default!;
        public string? Caption { get; set; }
        public int SortOrder { get; set; }
    }
}
