namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AudioAnalysisResultDto
    {
        // 1. Chi tiết từng phán đoán âm nhạc (khớp với items trong Schema)
        public record DbRefDto(
           Guid Id,
           string Name
       );

        public record InstrumentRefDto(
            Guid Id,
            string Name,
            double Confidence,
            double? MaxConfidence = null,
            double? OverallAverage = null,
            double? FrameRatio = null,
            int? DominantFrames = null,
            int? TotalFrames = null
        );

        /// <summary>
        /// Gợi ý vùng miền dựa trên đặc trưng âm nhạc.
        /// </summary>
        public record RegionSuggestionDto(
            string Region,
            string? Detail = null
        );

        /// <summary>
        /// Phân loại tổng hợp bài hát / bản ghi.
        /// </summary>
        public record ClassificationDto(
            string PerformanceType,
            string? CulturalContext = null,
            List<string>? Tags = null
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
            List<InstrumentRefDto> Instruments,
            string PerformanceContext,

            // --- AI suggestion fields (gợi ý cho FE form) ---
            RegionSuggestionDto? RegionSuggestion = null,
            ClassificationDto? Classification = null,
            double OverallConfidence = 0.0,

            // --- Optional fields ---
            string? Title = null,
            DbRefDto? Ceremony = null,
            DbRefDto? VocalStyle = null,
            DbRefDto? MusicalScale = null,
            string? Composer = null,
            string? RecordingLocation = null,
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
