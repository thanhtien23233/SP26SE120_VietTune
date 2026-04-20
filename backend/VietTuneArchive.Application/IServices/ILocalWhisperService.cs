using Microsoft.AspNetCore.Http;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface ILocalWhisperService
    {
        /// <summary>
        /// Gọi Python Whisper service local để transcribe audio
        /// </summary>
        Task<LocalTranscriptionResultDto> TranscribeAsync(IFormFile audioFile, string language = "vi");
        
        /// <summary>
        /// Kiểm tra Python service có đang chạy không
        /// </summary>
        Task<bool> IsHealthyAsync();
    }
}
