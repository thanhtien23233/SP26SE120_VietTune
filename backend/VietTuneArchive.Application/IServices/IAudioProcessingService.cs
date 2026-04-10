using Microsoft.AspNetCore.Http;
using static VietTuneArchive.Application.Mapper.DTOs.AudioAnalysisResultDto;

namespace VietTuneArchive.Application.IServices
{
    public interface IAudioProcessingService
    {
        Task<AudioProcessResultDto> ProcessAudioAsync(IFormFile audioFile, string userId);

        Task<AIAnalysisResultDto> AnalyzeAudioAsync(IFormFile audioFile);
    }
}
