using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class EmbeddingService : IEmbeddingService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly IRagChatRepository _repository;

        public EmbeddingService(IHttpClientFactory httpClientFactory, IConfiguration config, IRagChatRepository repository)
        {
            _httpClient = httpClientFactory.CreateClient("GeminiApi");
            _config = config;
            _repository = repository;
        }

        public async Task<float[]> GetEmbeddingAsync(string text)
        {
            var apiKey = _config["RagChat:GeminiApiKey"] ?? _config["Gemini:ApiKey"];
            var model = _config["RagChat:EmbeddingModel"] ?? "text-embedding-004";
            
            if (string.IsNullOrEmpty(apiKey)) throw new Exception("Gemini API key not configured");

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent?key={apiKey}";
            
            var requestBody = new
            {
                model = $"models/{model}",
                content = new
                {
                    parts = new[] { new { text = text } }
                }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, jsonContent);
            response.EnsureSuccessStatusCode();

            var respString = await response.Content.ReadAsStringAsync();
            var jsonResp = JsonDocument.Parse(respString);
            
            var values = jsonResp.RootElement
                .GetProperty("embedding")
                .GetProperty("values")
                .EnumerateArray()
                .Select(v => v.GetSingle())
                .ToArray();

            return values;
        }

        public async Task<List<(Guid RecordingId, double Score)>> SearchSimilarAsync(float[] queryVector, int topK = 5)
        {
            var allEmbeddings = await _repository.GetAllEmbeddingsAsync();
            var results = new List<(Guid RecordingId, double Score)>();

            foreach (var doc in allEmbeddings)
            {
                var docVector = JsonSerializer.Deserialize<float[]>(doc.EmbeddingJson);
                if (docVector != null)
                {
                    double score = CosineSimilarity(queryVector, docVector);
                    results.Add((doc.RecordingId, score));
                }
            }

            return results.OrderByDescending(r => r.Score).Take(topK).ToList();
        }

        public async Task GenerateAndStoreEmbeddingAsync(Guid recordingId, string textContent)
        {
            var vector = await GetEmbeddingAsync(textContent);
            var model = _config["RagChat:EmbeddingModel"] ?? "text-embedding-004";

            var embedding = new VectorEmbedding
            {
                Id = Guid.NewGuid(),
                RecordingId = recordingId,
                EmbeddingJson = JsonSerializer.Serialize(vector),
                ModelVersion = model,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.SaveEmbeddingAsync(embedding);
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
