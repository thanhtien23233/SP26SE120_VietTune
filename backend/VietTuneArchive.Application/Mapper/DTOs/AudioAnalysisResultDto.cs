namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AudioAnalysisResultDto
    {
        // 1. Chi tiết từng phán đoán âm nhạc (khớp với items trong Schema)
        public record DbRefDto(
           Guid Id,
           string Name
       );

        /// <summary>
        /// Token usage trả về từ Gemini API.
        /// </summary>
        public record TokenUsageDto(
            int PromptTokenCount,
            int CandidatesTokenCount,
            int? TotalTokenCount
        );

        /// <summary>
        /// Kết quả phân tích AI — CHỈ 1 kết quả duy nhất (không còn mảng analyses).
        /// Các field tham chiếu DB trả về DbRefDto (id + name).
        /// </summary>
        public record AIAnalysisResultDto(
            // --- Required fields ---
            double Tempo,
            string KeySignature,
            DbRefDto? EthnicGroup,
            string Language,
            List<DbRefDto> Instruments,
            string Genre,
            string PerformanceContext,

            // --- Optional fields ---
            string? Title = null,
            DbRefDto? Ceremony = null,
            DbRefDto? VocalStyle = null,
            DbRefDto? MusicalScale = null,
            string? Composer = null,
            string? RecordingLocation = null,
            string? LyricsOriginal = null,
            string? LyricsVietnamese = null,
            string? GeminiFileUri = null,

            // --- Token usage ---
            TokenUsageDto? TokenUsage = null
        );

        /// <summary>
        /// Kết quả xử lý audio hoàn chỉnh
        /// </summary>
        public record AudioProcessResultDto(
            AIAnalysisResultDto AnalysisResult,
            DateTime ProcessedAt
        );
        // DTO cho Background Job (nếu dùng)
        public record AIAnalysisJobDto(
            string JobId,
            string Status,
            int Progress,
            string? Error);
    }
}
