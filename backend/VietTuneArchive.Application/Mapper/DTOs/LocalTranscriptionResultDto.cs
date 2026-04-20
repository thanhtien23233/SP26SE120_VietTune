namespace VietTuneArchive.Application.Mapper.DTOs
{
    // Map chính xác với response từ Python service
    public class LocalTranscriptionResultDto
    {
        public string Text { get; set; } = string.Empty;              // Full transcript
        public string Language { get; set; } = string.Empty;          // "vi"
        public double? Duration { get; set; }                         // Thời lượng audio (giây)
        public List<TranscriptionSegmentDto> Segments { get; set; } = new();   // Segments có timestamp
        public double ProcessingTime { get; set; }                    // Thời gian Whisper xử lý (giây)
        public string ModelUsed { get; set; } = string.Empty;         // "medium"
    }
}
