using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface IInstrumentDetectionService
    {
        Task<PythonAnalyzeResponse> DetectInstrumentsAsync(Stream audioStream, string fileName, bool includeTimeline = false);
        Task<string[]> GetSupportedInstrumentsAsync();
    }
}

