using System.Text;
using System.Text.Json;
using GenerativeAI;
using GenerativeAI.Types;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.IServices;
using static VietTuneArchive.Application.Mapper.DTOs.AudioAnalysisResultDto;

public class AudioProcessingService : IAudioProcessingService
{
    private readonly IEnumProviderService _enumsProvider;
    private readonly GenerativeModel _aiModel;
    private readonly ILogger<AudioProcessingService> _logger;
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;

    public AudioProcessingService(
        IEnumProviderService enumsProvider,
        IConfiguration config,
        ILogger<AudioProcessingService> logger)
    {
        _enumsProvider = enumsProvider;
        _logger = logger;
        _config = config;
        _httpClient = new HttpClient();

        var apiKey = config["GoogleAI:ApiKey"] ?? config["Gemini:ApiKey"];
        var modelName = config["GoogleAI:Model"] ?? config["Gemini:Model"] ?? "gemini-flash-lite-latest";

        _aiModel = new GenerativeModel(apiKey: apiKey, model: modelName);
    }

    // =================================================================
    // 1. PUBLIC INTERFACE
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
        var analysisResult = await AnalyzeAudioAsync(audioFile);

        return new AudioProcessResultDto(
            analysisResult,
            DateTime.UtcNow);
    }

    // =================================================================
    // 2. GEMINI LOGIC
    // =================================================================

    private async Task<AIAnalysisResultDto> AnalyzeWithGoogleAIAsync(byte[] audioBytes, string mimeType)
    {
        string fileUri = null;
        try
        {
            fileUri = await UploadToGeminiAsync(audioBytes, mimeType);
            await WaitForFileActiveAsync(fileUri);

            string schemaJson = _enumsProvider.GetJsonSchema();
            var structuredSchema = JsonSerializer.Deserialize<Schema>(schemaJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            var generationConfig = new GenerationConfig
            {
                ResponseMimeType = "application/json",
                ResponseSchema = structuredSchema
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

            var response = await _aiModel.GenerateContentAsync(request);

            // === TRÍCH XUẤT TOKEN USAGE ===
            var tokenUsage = ExtractTokenUsage(response);

            _logger.LogInformation(
                "Gemini token usage — Prompt: {Prompt}, Candidates: {Candidates}, Total: {Total}",
                tokenUsage?.PromptTokenCount ?? 0,
                tokenUsage?.CandidatesTokenCount ?? 0,
                tokenUsage?.TotalTokenCount ?? 0);

            var analysisResult = ParseResponseJson(response.Text);
            return analysisResult with
            {
                GeminiFileUri = fileUri,
                TokenUsage = tokenUsage
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini Analysis Failed");
            return GetDefaultResult() with { GeminiFileUri = fileUri };
        }
    }

    /// <summary>
    /// Trích xuất token usage từ GenerateContentResponse.
    /// Mscc.GenerativeAI SDK map UsageMetadata từ Gemini API response.
    /// </summary>
    private static TokenUsageDto? ExtractTokenUsage(GenerateContentResponse response)
    {
        try
        {
            var usage = response?.UsageMetadata;
            if (usage == null) return null;

            return new TokenUsageDto(
                PromptTokenCount: usage.PromptTokenCount,
                CandidatesTokenCount: usage.CandidatesTokenCount,
                TotalTokenCount: usage.TotalTokenCount
            );
        }
        catch
        {
            return null;
        }
    }

    private async Task<string> UploadToGeminiAsync(byte[] fileBytes, string mimeType)
    {
        var apiKey = _config["GoogleAI:ApiKey"];
        var uploadUrl = $"https://generativelanguage.googleapis.com/upload/v1beta/files?key={apiKey}";

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

        for (int i = 0; i < 15; i++)
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
    // 3. PARSING — SINGLE RESULT + DbRefDto
    // =================================================================

    private AIAnalysisResultDto ParseResponseJson(string jsonString)
    {
        try
        {
            var cleanedJson = jsonString.Replace("```json", "").Replace("```", "").Trim();
            using var jsonDoc = JsonDocument.Parse(cleanedJson);
            var root = jsonDoc.RootElement;

            return new AIAnalysisResultDto(
                // --- Required ---
                Tempo: SafeGetDouble(root, "tempo"),
                KeySignature: SafeGetString(root, "keySignature"),
                EthnicGroup: SafeGetDbRef(root, "ethnicGroup"),
                Language: SafeGetString(root, "language"),
                Instruments: SafeGetDbRefList(root, "instruments"),
                Genre: SafeGetString(root, "genre"),
                PerformanceContext: SafeGetString(root, "performanceContext"),

                // --- Optional ---
                Title: SafeGetNullableString(root, "title"),
                Ceremony: SafeGetDbRef(root, "ceremony"),
                VocalStyle: SafeGetDbRef(root, "vocalStyle"),
                MusicalScale: SafeGetDbRef(root, "musicalScale"),
                Composer: SafeGetNullableString(root, "composer"),
                RecordingLocation: SafeGetNullableString(root, "recordingLocation"),
                LyricsOriginal: SafeGetNullableString(root, "lyricsOriginal"),
                LyricsVietnamese: SafeGetNullableString(root, "lyricsVietnamese")
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Parsing failed for JSON: {Json}", jsonString);
            return GetDefaultResult();
        }
    }

    // =================================================================
    // 4. SAFE GETTERS
    // =================================================================

    private static DbRefDto? SafeGetDbRef(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var prop))
            return null;

        if (prop.ValueKind == JsonValueKind.Null)
            return null;

        if (prop.ValueKind != JsonValueKind.Object)
            return null;

        var idStr = SafeGetString(prop, "id");
        var name = SafeGetString(prop, "name");

        if (idStr == "unknown" || !Guid.TryParse(idStr, out var guid))
            return null;

        return new DbRefDto(guid, name);
    }

    private static List<DbRefDto> SafeGetDbRefList(JsonElement element, string property)
    {
        var list = new List<DbRefDto>();

        if (!element.TryGetProperty(property, out var prop))
            return list;

        if (prop.ValueKind != JsonValueKind.Array)
            return list;

        foreach (var item in prop.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object)
                continue;

            var idStr = SafeGetString(item, "id");
            var name = SafeGetString(item, "name");

            if (idStr != "unknown" && Guid.TryParse(idStr, out var guid))
            {
                list.Add(new DbRefDto(guid, name));
            }
        }

        return list;
    }

    private static double SafeGetDouble(JsonElement element, string property)
    {
        if (element.TryGetProperty(property, out var prop))
        {
            if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDouble(out var value))
                return value;
            if (prop.ValueKind == JsonValueKind.String && double.TryParse(prop.GetString(), out var parsed))
                return parsed;
        }
        return 0.0;
    }

    private static string SafeGetString(JsonElement element, string property)
    {
        if (element.TryGetProperty(property, out var prop) && prop.ValueKind == JsonValueKind.String)
            return prop.GetString() ?? "unknown";
        return "unknown";
    }

    private static string? SafeGetNullableString(JsonElement element, string property)
    {
        if (element.TryGetProperty(property, out var prop) && prop.ValueKind == JsonValueKind.String)
        {
            var val = prop.GetString();
            if (string.IsNullOrWhiteSpace(val) || val.Equals("unknown", StringComparison.OrdinalIgnoreCase))
                return null;
            return val;
        }
        return null;
    }

    private static AIAnalysisResultDto GetDefaultResult()
    {
        return new AIAnalysisResultDto(
            Tempo: 0,
            KeySignature: "unknown",
            EthnicGroup: null,
            Language: "unknown",
            Instruments: new List<DbRefDto>(),
            Genre: "unknown",
            PerformanceContext: "unknown"
        );
    }

    // =================================================================
    // 5. UTILITIES
    // =================================================================

    private async Task<byte[]> ReadToBytesAsync(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        return ms.ToArray();
    }

    private string DetectMimeType(string contentType, byte[] bytes)
    {
        var ct = contentType?.ToLowerInvariant() ?? "";
        if (ct.Contains("wav") || (bytes.Length >= 4 && Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF")) return "audio/wav";
        if (ct.Contains("flac") || (bytes.Length >= 4 && Encoding.ASCII.GetString(bytes, 0, 4) == "fLaC")) return "audio/flac";
        if (ct.Contains("ogg") || (bytes.Length >= 4 && Encoding.ASCII.GetString(bytes, 0, 4) == "OggS")) return "audio/ogg";
        if (ct.Contains("m4a") || ct.Contains("aac")) return "audio/mp4";
        return "audio/mpeg";
    }
}