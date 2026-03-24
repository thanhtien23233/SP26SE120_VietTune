using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AudioAnalysisResultDto
    {
        // 1. Chi tiết từng phán đoán âm nhạc (khớp với items trong Schema)
        public record AIAnalysisItemDto(
           // --- Required fields (từ schema "required") ---
           double Tempo,
           string KeySignature,
           string EthnicGroup,
           string Language,
           List<string> Instruments,
           string Genre,
           string PerformanceContext,

           // --- Optional fields (AI trả hoặc không) ---
           string? Title = null,
           string? Description = null,
           string? VocalStyle = null,
           string? MusicalScale = null,
           string? Composer = null,
           string? RecordingLocation = null,
           string? LyricsOriginal = null,
           string? LyricsVietnamese = null
       );

        // 2. DTO dùng để hứng kết quả trả về từ Gemini Service
        // Đây chính là cái bạn đang tìm "ở đâu"
        public record AIAnalysisResultDto(
            List<AIAnalysisItemDto> Analyses,
            int BestMatch,
            string? GeminiFileUri = null);

        // 4. DTO tổng hợp cuối cùng trả về cho Controller
        public record AudioProcessResultDto(
            AIAnalysisResultDto Analysis, // Toàn bộ kết quả AI ở trên
            DateTime ProcessedAt);

        // DTO cho Background Job (nếu dùng)
        public record AIAnalysisJobDto(
            string JobId,
            string Status,
            int Progress,
            string? Error);
    }
}
