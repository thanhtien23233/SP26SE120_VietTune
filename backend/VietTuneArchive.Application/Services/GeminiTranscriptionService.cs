using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.Services
{
    public class GeminiTranscriptionService : ITranscriptionService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<GeminiTranscriptionService> _logger;

        public GeminiTranscriptionService(
            HttpClient httpClient,
            IConfiguration config,
            ILogger<GeminiTranscriptionService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
        }

        public async Task<TranscriptionResultDto> TranscribeAsync(IFormFile audioFile)
        {
            using var stream = audioFile.OpenReadStream();
            return await TranscribeAsync(stream, audioFile.FileName);
        }

        public async Task<TranscriptionResultDto> TranscribeAsync(Stream audioStream, string fileName)
        {
            _logger.LogInformation("Service: Transcribing audio with Gemini 2.0 Flash...");

            var apiKey = _config["Gemini:ApiKey"] ?? _config["GoogleAI:ApiKey"];
            var model = _config["Gemini:TranscriptionModel"] ?? _config["Gemini:Model"] ?? "gemini-2.0-flash-lite";

            if (string.IsNullOrEmpty(apiKey))
            {
                throw new Exception("Gemini API Key is not configured.");
            }

            // Convert audio stream to base64
            byte[] fileBytes;
            using (var memoryStream = new MemoryStream())
            {
                await audioStream.CopyToAsync(memoryStream);
                fileBytes = memoryStream.ToArray();
            }
            string base64Audio = Convert.ToBase64String(fileBytes);
            string mimeType = GetMimeType(fileName);

            // Construct Gemini request body
            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = "Transcribe this audio. Trả về chỉ JSON format {text, language, duration, segments[{start, end, text}]}, không thêm giải thích." },
                            new { inline_data = new { mime_type = mimeType, data = base64Audio } }
                        }
                    }
                },
                generationConfig = new
                {
                    response_mime_type = "application/json"
                }
            };

            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            var startTime = DateTime.UtcNow;
            try
            {
                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                var duration = DateTime.UtcNow - startTime;

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Gemini API error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    throw new Exception($"Gemini API returned {response.StatusCode}: {errorContent}");
                }

                var geminiResponse = await response.Content.ReadFromJsonAsync<JsonElement>();
                string resultText = geminiResponse.GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString() ?? "{}";

                _logger.LogInformation("Gemini API success in {Duration}ms", duration.TotalMilliseconds);

                return ParseGeminiResponse(resultText);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini Transcription Failed");
                throw;
            }
        }

        private TranscriptionResultDto ParseGeminiResponse(string jsonText)
        {
            // Strip markdown code block markers if present
            string cleanedJson = jsonText.Trim();
            if (cleanedJson.StartsWith("```json"))
            {
                cleanedJson = cleanedJson.Substring(7);
            }
            if (cleanedJson.EndsWith("```"))
            {
                cleanedJson = cleanedJson.Substring(0, cleanedJson.Length - 3);
            }
            cleanedJson = cleanedJson.Trim();

            try
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<TranscriptionResultDto>(cleanedJson, options);
                return result ?? new TranscriptionResultDto();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deserialize Gemini transcription JSON: {Json}", jsonText);
                return new TranscriptionResultDto { Text = jsonText }; // Fallback to raw text
            }
        }

        private string GetMimeType(string fileName)
        {
            string ext = Path.GetExtension(fileName).ToLower();
            return ext switch
            {
                ".wav" => "audio/wav",
                ".mp3" => "audio/mpeg",
                ".flac" => "audio/flac",
                ".ogg" => "audio/ogg",
                ".m4a" => "audio/mp4",
                ".webm" => "audio/webm",
                _ => "audio/mpeg"
            };
        }
    }
}
