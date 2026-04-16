using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.Services
{
    public class LocalWhisperService : ILocalWhisperService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<LocalWhisperService> _logger;
        private readonly string _baseUrl;
        private readonly string _apiKey;

        public LocalWhisperService(
            HttpClient httpClient,
            IConfiguration config,
            ILogger<LocalWhisperService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;

            _baseUrl = _config["LocalWhisperService:BaseUrl"] ?? "http://localhost:8002";
            _apiKey = _config["LocalWhisperService:ApiKey"] ?? "viettune-whisper-secret-2026";
        }

        public async Task<LocalTranscriptionResultDto> TranscribeAsync(IFormFile audioFile, string language = "vi")
        {
            try
            {
                _logger.LogInformation("Transcribing audio file {FileName} ({Size} bytes) using local Whisper service", 
                    audioFile.FileName, audioFile.Length);

                using var content = new MultipartFormDataContent();
                using var fileStream = audioFile.OpenReadStream();
                var fileContent = new StreamContent(fileStream);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue(audioFile.ContentType ?? "audio/mpeg");
                
                content.Add(fileContent, "file", audioFile.FileName);
                
                var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/transcribe?language={language}");
                request.Headers.Add("X-API-Key", _apiKey);
                request.Content = content;

                var response = await _httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<LocalTranscriptionResultDto>();
                    _logger.LogInformation("Whisper transcription success. Processing time: {ProcessingTime}s, Model: {Model}", 
                        result?.ProcessingTime, result?.ModelUsed);
                    return result ?? throw new Exception("Failed to parse transcription result.");
                }

                var errorBody = await response.Content.ReadAsStringAsync();
                
                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                    throw new Exception("Whisper service authentication failed — kiểm tra API key");
                
                if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
                    throw new Exception("Whisper service unavailable — model chưa load xong");
                
                if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
                    throw new Exception($"Whisper service bad request: {errorBody}");

                throw new Exception($"Whisper service returned {response.StatusCode}: {errorBody}");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Whisper service connection error");
                throw new Exception($"Whisper service không khả dụng tại {_baseUrl}. Kiểm tra Python service đã chạy chưa.");
            }
            catch (TaskCanceledException ex) when (!ex.CancellationToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Whisper service timeout");
                var timeout = _config["LocalWhisperService:TimeoutSeconds"] ?? "300";
                throw new Exception($"Whisper service timeout sau {timeout}s. File có thể quá lớn.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in LocalWhisperService.TranscribeAsync");
                throw;
            }
        }

        public async Task<bool> IsHealthyAsync()
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/health");
                // Timeout ngắn cho health check
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                
                var response = await _httpClient.SendAsync(request, cts.Token);
                
                if (response.IsSuccessStatusCode)
                {
                    var healthJson = await response.Content.ReadFromJsonAsync<JsonElement>();
                    if (healthJson.TryGetProperty("model_loaded", out var modelLoaded) && modelLoaded.GetBoolean())
                    {
                        return true;
                    }
                }
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Whisper service health check failed: {Message}", ex.Message);
                return false;
            }
        }
    }
}
