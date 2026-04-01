using System;
using System.IO;
using System.Threading.Tasks;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface IInstrumentDetectionService : IDisposable
    {
        Task<MultiInstrumentDetectionResponse> DetectMultipleInstrumentsAsync(Stream audioStream, string fileName);
        string[] SupportedInstruments { get; }
    }
}
