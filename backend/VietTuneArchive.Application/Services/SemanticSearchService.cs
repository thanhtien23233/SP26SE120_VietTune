using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Context;

namespace VietTuneArchive.Application.Services
{
    public class SemanticSearchService : ISemanticSearchService
    {
        private readonly DBContext _db;
        private readonly IEmbeddingService _localEmbeddingService;
        private readonly IOpenAIEmbeddingService _geminiEmbeddingService;
        private readonly GeminiOptions _geminiOptions;
        private readonly ILogger<SemanticSearchService> _logger;

        public SemanticSearchService(
            DBContext db,
            IEmbeddingService localEmbeddingService,
            IOpenAIEmbeddingService geminiEmbeddingService,
            IOptions<GeminiOptions> geminiOptions,
            ILogger<SemanticSearchService> logger)
        {
            _db = db;
            _localEmbeddingService = localEmbeddingService;
            _geminiEmbeddingService = geminiEmbeddingService;
            _geminiOptions = geminiOptions.Value;
            _logger = logger;
        }

        public async Task<List<SemanticSearchResult>> SearchAsync(
            string query,
            int topK = 10,
            float minScore = 0.5f,
            CancellationToken ct = default)
        {
            // 1. Sinh embedding cho query (Sử dụng Python AI local model - 384 dim)
            var queryVector = await _localEmbeddingService.GetEmbeddingAsync(query);
            string modelVer = "all-MiniLM-L6-v2";

            // 2. Load embeddings từ DB khớp với model version
            var allEmbeddings = await _db.VectorEmbeddings
                .Where(v => v.RecordingId != null && v.ModelVersion == modelVer)
                .Select(v => new { RecordingId = v.RecordingId.Value, v.EmbeddingJson })
                .ToListAsync(ct);

            // 3. Tính cosine similarity
            var scored = new List<(Guid RecordingId, float Score)>();
            foreach (var item in allEmbeddings)
            {
                var vector = JsonSerializer.Deserialize<float[]>(item.EmbeddingJson);
                if (vector == null) continue;

                var score = CosineSimilarity(queryVector, vector);
                if (score >= minScore)
                    scored.Add((item.RecordingId, score));
            }

            // 4. Sắp xếp và lấy top K
            var topResults = scored
                .OrderByDescending(s => s.Score)
                .Take(topK)
                .ToList();

            if (!topResults.Any())
                return new List<SemanticSearchResult>();

            // 5. Load recording details cho kết quả
            var recordingIds = topResults.Select(r => r.RecordingId).ToList();
            var recordings = await _db.Recordings
                .Include(r => r.EthnicGroup)
                .Include(r => r.Ceremony)
                .Include(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Where(r => recordingIds.Contains(r.Id))
                .ToDictionaryAsync(r => r.Id, ct);

            // 6. Map kết quả
            return topResults
                .Where(t => recordings.ContainsKey(t.RecordingId))
                .Select(t =>
                {
                    var rec = recordings[t.RecordingId];
                    return new SemanticSearchResult
                    {
                        RecordingId = t.RecordingId,
                        Title = rec.Title ?? "Untitled",
                        SimilarityScore = t.Score,
                        EthnicGroupName = rec.EthnicGroup?.Name,
                        CeremonyName = rec.Ceremony?.Name,
                        PerformerName = rec.PerformerName,
                        InstrumentNames = rec.RecordingInstruments?
                            .Select(ri => ri.Instrument?.Name ?? "")
                            .Where(n => !string.IsNullOrEmpty(n))
                            .ToList() ?? new()
                    };
                })
                .ToList();
        }

        public async Task<List<SemanticSearchResult>> Search768Async(
            string query,
            int topK = 10,
            float minScore = 0.5f,
            CancellationToken ct = default)
        {
            // 1. Sinh embedding cho query (Sử dụng Gemini - 768 dim)
            var queryVector = await _geminiEmbeddingService.GetEmbeddingAsync(query, "RETRIEVAL_QUERY", ct);
            string modelVer = _geminiOptions.EmbeddingModel; // e.g. text-embedding-004

            // 2. Load embeddings từ DB khớp với model version
            var allEmbeddings = await _db.VectorEmbeddings
                .Where(v => v.RecordingId != null && v.ModelVersion == modelVer)
                .Select(v => new { RecordingId = v.RecordingId.Value, v.EmbeddingJson })
                .ToListAsync(ct);

            // 3. Tính cosine similarity
            var scored = new List<(Guid RecordingId, float Score)>();
            foreach (var item in allEmbeddings)
            {
                var vector = JsonSerializer.Deserialize<float[]>(item.EmbeddingJson);
                if (vector == null) continue;

                var score = CosineSimilarity(queryVector, vector);
                if (score >= minScore)
                    scored.Add((item.RecordingId, score));
            }

            // 4. Sắp xếp và lấy top K
            var topResults = scored
                .OrderByDescending(s => s.Score)
                .Take(topK)
                .ToList();

            if (!topResults.Any())
                return new List<SemanticSearchResult>();

            // 5. Load recording details
            var recordingIds = topResults.Select(r => r.RecordingId).ToList();
            var recordings = await _db.Recordings
                .Include(r => r.EthnicGroup)
                .Include(r => r.Ceremony)
                .Include(r => r.RecordingInstruments).ThenInclude(ri => ri.Instrument)
                .Where(r => recordingIds.Contains(r.Id))
                .ToDictionaryAsync(r => r.Id, ct);

            // 6. Map kết quả
            return topResults
                .Where(t => recordings.ContainsKey(t.RecordingId))
                .Select(t =>
                {
                    var rec = recordings[t.RecordingId];
                    return new SemanticSearchResult
                    {
                        RecordingId = t.RecordingId,
                        Title = rec.Title ?? "Untitled",
                        SimilarityScore = t.Score,
                        EthnicGroupName = rec.EthnicGroup?.Name,
                        CeremonyName = rec.Ceremony?.Name,
                        PerformerName = rec.PerformerName,
                        InstrumentNames = rec.RecordingInstruments?
                            .Select(ri => ri.Instrument?.Name ?? "")
                            .Where(n => !string.IsNullOrEmpty(n))
                            .ToList() ?? new()
                    };
                })
                .ToList();
        }

        private static float CosineSimilarity(float[] a, float[] b)
        {
            if (a.Length != b.Length) return 0f;

            float dotProduct = 0f, normA = 0f, normB = 0f;
            for (int i = 0; i < a.Length; i++)
            {
                dotProduct += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }

            var denominator = MathF.Sqrt(normA) * MathF.Sqrt(normB);
            return denominator == 0 ? 0f : dotProduct / denominator;
        }
    }
}
