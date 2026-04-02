using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Services.DTOs;

namespace VietTuneArchive.Application.Services
{
    public class GeminiEmbeddingService : IOpenAIEmbeddingService
    {
        private readonly HttpClient _httpClient;
        private readonly GeminiOptions _options;
        private readonly ILogger<GeminiEmbeddingService> _logger;

        private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta/";

        public GeminiEmbeddingService(
            HttpClient httpClient,
            IOptions<GeminiOptions> options,
            ILogger<GeminiEmbeddingService> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;

            _httpClient.BaseAddress = new Uri(BaseUrl);
            _httpClient.DefaultRequestHeaders.Add("x-goog-api-key", _options.ApiKey);
        }

        public async Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default)
        {
            return await GetEmbeddingAsync(text, "RETRIEVAL_DOCUMENT", ct);
        }

        public async Task<float[]> GetEmbeddingAsync(string text, string taskType, CancellationToken ct = default)
        {
            var modelId = _options.EmbeddingModel;
            var url = $"models/{modelId}:embedContent";

            var requestBody = new GeminiEmbedRequest
            {
                Model = $"models/{modelId}",
                Content = new GeminiContent
                {
                    Parts = new List<GeminiPart>
                    {
                        new() { Text = text }
                    }
                },
                TaskType = taskType,
                OutputDimensionality = _options.EmbeddingDimensions
            };

            try
            {
                var response = await _httpClient.PostAsJsonAsync(url, requestBody, ct);

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(ct);
                    _logger.LogError("Gemini API error: {StatusCode} - {Body}", response.StatusCode, errorBody);
                    throw new HttpRequestException($"Gemini API returned {response.StatusCode}: {errorBody}");
                }

                var result = await response.Content.ReadFromJsonAsync<GeminiEmbedResponse>(cancellationToken: ct);

                if (result?.Embedding?.Values == null || result.Embedding.Values.Length == 0)
                    throw new InvalidOperationException("Gemini returned empty embedding.");

                return result.Embedding.Values;
            }
            catch (Exception ex) when (ex is not HttpRequestException and not InvalidOperationException)
            {
                _logger.LogError(ex, "Failed to call Gemini Embedding API");
                throw;
            }
        }

        public async Task<List<float[]>> GetEmbeddingBatchAsync(List<string> texts, CancellationToken ct = default)
        {
            var modelId = _options.EmbeddingModel;
            var url = $"models/{modelId}:batchEmbedContents";

            var requests = texts.Select(text => new GeminiBatchEmbedRequestItem
            {
                Model = $"models/{modelId}",
                Content = new GeminiContent
                {
                    Parts = new List<GeminiPart>
                    {
                        new() { Text = text }
                    }
                },
                TaskType = "RETRIEVAL_DOCUMENT",
                OutputDimensionality = _options.EmbeddingDimensions
            }).ToList();

            var requestBody = new GeminiBatchEmbedRequest
            {
                Requests = requests
            };

            try
            {
                var response = await _httpClient.PostAsJsonAsync(url, requestBody, ct);

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(ct);
                    _logger.LogError("Gemini batch API error: {StatusCode} - {Body}", response.StatusCode, errorBody);
                    throw new HttpRequestException($"Gemini API returned {response.StatusCode}: {errorBody}");
                }

                var result = await response.Content.ReadFromJsonAsync<GeminiBatchEmbedResponse>(cancellationToken: ct);

                if (result?.Embeddings == null)
                    throw new InvalidOperationException("Gemini returned null batch embeddings.");

                return result.Embeddings.Select(e => e.Values).ToList();
            }
            catch (Exception ex) when (ex is not HttpRequestException and not InvalidOperationException)
            {
                _logger.LogError(ex, "Failed to call Gemini batch Embedding API");
                throw;
            }
        }
    }
}
