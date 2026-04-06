using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace VietTuneArchive.Application.IServices
{
    public interface IEmbeddingService
    {
        Task<float[]> GetEmbeddingAsync(string text);
        Task<List<(Guid RecordingId, double Score)>> SearchSimilarAsync(float[] queryVector, int topK = 5);
        Task GenerateAndStoreEmbeddingAsync(Guid recordingId, string textContent);
    }
}
