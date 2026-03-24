using System.Text;
using System.Text.Json;
using GenerativeAI;
using GenerativeAI.Types;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.IServices;
using static VietTuneArchive.Application.Mapper.DTOs.AudioAnalysisResultDto;

namespace VietTuneArchive.Application.Services
{
    public class AudioProcessingService : IAudioProcessingService
    {
        private readonly IEnumProviderService _enumsProvider;
        private readonly GenerativeModel _aiModel;
        private readonly ILogger<AudioProcessingService> _logger;
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient; // Nên dùng HttpClientFactory nếu có thể

        public AudioProcessingService(
            IEnumProviderService enumsProvider,
            IConfiguration config,
            ILogger<AudioProcessingService> logger)
        {
            _enumsProvider = enumsProvider;
            _logger = logger;
            _config = config;
            _httpClient = new HttpClient(); // Khởi tạo đơn giản cho gọn

            var apiKey = config["GoogleAI:ApiKey"] ?? config["Gemini:ApiKey"];
            var modelName = config["GoogleAI:Model"] ?? config["Gemini:Model"] ?? "gemini-flash-lite-latest";

            _aiModel = new GenerativeModel(apiKey: apiKey, model: modelName);
        }

        // =================================================================
        // 1. PUBLIC INTERFACE IMPLEMENTATION
        // =================================================================


        public async Task<AIAnalysisResultDto> AnalyzeAudioAsync(IFormFile audioFile)
        {
            _logger.LogInformation("Service: Analyzing audio with Gemini...");
            var audioBytes = await ReadToBytesAsync(audioFile);
            var mimeType = DetectMimeType(audioFile.ContentType, audioBytes);

            return await AnalyzeWithGoogleAIAsync(audioBytes, mimeType);
        }

        public async Task<AudioProcessResultDto> ProcessAudioAsync(IFormFile audioFile, string userId)
        {
            // Chạy song song cả 2 tác vụ để tối ưu thời gian
            var analyzeTask = AnalyzeAudioAsync(audioFile);

            await Task.WhenAll(analyzeTask);

            var analysisResult = await analyzeTask;

            return new AudioProcessResultDto(
                analysisResult, // Kết quả này đã bao gồm GeminiFileUri
                DateTime.UtcNow);
        }

        // =================================================================
        // 2. PRIVATE HELPER METHODS (GEMINI LOGIC)
        // =================================================================

        private async Task<AIAnalysisResultDto> AnalyzeWithGoogleAIAsync(byte[] audioBytes, string mimeType)
        {
            string fileUri = null;
            try
            {
                fileUri = await UploadToGeminiAsync(audioBytes, mimeType);
                await WaitForFileActiveAsync(fileUri);

                // 1. Đọc Schema từ file Assets thông qua Provider
                // Đảm bảo hàm này trả về kiểu string (nội dung file .txt)
                string schemaJson = _enumsProvider.GetJsonSchema();

                // 2. Sửa lỗi CS1503: Giải mã chuỗi JSON thành đối tượng Schema của SDK
                var structuredSchema = JsonSerializer.Deserialize<Schema>(schemaJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                var generationConfig = new GenerationConfig
                {
                    ResponseMimeType = "application/json",
                    ResponseSchema = structuredSchema // Gán đối tượng Schema đã giải mã
                };

                var request = new GenerateContentRequest
                {
                    Contents = new List<Content>
            {
                new Content
                {
                    Parts = new List<Part>
                    {
                        new Part { Text = _enumsProvider.GetSystemPrompt() },
                        new Part { FileData = new FileData { MimeType = mimeType, FileUri = fileUri } }
                    }
                }
            },
                    GenerationConfig = generationConfig
                };

                // 4. Gửi request và nhận phản hồi
                var response = await _aiModel.GenerateContentAsync(request);

                // 5. Parse kết quả
                var analysisResult = ParseResponseJson(response.Text);
                return analysisResult with { GeminiFileUri = fileUri };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini Analysis Failed");
                return GetDefaultResult() with { GeminiFileUri = fileUri };
            }
        }

        private async Task<string> UploadToGeminiAsync(byte[] fileBytes, string mimeType)
        {
            var apiKey = _config["GoogleAI:ApiKey"];
            var uploadUrl = $"https://generativelanguage.googleapis.com/upload/v1beta/files?key={apiKey}";

            // Reset headers cho mỗi request
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("X-Goog-Upload-Protocol", "raw");
            _httpClient.DefaultRequestHeaders.Add("X-Goog-Upload-Command", "start, upload, finalize");
            _httpClient.DefaultRequestHeaders.Add("X-Goog-Upload-Header-Content-Length", fileBytes.Length.ToString());
            _httpClient.DefaultRequestHeaders.Add("X-Goog-Upload-Header-Content-Type", mimeType);

            using var content = new ByteArrayContent(fileBytes);
            var response = await _httpClient.PostAsync(uploadUrl, content);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.GetProperty("file").GetProperty("uri").GetString();
        }

        private async Task WaitForFileActiveAsync(string fileUri)
        {
            var apiKey = _config["GoogleAI:ApiKey"];
            var name = fileUri.Substring(fileUri.IndexOf("files/"));
            var getUrl = $"https://generativelanguage.googleapis.com/v1beta/{name}?key={apiKey}";

            for (int i = 0; i < 15; i++) // Tăng lên 30s (15 * 2s) cho an toàn
            {
                var response = await _httpClient.GetAsync(getUrl);
                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var state = doc.RootElement.GetProperty("state").GetString();

                if (state == "ACTIVE") return;
                if (state == "FAILED") throw new Exception("Gemini processing state: FAILED");

                await Task.Delay(2000);
            }
            throw new Exception("Timeout waiting for Gemini file processing");
        }

        // =================================================================
        // 3. UTILITIES (PARSING & IO)
        // =================================================================

        private async Task<byte[]> ReadToBytesAsync(IFormFile file)
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            return ms.ToArray();
        }

        private string DetectMimeType(string contentType, byte[] bytes)
        {
            // Logic giữ nguyên như cũ cho gọn
            var ct = contentType?.ToLowerInvariant() ?? "";
            if (ct.Contains("wav") || (bytes.Length >= 4 && Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF")) return "audio/wav";
            if (ct.Contains("flac") || (bytes.Length >= 4 && Encoding.ASCII.GetString(bytes, 0, 4) == "fLaC")) return "audio/flac";
            if (ct.Contains("ogg") || (bytes.Length >= 4 && Encoding.ASCII.GetString(bytes, 0, 4) == "OggS")) return "audio/ogg";
            if (ct.Contains("m4a") || ct.Contains("aac")) return "audio/mp4";
            return "audio/mpeg"; // Default MP3
        }

        private AIAnalysisResultDto ParseResponseJson(string jsonString)
        {
            try
            {
                var cleanedJson = jsonString.Replace("```json", "").Replace("```", "").Trim();
                using var jsonDoc = JsonDocument.Parse(cleanedJson);
                var root = jsonDoc.RootElement;

                var analysesList = new List<AIAnalysisItemDto>();

                // 1. Tìm mảng "analyses" theo đúng Schema mới
                if (root.TryGetProperty("analyses", out var analysesArray) && analysesArray.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in analysesArray.EnumerateArray())
                    {
                        analysesList.Add(new AIAnalysisItemDto(
                            Tempo: SafeGetDouble(item, "tempo"),
                            Ethnic: SafeGetString(item, "ethnic"),
                            Language: SafeGetString(item, "language"),
                            Instruments: SafeGetStringList(item, "instruments"),
                            Genre: SafeGetString(item, "genre"),
                            Event: SafeGetString(item, "event"),
                            Confidence: SafeGetDouble(item, "confidence")
                        ));
                    }
                }

                // 2. Lấy chỉ số best_match
                int bestMatch = 0;
                if (root.TryGetProperty("best_match", out var bmElement) && bmElement.TryGetInt32(out var bmVal))
                {
                    bestMatch = bmVal;
                }

                return new AIAnalysisResultDto(analysesList, bestMatch, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Parsing failed for JSON: {Json}", jsonString);
                return GetDefaultResult();
            }
        }

        // Helper lấy giá trị Double an toàn (cho Confidence)
        private static double SafeGetDouble(JsonElement element, string property)
        {
            if (element.TryGetProperty(property, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDouble(out var value))
                    return value;

                // Trường hợp AI trả về số dưới dạng chuỗi "0.85"
                if (prop.ValueKind == JsonValueKind.String && double.TryParse(prop.GetString(), out var parsedValue))
                    return parsedValue;
            }
            return 0.0;
        }
        // Hàm Helper mới để lấy String an toàn
        private static string SafeGetString(JsonElement element, string property)
        {
            if (element.TryGetProperty(property, out var prop) && prop.ValueKind == JsonValueKind.String)
            {
                return prop.GetString() ?? "unknown";
            }
            return "unknown";
        }
        private static List<string> SafeGetStringList(JsonElement element, string property)
        {
            var list = new List<string>();
            if (element.TryGetProperty(property, out var prop) && prop.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in prop.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String)
                    {
                        list.Add(item.GetString() ?? "unknown");
                    }
                }
            }
            // Nếu danh sách rỗng, mặc định trả về unknown
            if (list.Count == 0) list.Add("unknown");
            return list;
        }
        // Cập nhật hàm Default trả về list rỗng
        private static AIAnalysisResultDto GetDefaultResult()
        {
            return new AIAnalysisResultDto(new List<AIAnalysisItemDto>(), 0, null);
        }
    }
}
