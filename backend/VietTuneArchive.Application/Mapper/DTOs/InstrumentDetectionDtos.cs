using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    // ============================================================
    // Response từ Python FastAPI service
    // ============================================================

    /// <summary>
    /// Response từ POST /extract-embeddings
    /// </summary>
    public class YamNetEmbeddingResponse
    {
        [JsonPropertyName("embeddings")]
        public List<List<float>> Embeddings { get; set; } = new();

        [JsonPropertyName("num_frames")]
        public int NumFrames { get; set; }

        [JsonPropertyName("duration_seconds")]
        public float DurationSeconds { get; set; }

        [JsonPropertyName("sample_rate")]
        public int SampleRate { get; set; }
    }

    // ============================================================
    // Internal DTOs cho kết quả phân tích
    // ============================================================

    /// <summary>Kết quả 1 chunk (1 embedding = 0.96s audio)</summary>
    public class ChunkResult
    {
        public int ChunkIndex { get; set; }
        public float StartSeconds { get; set; }
        public float EndSeconds { get; set; }
        public string PredictedInstrument { get; set; } = string.Empty;
        public float Confidence { get; set; }
    }

    /// <summary>1 đoạn liên tiếp cùng nhạc cụ</summary>
    public class TimeSegment
    {
        public float StartSeconds { get; set; }
        public float EndSeconds { get; set; }
        public float DurationSeconds { get; set; }
    }

    /// <summary>Tổng hợp 1 nhạc cụ detected</summary>
    public class DetectedInstrumentSummary
    {
        public string InstrumentName { get; set; } = string.Empty;
        public int ChunkCount { get; set; }
        public int TotalChunks { get; set; }
        public float Percentage { get; set; }
        public float AverageConfidence { get; set; }
        public List<TimeSegment> Segments { get; set; } = new();
    }

    /// <summary>Response chính — danh sách nhạc cụ detected</summary>
    public class MultiInstrumentDetectionResponse
    {
        /// <summary>Nhạc cụ detected, sort theo percentage giảm dần</summary>
        public List<DetectedInstrumentSummary> DetectedInstruments { get; set; } = new();

        /// <summary>Nhạc cụ chiếm % cao nhất</summary>
        public string PrimaryInstrument { get; set; } = string.Empty;

        /// <summary>Tổng chunks phân tích</summary>
        public int TotalChunks { get; set; }

        /// <summary>Thời lượng audio (giây)</summary>
        public float AudioDurationSeconds { get; set; }

        /// <summary>Ngưỡng detection (mặc định 0.10)</summary>
        public float DetectionThreshold { get; set; }

        /// <summary>Timeline từng chunk (null nếu không request)</summary>
        public List<ChunkResult>? Timeline { get; set; }
    }
}
