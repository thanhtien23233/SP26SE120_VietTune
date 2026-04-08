using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Application.Services
{
    public class VectorEmbeddingService : IVectorEmbeddingService
    {
        private readonly DBContext _db;
        private readonly IOpenAIEmbeddingService _embeddingService;
        private readonly IEmbeddingTextBuilder _textBuilder;
        private readonly GeminiOptions _options;
        private readonly ILogger<VectorEmbeddingService> _logger;

        public VectorEmbeddingService(
            DBContext db,
            IOpenAIEmbeddingService embeddingService,
            IEmbeddingTextBuilder textBuilder,
            IOptions<GeminiOptions> options,
            ILogger<VectorEmbeddingService> logger)
        {
            _db = db;
            _embeddingService = embeddingService;
            _textBuilder = textBuilder;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<VectorEmbedding> GenerateAndSaveAsync(
            Guid recordingId, CancellationToken ct = default)
        {
            // 1. Load recording với đầy đủ navigation properties
            var recording = await GetRecordingWithIncludes(recordingId, ct);
            if (recording == null)
                throw new KeyNotFoundException($"Recording {recordingId} not found.");

            // 2. Build text
            var text = _textBuilder.BuildSearchableText(recording);
            if (string.IsNullOrWhiteSpace(text))
                throw new InvalidOperationException(
                    $"Recording {recordingId} has no metadata to generate embedding.");

            // 3. Gọi OpenAI
            var embeddingVector = await _embeddingService.GetEmbeddingAsync(text, ct);

            // 4. Xóa embedding cũ nếu có
            var existing = await _db.VectorEmbeddings
                .FirstOrDefaultAsync(v => v.RecordingId == recordingId, ct);
            if (existing != null)
                _db.VectorEmbeddings.Remove(existing);

            // 5. Tạo mới
            var vectorEmbedding = new VectorEmbedding
            {
                Id = Guid.NewGuid(),
                RecordingId = recordingId,
                EmbeddingJson = JsonSerializer.Serialize(embeddingVector),
                ModelVersion = _options.EmbeddingModel,
                CreatedAt = DateTime.UtcNow
            };

            _db.VectorEmbeddings.Add(vectorEmbedding);
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Generated embedding for Recording {RecordingId}, vector dim={Dim}",
                recordingId, embeddingVector.Length);

            return vectorEmbedding;
        }

        public async Task<int> SyncAllMissingAsync(CancellationToken ct = default)
        {
            // Lấy các Recording chưa có embedding
            var recordingIds = await _db.Recordings
                .Where(r => r.Status == SubmissionStatus.Approved) // chỉ sync recording đã published
                .Where(r => !_db.VectorEmbeddings.Any(v => v.RecordingId == r.Id))
                .Select(r => r.Id)
                .ToListAsync(ct);

            _logger.LogInformation("Found {Count} recordings without embeddings", recordingIds.Count);

            int synced = 0;
            foreach (var id in recordingIds)
            {
                try
                {
                    await GenerateAndSaveAsync(id, ct);
                    synced++;

                    // Rate limit: delay 200ms giữa các request
                    await Task.Delay(200, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "Failed to generate embedding for Recording {RecordingId}", id);
                }
            }

            return synced;
        }

        public async Task<int> ResyncAllAsync(
            string? modelVersion = null, CancellationToken ct = default)
        {
            var recordingIds = await _db.Recordings
                .Where(r => r.Status == SubmissionStatus.Approved)
                .Select(r => r.Id)
                .ToListAsync(ct);

            int synced = 0;
            foreach (var id in recordingIds)
            {
                try
                {
                    await GenerateAndSaveAsync(id, ct);
                    synced++;
                    await Task.Delay(200, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "Failed to resync embedding for Recording {RecordingId}", id);
                }
            }

            return synced;
        }

        public async Task DeleteByRecordingIdAsync(
            Guid recordingId, CancellationToken ct = default)
        {
            var existing = await _db.VectorEmbeddings
                .FirstOrDefaultAsync(v => v.RecordingId == recordingId, ct);
            if (existing != null)
            {
                _db.VectorEmbeddings.Remove(existing);
                await _db.SaveChangesAsync(ct);
            }
        }

        public async Task<int> BackfillAll768Async(CancellationToken ct = default)
        {
            int synced = 0;
            string modelVer = _options.EmbeddingModel;

            // 1. Recordings missing 768-dim
            var recordingIds = await _db.Recordings
                .Where(r => r.Status == SubmissionStatus.Approved)
                .Where(r => !_db.VectorEmbeddings.Any(v => v.RecordingId == r.Id && v.ModelVersion == modelVer))
                .Select(r => r.Id)
                .ToListAsync(ct);

            foreach (var id in recordingIds)
            {
                try { await GenerateAndSaveAsync(id, ct); synced++; await Task.Delay(200, ct); }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed 768-dim Recording {Id}", id); }
            }

            // 2. KBEntries missing 768-dim
            var kbIds = await _db.KBEntries
                .Where(kb => kb.Status == 1) // Published
                .Where(kb => !_db.VectorEmbeddings.Any(v => v.KBEntryId == kb.Id && v.ModelVersion == modelVer))
                .Select(kb => kb.Id)
                .ToListAsync(ct);

            foreach (var id in kbIds)
            {
                try { await GenerateAndSaveKBAsync(id, ct); synced++; await Task.Delay(200, ct); }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed 768-dim KBEntry {Id}", id); }
            }

            return synced;
        }

        public async Task<VectorEmbedding> GenerateAndSaveKBAsync(Guid entryId, CancellationToken ct = default)
        {
            var kb = await _db.KBEntries.FirstOrDefaultAsync(k => k.Id == entryId, ct);
            if (kb == null) throw new KeyNotFoundException($"KBEntry {entryId} not found.");

            // Text for KBEntry: Title + Content (limited)
            var text = $"{kb.Title}. {kb.Content}";
            if (text.Length > 2000) text = text.Substring(0, 2000);

            var embeddingVector = await _embeddingService.GetEmbeddingAsync(text, ct);

            string modelVer = _options.EmbeddingModel;
            var existing = await _db.VectorEmbeddings
                .FirstOrDefaultAsync(v => v.KBEntryId == entryId && v.ModelVersion == modelVer, ct);
            
            if (existing != null) _db.VectorEmbeddings.Remove(existing);

            var vectorEmbedding = new VectorEmbedding
            {
                Id = Guid.NewGuid(),
                KBEntryId = entryId,
                EmbeddingJson = JsonSerializer.Serialize(embeddingVector),
                ModelVersion = modelVer,
                CreatedAt = DateTime.UtcNow
            };

            _db.VectorEmbeddings.Add(vectorEmbedding);
            await _db.SaveChangesAsync(ct);

            return vectorEmbedding;
        }

        public async Task<EmbeddingSyncStatus> GetSyncStatusAsync(
            CancellationToken ct = default)
        {
            var totalRecordings = await _db.Recordings.CountAsync(ct);
            var withEmbedding = await _db.VectorEmbeddings.CountAsync(ct);

            return new EmbeddingSyncStatus
            {
                TotalRecordings = totalRecordings,
                WithEmbedding = withEmbedding,
                WithoutEmbedding = totalRecordings - withEmbedding,
                CurrentModelVersion = _options.EmbeddingModel
            };
        }

        private async Task<Recording?> GetRecordingWithIncludes(
            Guid recordingId, CancellationToken ct)
        {
            return await _db.Recordings
                .Include(r => r.EthnicGroup)
                .Include(r => r.Ceremony)
                .Include(r => r.VocalStyle)
                .Include(r => r.MusicalScale)
                .Include(r => r.Commune)
                    .ThenInclude(c => (c != null) ? c.District : null)
                        .ThenInclude(d => (d != null) ? d.Province : null)
                .Include(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Include(r => r.RecordingTags)
                    .ThenInclude(rt => rt.Tag)
                .FirstOrDefaultAsync(r => r.Id == recordingId, ct);
        }
    }
}
