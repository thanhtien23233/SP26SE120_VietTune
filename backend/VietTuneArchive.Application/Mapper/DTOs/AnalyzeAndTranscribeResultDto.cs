using static VietTuneArchive.Application.Mapper.DTOs.AudioAnalysisResultDto;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AnalyzeAndTranscribeResultDto
    {
        public AIAnalysisResultDto? Analysis { get; set; }
        public TranscriptionResultDto? Transcription { get; set; }
    }
}
