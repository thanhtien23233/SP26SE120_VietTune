namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class TranscriptionResultDto
    {
        public string Text { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
        public double? Duration { get; set; }
        public List<TranscriptionSegmentDto> Segments { get; set; } = new();
    }
}
