using Microsoft.AspNetCore.Http;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface ITranscriptionService
    {
        Task<TranscriptionResultDto> TranscribeAsync(IFormFile audioFile);
        Task<TranscriptionResultDto> TranscribeAsync(Stream audioStream, string fileName);
    }
}
