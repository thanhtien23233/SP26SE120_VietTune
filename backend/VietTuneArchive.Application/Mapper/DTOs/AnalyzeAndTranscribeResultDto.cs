using static VietTuneArchive.Application.Mapper.DTOs.AudioAnalysisResultDto;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AnalyzeAndTranscribeResultDto
    {
        public AIAnalysisResultDto? Analysis { get; set; }                  // Kết quả phân tích (DTO cũ, dùng lại)
        public LocalTranscriptionResultDto? Transcription { get; set; }     // Kết quả transcript
        public Dictionary<string, string>? Errors { get; set; }             // Để lưu error message nếu 1 trong 2 task fail
    }
}
