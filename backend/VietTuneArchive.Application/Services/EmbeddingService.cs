using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class EmbeddingService : IEmbeddingService
    {
        private readonly HttpClient _httpClient;
        private readonly IRecordingRepository _recordingRepository;
        private readonly IVectorEmbeddingRepository _vectorEmbeddingRepository;
        private readonly IKBEntryRepository _kbEntryRepository;

        public EmbeddingService(
            IHttpClientFactory httpClientFactory, 
            IRecordingRepository recordingRepository,
            IVectorEmbeddingRepository vectorEmbeddingRepository,
            IKBEntryRepository kbEntryRepository)
        {
            _httpClient = httpClientFactory.CreateClient("AiService");
            _recordingRepository = recordingRepository;
            _vectorEmbeddingRepository = vectorEmbeddingRepository;
            _kbEntryRepository = kbEntryRepository;
        }

        public class EmbedResponse
        {
            public float[] embedding { get; set; }
        }

        public async Task<float[]> GetEmbeddingAsync(string text)
        {
            var response = await _httpClient.PostAsJsonAsync("/embed", new { text });
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<EmbedResponse>();
            return result.embedding;
        }

        public async Task GenerateEmbeddingForRecordingAsync(Guid recordingId)
        {
            var recording = await _recordingRepository.GetByIdWithDetailsAsync(recordingId);

            if (recording == null) return;

            var textParts = new List<string>();

            if (!string.IsNullOrEmpty(recording.Title))
                textParts.Add($"Tên: {recording.Title}");

            if (!string.IsNullOrEmpty(recording.Description))
                textParts.Add($"Mô tả: {recording.Description}");

            if (recording.EthnicGroup != null)
                textParts.Add($"Dân tộc: {recording.EthnicGroup.Name}");

            if (recording.Ceremony != null)
                textParts.Add($"Nghi lễ: {recording.Ceremony.Name} ({recording.Ceremony.Type})");

            if (recording.VocalStyle != null)
                textParts.Add($"Phong cách hát: {recording.VocalStyle.Name}");

            if (recording.MusicalScale != null)
                textParts.Add($"Thang âm: {recording.MusicalScale.Name}");

            var instruments = recording.RecordingInstruments?
                .Select(ri => ri.Instrument?.Name)
                .Where(n => n != null);
            if (instruments?.Any() == true)
                textParts.Add($"Nhạc cụ: {string.Join(", ", instruments)}");

            if (!string.IsNullOrEmpty(recording.PerformanceContext))
                textParts.Add($"Bối cảnh trình diễn: {recording.PerformanceContext}");

            if (!string.IsNullOrEmpty(recording.LyricsVietnamese))
                textParts.Add($"Lời Việt: {recording.LyricsVietnamese.Substring(0, Math.Min(500, recording.LyricsVietnamese.Length))}");

            var annotations = recording.Annotations?
                .Select(a => a.Content)
                .Where(c => !string.IsNullOrEmpty(c));
            if (annotations?.Any() == true)
                textParts.Add($"Chú thích chuyên gia: {string.Join(". ", annotations.Take(3))}");

            var fullText = string.Join(". ", textParts);
            float[] vector = await GetEmbeddingAsync(fullText);

            var existing = await _vectorEmbeddingRepository
                .GetFirstOrDefaultAsync(v => v.RecordingId == recordingId);

            if (existing != null)
            {
                existing.EmbeddingJson = JsonSerializer.Serialize(vector);
                existing.ModelVersion = "all-MiniLM-L6-v2";
                existing.CreatedAt = DateTime.UtcNow;
                await _vectorEmbeddingRepository.UpdateAsync(existing);
            }
            else
            {
                await _vectorEmbeddingRepository.AddAsync(new VectorEmbedding
                {
                    Id = Guid.NewGuid(),
                    RecordingId = recordingId,
                    EmbeddingJson = JsonSerializer.Serialize(vector),
                    ModelVersion = "all-MiniLM-L6-v2",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        public async Task GenerateEmbeddingForKBEntryAsync(Guid entryId)
        {
            var entry = await _kbEntryRepository.GetByIdAsync(entryId);

            if (entry == null) return;

            var textParts = new List<string>
            {
                $"Tiêu đề: {entry.Title}",
                $"Nội dung: {entry.Content.Substring(0, Math.Min(1500, entry.Content.Length))}"
            };

            var citations = entry.KBCitations?.Select(c => c.Citation).Where(c => !string.IsNullOrEmpty(c));
            if (citations?.Any() == true)
                textParts.Add($"Trích dẫn: {string.Join("; ", citations.Take(5))}");

            var fullText = string.Join(". ", textParts);
            float[] vector = await GetEmbeddingAsync(fullText);

            var existing = await _vectorEmbeddingRepository
                .GetFirstOrDefaultAsync(v => v.KBEntryId == entryId);

            if (existing != null)
            {
                existing.EmbeddingJson = JsonSerializer.Serialize(vector);
                existing.ModelVersion = "all-MiniLM-L6-v2";
                existing.CreatedAt = DateTime.UtcNow;
                await _vectorEmbeddingRepository.UpdateAsync(existing);
            }
            else
            {
                await _vectorEmbeddingRepository.AddAsync(new VectorEmbedding
                {
                    Id = Guid.NewGuid(),
                    KBEntryId = entryId,
                    EmbeddingJson = JsonSerializer.Serialize(vector),
                    ModelVersion = "all-MiniLM-L6-v2",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        public async Task<List<(Guid RecordingId, double Score)>> SearchSimilarRecordingsAsync(float[] queryVector, int topK = 5)
        {
            var allEmbeddings = await _vectorEmbeddingRepository.GetAsync(x => x.RecordingId != null);
            var results = new List<(Guid RecordingId, double Score)>();

            foreach (var doc in allEmbeddings)
            {
                var docVector = JsonSerializer.Deserialize<float[]>(doc.EmbeddingJson);
                if (docVector != null)
                {
                    double score = CosineSimilarity(queryVector, docVector);
                    results.Add((doc.RecordingId.Value, score));
                }
            }

            return results.OrderByDescending(r => r.Score).Take(topK).ToList();
        }

        public async Task<List<(Guid EntryId, double Score)>> SearchSimilarKBEntriesAsync(float[] queryVector, int topK = 5)
        {
            var allEmbeddings = await _vectorEmbeddingRepository.GetAsync(x => x.KBEntryId != null);
            var results = new List<(Guid EntryId, double Score)>();

            foreach (var doc in allEmbeddings)
            {
                var docVector = JsonSerializer.Deserialize<float[]>(doc.EmbeddingJson);
                if (docVector != null)
                {
                    double score = CosineSimilarity(queryVector, docVector);
                    results.Add((doc.KBEntryId.Value, score));
                }
            }

            return results.OrderByDescending(r => r.Score).Take(topK).ToList();
        }

        public async Task GenerateAndStoreEmbeddingAsync(Guid recordingId, string textContent)
        {
             await GenerateEmbeddingForRecordingAsync(recordingId);
        }

        public async Task<int> BackfillAllMissingEmbeddingsAsync()
        {
            int count = 0;

            // 1. Recordings
            var recordings = await _recordingRepository.GetAllAsync();
            var existingRecordings = await _vectorEmbeddingRepository.GetAsync(v => v.RecordingId != null);
            var embeddedRecIds = existingRecordings.Select(v => v.RecordingId.Value).ToHashSet();

            foreach (var rec in recordings)
            {
                if (!embeddedRecIds.Contains(rec.Id))
                {
                    await GenerateEmbeddingForRecordingAsync(rec.Id);
                    count++;
                }
            }

            // 2. KBEntries
            var (kbItems, _) = await _kbEntryRepository.GetAllAsync(new VietTuneArchive.Domain.Entities.DTO.KnowledgeBase.KBEntryQueryParams 
            { 
                Status = 1, 
                PageSize = 10000 
            });
            
            var existingKbs = await _vectorEmbeddingRepository.GetAsync(v => v.KBEntryId != null);
            var embeddedKbIds = existingKbs.Select(v => v.KBEntryId.Value).ToHashSet();

            foreach (var kb in kbItems)
            {
                if (!embeddedKbIds.Contains(kb.Id))
                {
                    await GenerateEmbeddingForKBEntryAsync(kb.Id);
                    count++;
                }
            }

            return count;
        }

        private double CosineSimilarity(float[] a, float[] b)
        {
            if (a.Length != b.Length) return 0;
            double dotProduct = 0, normA = 0, normB = 0;
            for (int i = 0; i < a.Length; i++)
            {
                dotProduct += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            if (normA == 0 || normB == 0) return 0;
            return dotProduct / (Math.Sqrt(normA) * Math.Sqrt(normB));
        }
    }
}
