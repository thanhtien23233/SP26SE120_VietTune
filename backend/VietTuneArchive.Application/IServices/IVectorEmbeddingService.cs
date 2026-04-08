using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Application.IServices
{
    public interface IVectorEmbeddingService
    {
        /// <summary>
        /// Sinh embedding cho 1 Recording và lưu vào DB.
        /// Nếu đã có embedding cũ thì thay thế.
        /// </summary>
        Task<VectorEmbedding> GenerateAndSaveAsync(Guid recordingId, CancellationToken ct = default);

        /// <summary>
        /// Sync embedding cho tất cả Recording chưa có embedding.
        /// Trả về số lượng đã sync.
        /// </summary>
        Task<int> SyncAllMissingAsync(CancellationToken ct = default);

        /// <summary>
        /// Sync lại embedding cho tất cả Recording (kể cả đã có).
        /// Dùng khi đổi model version.
        /// </summary>
        Task<int> ResyncAllAsync(string? modelVersion = null, CancellationToken ct = default);

        /// <summary>
        /// Xóa embedding của 1 Recording.
        /// </summary>
        Task DeleteByRecordingIdAsync(Guid recordingId, CancellationToken ct = default);

        /// <summary>
        /// Lấy thống kê: tổng recordings, đã có embedding, chưa có.
        /// </summary>
        Task<EmbeddingSyncStatus> GetSyncStatusAsync(CancellationToken ct = default);

        /// <summary>
        /// Backfill 768-dim embeddings for all recordings and KBEntries.
        /// </summary>
        Task<int> BackfillAll768Async(CancellationToken ct = default);

        /// <summary>
        /// Generate embedding for KBEntry using Gemini.
        /// </summary>
        Task<VectorEmbedding> GenerateAndSaveKBAsync(Guid entryId, CancellationToken ct = default);
    }

    public class EmbeddingSyncStatus
    {
        public int TotalRecordings { get; set; }
        public int WithEmbedding { get; set; }
        public int WithoutEmbedding { get; set; }
        public string CurrentModelVersion { get; set; } = string.Empty;
    }
}
