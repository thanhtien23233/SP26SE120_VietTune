namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class TranscriptionSegmentDto
    {
        public double Start { get; set; }
        public double End { get; set; }
        public string Text { get; set; } = string.Empty;
    }
}
