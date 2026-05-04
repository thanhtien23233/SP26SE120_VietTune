using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Services;

namespace VietTuneArchive.Controllers;

/// <summary>
/// API gợi ý metadata cho luồng đóng góp (Contributor): dân tộc, vùng miền, nhạc cụ dựa trên thể loại/tiêu đề/mô tả.
/// Dùng Gemini khi đã cấu hình ApiKey; nếu không trả về gợi ý rỗng hoặc fallback theo thể loại.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class MetadataSuggestController : ControllerBase
{
    private readonly IGeminiService _geminiService;

    public MetadataSuggestController(IGeminiService geminiService)
    {
        _geminiService = geminiService;
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] MetadataSuggestRequest request, CancellationToken cancellationToken = default)
    {
        var genre = request?.Genre?.Trim() ?? "";
        var title = request?.Title?.Trim() ?? "";
        var description = request?.Description?.Trim() ?? "";

        if (string.IsNullOrEmpty(genre) && string.IsNullOrEmpty(title) && string.IsNullOrEmpty(description))
            return BadRequest(new { message = "Cần ít nhất một trong: genre, title, description." });

        const string systemInstruction = "Bạn là chuyên gia âm nhạc truyền thống Việt Nam. Nhiệm vụ: cho thể loại/tiêu đề/mô tả bản thu, trả lời ĐÚNG MỘT đối tượng JSON, không markdown, không giải thích thêm. Định dạng: {\"ethnicity\":\"Tên dân tộc (tiếng Việt)\",\"region\":\"Tên vùng miền (vd: Tây Bắc, Nam Bộ)\",\"instruments\":[\"Tên nhạc cụ 1\",\"Tên nhạc cụ 2\"]}. Chỉ điền các trường có cơ sở; trường không chắc chắn để chuỗi rỗng hoặc mảng rỗng. Dùng nhãn tiếng Việt phổ biến (vd: Kinh, Đàn bầu, Tây Bắc).";

        var userMessage = $"Thể loại: {genre}. Tiêu đề: {title}. Mô tả: {description}. Hãy trả về đúng một JSON với các key ethnicity, region, instruments.";

        var result = await _geminiService.GenerateContentAsync(userMessage, systemInstruction, cancellationToken);

        if (!result.Success)
            return StatusCode(result.StatusCode, new MetadataSuggestResponse { Message = result.Message });

        var parsed = ParseJsonResponse(result.Message);
        if (parsed != null)
            return Ok(parsed);

        var fallback = FallbackFromGenre(genre);
        return Ok(fallback);
    }

    private static MetadataSuggestResponse? ParseJsonResponse(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        text = text.Trim();
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        var json = text.Substring(start, end - start + 1);
        try
        {
            var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var ethnicity = root.TryGetProperty("ethnicity", out var e) ? e.GetString()?.Trim() : null;
            var region = root.TryGetProperty("region", out var r) ? r.GetString()?.Trim() : null;
            var instruments = new List<string>();
            if (root.TryGetProperty("instruments", out var arr))
            {
                foreach (var item in arr.EnumerateArray())
                {
                    var s = item.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(s)) instruments.Add(s);
                }
            }
            return new MetadataSuggestResponse
            {
                Ethnicity = ethnicity,
                Region = region,
                Instruments = instruments.Count > 0 ? instruments : null,
            };
        }
        catch
        {
            return null;
        }
    }

    private static MetadataSuggestResponse FallbackFromGenre(string genre)
    {
        if (string.IsNullOrWhiteSpace(genre)) return new MetadataSuggestResponse();
        var g = genre.Trim();
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Quan họ"] = "Kinh",
            ["Ca trù"] = "Kinh",
            ["Chầu văn"] = "Kinh",
            ["Chèo"] = "Kinh",
            ["Hát xẩm"] = "Kinh",
            ["Ca Huế"] = "Kinh",
            ["Đờn ca tài tử"] = "Kinh",
            ["Hát then"] = "Tày",
            ["Nhã nhạc"] = "Kinh",
            ["Hát bội"] = "Kinh",
            ["Cải lương"] = "Kinh",
            ["Tuồng"] = "Kinh",
            ["Dân ca"] = "Kinh",
            ["Hò"] = "Kinh",
            ["Lý"] = "Kinh",
            ["Vọng cổ"] = "Kinh",
            ["Hát ru"] = "Kinh",
            ["Hát ví"] = "Kinh",
            ["Hát giặm"] = "Kinh",
            ["Bài chòi"] = "Kinh",
        };
        var ethnicity = map.TryGetValue(g, out var eth) ? eth : "Kinh";
        return new MetadataSuggestResponse { Ethnicity = ethnicity };
    }

    public class MetadataSuggestRequest
    {
        [JsonPropertyName("genre")]
        public string? Genre { get; set; }
        [JsonPropertyName("title")]
        public string? Title { get; set; }
        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class MetadataSuggestResponse
    {
        [JsonPropertyName("ethnicity")]
        public string? Ethnicity { get; set; }
        [JsonPropertyName("region")]
        public string? Region { get; set; }
        [JsonPropertyName("instruments")]
        public List<string>? Instruments { get; set; }
        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }
}
