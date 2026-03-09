using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace VietTuneArchive.Services;

/// <summary>
/// Service dùng chung cho mọi tính năng AI của VietTune. Đọc Gemini:ApiKey và Gemini:Model từ cấu hình.
/// Toàn bộ hệ thống (Chat, Researcher, ChatbotPage, và mọi tính năng AI sau này) đều dùng key qua service này.
/// </summary>
public interface IGeminiService
{
    /// <summary>Kiểm tra đã cấu hình ApiKey chưa.</summary>
    bool IsConfigured { get; }

    /// <summary>Gọi Gemini generateContent với systemInstruction (plain text, không markdown). Trả về (thành công, nội dung hoặc thông báo lỗi, statusCode).</summary>
    Task<GeminiResult> GenerateContentAsync(string userMessage, string? systemInstruction = null, CancellationToken cancellationToken = default);
}

public sealed class GeminiResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";
    public int StatusCode { get; init; }
}

public class GeminiService : IGeminiService
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    private static readonly string[] FallbackModels = { "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro" };

    public const string NoMarkdownInstruction = "Trả lời chỉ bằng văn bản thuần (plain text), không dùng markdown: không dùng #, *, **, hay bất kỳ ký tự định dạng đặc biệt nào. Chỉ dùng chữ, số, dấu câu và xuống dòng.";

    public GeminiService(IConfiguration config, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_config["Gemini:ApiKey"]);

    public async Task<GeminiResult> GenerateContentAsync(string userMessage, string? systemInstruction = null, CancellationToken cancellationToken = default)
    {
        var apiKey = _config["Gemini:ApiKey"]?.Trim();
        if (string.IsNullOrEmpty(apiKey))
            return new GeminiResult { Success = true, Message = "VietTune Intelligence (chế độ local). Để dùng AI thật, cấu hình Gemini:ApiKey trong appsettings.Development.json.", StatusCode = 200 };

        var configuredModel = _config["Gemini:Model"]?.Trim() ?? "gemini-2.5-flash";
        var modelsToTry = new List<string> { configuredModel };
        foreach (var m in FallbackModels)
            if (!modelsToTry.Contains(m)) modelsToTry.Add(m);

        var instruction = systemInstruction ?? NoMarkdownInstruction;
        var bodyJson = JsonSerializer.Serialize(new
        {
            systemInstruction = new { parts = new[] { new { text = instruction } } },
            contents = new[] { new { parts = new[] { new { text = userMessage } } } }
        });

        var client = _httpClientFactory.CreateClient();
        int lastStatus = 0;
        string? lastError = null;

        foreach (var model in modelsToTry)
        {
            try
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                using var requestContent = new StringContent(bodyJson, Encoding.UTF8, "application/json");
                var response = await client.PostAsync(url, requestContent, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync(cancellationToken);
                    var text = ExtractTextFromGeminiResponse(json);
                    text = StripMarkdownChars(text?.Trim());
                    return new GeminiResult { Success = true, Message = text ?? "Không nhận được phản hồi từ mô hình.", StatusCode = 200 };
                }

                lastStatus = (int)response.StatusCode;
                lastError = await response.Content.ReadAsStringAsync(cancellationToken);
                if (lastStatus != 404) break;
            }
            catch (Exception ex)
            {
                lastError = ex.Message;
                lastStatus = 500;
            }
        }

        return new GeminiResult
        {
            Success = false,
            Message = $"Gemini API lỗi: {(lastStatus == 404 ? "NotFound" : lastStatus.ToString())}. {lastError}",
            StatusCode = lastStatus > 0 ? lastStatus : 500
        };
    }

    private static string? ExtractTextFromGeminiResponse(string json)
    {
        try
        {
            var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0) return null;
            var first = candidates[0];
            if (!first.TryGetProperty("content", out var contentObj) || !contentObj.TryGetProperty("parts", out var parts) || parts.GetArrayLength() == 0) return null;
            return parts[0].TryGetProperty("text", out var textEl) ? textEl.GetString() : null;
        }
        catch
        {
            return null;
        }
    }

    private static string? StripMarkdownChars(string? text)
    {
        if (string.IsNullOrEmpty(text)) return text;
        text = text.Replace("**", "").Replace("*", "").Replace("__", "");
        text = Regex.Replace(text, @"^#+\s*", "", RegexOptions.Multiline);
        return text.Trim();
    }
}
