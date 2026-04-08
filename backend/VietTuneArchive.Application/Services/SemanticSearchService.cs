using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Context;

namespace VietTuneArchive.Application.Services
{
    public class SemanticSearchService : ISemanticSearchService
    {
        private readonly DBContext _db;
        private readonly IOpenAIEmbeddingService _embeddingService;
        private readonly ILogger<SemanticSearchService> _logger;

        public SemanticSearchService(
            DBContext db,
            IOpenAIEmbeddingService embeddingService,
            ILogger<SemanticSearchService> logger)
        {
            _db = db;
            _embeddingService = embeddingService;
            _logger = logger;
        }

        public async Task<List<SemanticSearchResult>> SearchAsync(
            string query,
            int topK = 10,
            float minScore = 0.5f,
            CancellationToken ct = default)
        {
            // 1. Sinh embedding cho query (Gemini: dùng taskType RETRIEVAL_QUERY)
            var queryVector = await _embeddingService.GetEmbeddingAsync(query, "RETRIEVAL_QUERY", ct);

            // 2. Load tất cả embeddings từ DB
            var allEmbeddings = await _db.VectorEmbeddings
                .Where(v => v.RecordingId != null)
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
