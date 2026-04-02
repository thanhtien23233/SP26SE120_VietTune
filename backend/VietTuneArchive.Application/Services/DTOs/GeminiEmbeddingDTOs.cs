using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VietTuneArchive.Application.Services.DTOs
{
    // ===== Single Embed Request =====
    public class GeminiEmbedRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public GeminiContent Content { get; set; } = new();

        [JsonPropertyName("taskType")]
        public string TaskType { get; set; } = "RETRIEVAL_DOCUMENT";

        [JsonPropertyName("outputDimensionality")]
        public int? OutputDimensionality { get; set; }
    }

    public class GeminiContent
    {
        [JsonPropertyName("parts")]
        public List<GeminiPart> Parts { get; set; } = new();
    }

    public class GeminiPart
    {
        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
    }

    // ===== Single Embed Response =====
    public class GeminiEmbedResponse
    {
        [JsonPropertyName("embedding")]
        public GeminiEmbeddingValues? Embedding { get; set; }
    }

    public class GeminiEmbeddingValues
    {
        [JsonPropertyName("values")]
        public float[] Values { get; set; } = System.Array.Empty<float>();
    }

    // ===== Batch Embed Request =====
    public class GeminiBatchEmbedRequest
    {
        [JsonPropertyName("requests")]
        public List<GeminiBatchEmbedRequestItem> Requests { get; set; } = new();
    }

    public class GeminiBatchEmbedRequestItem
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public GeminiContent Content { get; set; } = new();

        [JsonPropertyName("taskType")]
        public string TaskType { get; set; } = "RETRIEVAL_DOCUMENT";

        [JsonPropertyName("outputDimensionality")]
        public int? OutputDimensionality { get; set; }
    }

    // ===== Batch Embed Response =====
    public class GeminiBatchEmbedResponse
    {
        [JsonPropertyName("embeddings")]
        public List<GeminiEmbeddingValues> Embeddings { get; set; } = new();
    }
}
