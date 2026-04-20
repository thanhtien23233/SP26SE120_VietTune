using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.Services
{
    public class InstrumentDetectionService : IInstrumentDetectionService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<InstrumentDetectionService> _logger;

        public InstrumentDetectionService(HttpClient httpClient, ILogger<InstrumentDetectionService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _logger.LogInformation("InstrumentDetectionService initialized using standalone Python service.");
        }

        public async Task<PythonAnalyzeResponse> DetectInstrumentsAsync(Stream audioStream, string fileName, bool includeTimeline = false)
        {
            if (audioStream.CanSeek)
            {
                audioStream.Position = 0;
            }

            using var content = new MultipartFormDataContent();

            // Read stream into byte array for HttpClient (or we can use StreamContent directly but let's follow the previous pattern for reliability)
            byte[] byteArray;
            if (audioStream is MemoryStream ms)
            {
                byteArray = ms.ToArray();
            }
            else
            {
                using var memoryStream = new MemoryStream();
                await audioStream.CopyToAsync(memoryStream);
                byteArray = memoryStream.ToArray();
            }

            using var streamContent = new ByteArrayContent(byteArray);
            streamContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
            content.Add(streamContent, "file", fileName);

            var url = $"/analyze?include_timeline={includeTimeline.ToString().ToLower()}";

            _logger.LogInformation("Sending audio analysis request to Python service for {fileName} ({size} bytes)", fileName, byteArray.Length);

            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogError("Python service returned error: {code} - {body}", response.StatusCode, errorBody);
                throw new HttpRequestException($"Instrument detection service failed: {response.StatusCode} - {errorBody}");
            }

            var json = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var result = JsonSerializer.Deserialize<PythonAnalyzeResponse>(json, options);

            if (result == null)
            {
                throw new Exception("Invalid response from instrument detection service.");
            }

            if (result.Data?.Instruments != null)
            {
                var names = result.Data.Instruments.Select(i => i.Instrument).ToList();
                _logger.LogInformation("Detected instruments: {instruments}", string.Join(", ", names));
            }

            return result;
        }

        public async Task<string[]> GetSupportedInstrumentsAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync("/health");
                if (!response.IsSuccessStatusCode) return Array.Empty<string>();

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.TryGetProperty("classes", out var classesElement) && classesElement.ValueKind == JsonValueKind.Array)
                {
                    return classesElement.EnumerateArray()
                                        .Select(x => x.GetString())
                                        .Where(x => x != null && x != "background")
                                        .Cast<string>()
                                        .ToArray();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching supported instruments from Python service");
            }

            return Array.Empty<string>();
        }
    }
}

