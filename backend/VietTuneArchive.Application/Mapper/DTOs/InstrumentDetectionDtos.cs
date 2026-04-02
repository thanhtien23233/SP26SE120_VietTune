using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    // ============================================================
    // Response từ Python FastAPI service
    // ============================================================

    public class PythonAnalyzeResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("data")]
        public PythonAnalyzeData Data { get; set; } = new();

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }

    public class PythonAnalyzeData
    {
        [JsonPropertyName("instruments")]
        public List<DetectedInstrument> Instruments { get; set; } = new();

        [JsonPropertyName("timeline")]
        public List<InstrumentTimeSegment>? Timeline { get; set; }

        [JsonPropertyName("audio_info")]
        public AudioAnalysisInfo AudioInfo { get; set; } = new();
    }

    public class DetectedInstrument
    {
        [JsonPropertyName("instrument")]
        public string Instrument { get; set; } = string.Empty;

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("max_confidence")]
        public double MaxConfidence { get; set; }

        [JsonPropertyName("overall_average")]
        public double OverallAverage { get; set; }

        [JsonPropertyName("frame_ratio")]
        public double FrameRatio { get; set; }

        [JsonPropertyName("dominant_frames")]
        public int DominantFrames { get; set; }

        [JsonPropertyName("total_frames")]
        public int TotalFrames { get; set; }
    }

    public class InstrumentTimeSegment
    {
        [JsonPropertyName("instrument")]
        public string Instrument { get; set; } = string.Empty;

        [JsonPropertyName("start_seconds")]
        public double StartSeconds { get; set; }

        [JsonPropertyName("end_seconds")]
        public double EndSeconds { get; set; }

        [JsonPropertyName("num_frames")]
        public int NumFrames { get; set; }
    }

    public class AudioAnalysisInfo
    {
        [JsonPropertyName("filename")]
        public string Filename { get; set; } = string.Empty;

        [JsonPropertyName("duration_seconds")]
        public double DurationSeconds { get; set; }

        [JsonPropertyName("analyzed_duration")]
        public double AnalyzedDuration { get; set; }

        [JsonPropertyName("num_frames")]
        public int NumFrames { get; set; }

        [JsonPropertyName("sample_rate")]
        public int SampleRate { get; set; }
    }

    // ============================================================
    // Compatiblity DTOs (nếu cần giữ API cũ)
    // ============================================================

    public class MultiInstrumentDetectionResponse
    {
        // Chúng ta sẽ giữ class này nhưng mapping từ PythonAnalyzeData sang
        public List<DetectedInstrument> DetectedInstruments { get; set; } = new();
        public string PrimaryInstrument { get; set; } = string.Empty;
        public int TotalChunks { get; set; }
        public double AudioDurationSeconds { get; set; }
        public List<InstrumentTimeSegment>? Timeline { get; set; }
    }
}

