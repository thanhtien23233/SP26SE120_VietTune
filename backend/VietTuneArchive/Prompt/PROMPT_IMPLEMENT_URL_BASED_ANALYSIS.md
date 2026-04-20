# PROMPT: Refactor AudioProcessingService — Hỗ trợ phân tích audio từ URL (Supabase)

## BỐI CẢNH DỰ ÁN

Dự án **VietTune Archive** — hệ thống lưu trữ âm nhạc cổ truyền Việt Nam.
- **Backend**: ASP.NET Core Web API (.NET 8)
- **Storage**: Supabase Storage (audio files lưu dạng FLAC/WAV/MP3)
- **AI**: Google Gemini API (phân tích nhạc cụ, tempo, key, ethnic group...)
- **NuGet SDK**: `Mscc.GenerativeAI` (C# SDK cho Gemini)

---

## YÊU CẦU THAY ĐỔI

### Vấn đề hiện tại

File `AudioProcessingService.cs` hiện tại **luôn upload lại file bytes lên Gemini Files API** mỗi lần phân tích, kể cả khi file đã tồn tại trên Supabase Storage với public URL. Flow hiện tại:

```
IFormFile → ReadToBytes() → UploadToGeminiAsync() → WaitForFileActive() → GenerateContent()
```

Điều này gây lãng phí:
- Bandwidth: file được upload 2 lần (user → server → Gemini)
- Thời gian: phải chờ Gemini xử lý file (polling tới 30s)
- Memory: toàn bộ file load vào RAM trên server

### Giải pháp

Gemini API hỗ trợ truyền **public HTTPS URL trực tiếp** vào `file_uri` trong request (không cần upload lại). Giới hạn: file ≤ 100MB, URL phải publicly accessible, dùng Gemini 2.5+ (KHÔNG dùng Gemini 2.0).

Cần thêm một **method mới** `AnalyzeAudioFromUrlAsync(string audioUrl, string mimeType)` vào service, giữ nguyên method cũ `AnalyzeAudioAsync(IFormFile)` để backward compatible.

---

## HƯỚNG DẪN IMPLEMENT CHI TIẾT

### BƯỚC 1: Cập nhật Interface `IAudioProcessingService`

Thêm method mới, **KHÔNG sửa** method cũ:

```csharp
public interface IAudioProcessingService
{
    // GIỮ NGUYÊN — phân tích từ file upload
    Task<AIAnalysisResultDto> AnalyzeAudioAsync(IFormFile audioFile);
    
    // MỚI — phân tích từ URL (Supabase public URL)
    Task<AIAnalysisResultDto> AnalyzeAudioFromUrlAsync(string audioUrl, string? mimeType = null);
    
    Task<AudioProcessResultDto> ProcessAudioAsync(IFormFile audioFile, string userId);
}
```

### BƯỚC 2: Implement `AnalyzeAudioFromUrlAsync` trong `AudioProcessingService.cs`

Thêm method public mới và một private method `AnalyzeWithUrlAsync`:

```csharp
// ===== PUBLIC METHOD MỚI =====
public async Task<AIAnalysisResultDto> AnalyzeAudioFromUrlAsync(string audioUrl, string? mimeType = null)
{
    _logger.LogInformation("Service: Analyzing audio from URL with Gemini: {Url}", audioUrl);
    
    // Tự detect MIME type từ URL extension nếu không truyền vào
    var resolvedMimeType = mimeType ?? DetectMimeTypeFromUrl(audioUrl);
    
    return await AnalyzeWithUrlAsync(audioUrl, resolvedMimeType);
}
```

```csharp
// ===== PRIVATE: GEMINI LOGIC VỚI URL =====
private async Task<AIAnalysisResultDto> AnalyzeWithUrlAsync(string audioUrl, string mimeType)
{
    try
    {
        // QUAN TRỌNG: Không cần UploadToGeminiAsync(), không cần WaitForFileActiveAsync()
        // Gemini sẽ tự fetch file từ URL
        
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
                        // ĐÂY LÀ THAY ĐỔI CHÍNH: dùng URL thay vì Gemini file URI
                        new Part 
                        { 
                            FileData = new FileData 
                            { 
                                MimeType = mimeType, 
                                FileUri = audioUrl  // Truyền thẳng Supabase public URL
                            } 
                        }
                    }
                }
            },
            GenerationConfig = generationConfig
        };

        var response = await _aiModel.GenerateContentAsync(request);

        var tokenUsage = ExtractTokenUsage(response);
        _logger.LogInformation(
            "Gemini token usage (URL mode) — Prompt: {Prompt}, Candidates: {Candidates}, Total: {Total}",
            tokenUsage?.PromptTokenCount ?? 0,
            tokenUsage?.CandidatesTokenCount ?? 0,
            tokenUsage?.TotalTokenCount ?? 0);

        var analysisResult = ParseResponseJson(response.Text);
        return analysisResult with
        {
            GeminiFileUri = audioUrl,  // Lưu URL gốc thay vì Gemini URI
            TokenUsage = tokenUsage
        };
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Gemini URL Analysis Failed for: {Url}", audioUrl);
        return GetDefaultResult() with { GeminiFileUri = audioUrl };
    }
}
```

### BƯỚC 3: Thêm helper `DetectMimeTypeFromUrl`

```csharp
// ===== THÊM VÀO SECTION 5. UTILITIES =====
private static string DetectMimeTypeFromUrl(string url)
{
    // Lấy phần path, bỏ query string
    var path = url.Split('?')[0].ToLowerInvariant();
    
    if (path.EndsWith(".flac")) return "audio/flac";
    if (path.EndsWith(".wav"))  return "audio/wav";
    if (path.EndsWith(".mp3"))  return "audio/mpeg";
    if (path.EndsWith(".ogg"))  return "audio/ogg";
    if (path.EndsWith(".m4a"))  return "audio/mp4";
    if (path.EndsWith(".aac"))  return "audio/aac";
    if (path.EndsWith(".webm")) return "audio/webm";
    if (path.EndsWith(".mp4"))  return "audio/mp4";
    
    // Default fallback
    return "audio/mpeg";
}
```

### BƯỚC 4: Thêm endpoint mới trong `AIAnalysisController.cs`

Thêm endpoint nhận URL thay vì file upload. **KHÔNG sửa endpoint cũ** `analyze-only`:

```csharp
/// <summary>
/// Phân tích audio từ public URL (Supabase Storage).
/// Không cần upload file — Gemini tự fetch từ URL.
/// Giới hạn: file ≤ 100MB, URL phải publicly accessible.
/// </summary>
[HttpPost("analyze-from-url")]
[AllowAnonymous]
public async Task<ActionResult<AIAnalysisResultDto>> AnalyzeFromUrl([FromBody] AnalyzeFromUrlRequest request)
{
    if (string.IsNullOrWhiteSpace(request?.AudioUrl))
        return BadRequest("audioUrl is required.");

    // Validate URL format
    if (!Uri.TryCreate(request.AudioUrl, UriKind.Absolute, out var uri) 
        || (uri.Scheme != "https" && uri.Scheme != "http"))
        return BadRequest("Invalid URL. Must be a valid HTTP/HTTPS URL.");

    try
    {
        _logger.LogInformation("Analyzing audio from URL: {Url}", request.AudioUrl);
        var result = await _processingService.AnalyzeAudioFromUrlAsync(
            request.AudioUrl, 
            request.MimeType);
        return Ok(result);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "URL-based analysis failed for {Url}", request.AudioUrl);
        return StatusCode(500, new { error = ex.Message });
    }
}
```

### BƯỚC 5: Tạo Request DTO

Tạo file `AnalyzeFromUrlRequest.cs` (hoặc thêm vào file DTO hiện tại):

```csharp
public class AnalyzeFromUrlRequest
{
    /// <summary>
    /// Public URL của file audio trên Supabase Storage.
    /// Ví dụ: https://xxx.supabase.co/storage/v1/object/public/recordings/file.flac
    /// </summary>
    public string AudioUrl { get; set; } = string.Empty;
    
    /// <summary>
    /// MIME type (optional). Nếu không truyền, tự detect từ URL extension.
    /// Ví dụ: "audio/flac", "audio/wav", "audio/mpeg"
    /// </summary>
    public string? MimeType { get; set; }
}
```

---

## RÀNG BUỘC QUAN TRỌNG

1. **KHÔNG SỬA code cũ** — method `AnalyzeAudioAsync(IFormFile)`, `AnalyzeWithGoogleAIAsync`, `UploadToGeminiAsync`, `WaitForFileActiveAsync` phải giữ nguyên 100%. Chúng là fallback khi URL không khả dụng.

2. **KHÔNG thay đổi** DTO `AIAnalysisResultDto`, `DbRefDto`, `TokenUsageDto` — method mới trả về cùng DTO.

3. **KHÔNG thay đổi** `_enumsProvider.GetSystemPrompt()` và `_enumsProvider.GetJsonSchema()` — prompt và schema dùng chung.

4. **Model Gemini**: Phải dùng `gemini-2.5-flash` hoặc mới hơn. Gemini 2.0 KHÔNG hỗ trợ external URL. Kiểm tra config `GoogleAI:Model` trong `appsettings.json`.

5. **Supabase bucket phải public** hoặc dùng signed URL (có thời hạn). Gemini cần URL publicly accessible để fetch.

6. **Giới hạn 100MB** cho external URL. File lớn hơn phải fallback về method cũ (upload qua Files API, hỗ trợ tới 2GB).

---

## CẤU TRÚC FILE SAU KHI IMPLEMENT

```
AudioProcessingService.cs
├── Constructor (giữ nguyên)
├── 1. PUBLIC INTERFACE
│   ├── AnalyzeAudioAsync(IFormFile)          ← GIỮ NGUYÊN
│   ├── AnalyzeAudioFromUrlAsync(string, string?) ← MỚI
│   └── ProcessAudioAsync(IFormFile, string)  ← GIỮ NGUYÊN
├── 2. GEMINI LOGIC
│   ├── AnalyzeWithGoogleAIAsync(byte[], string)  ← GIỮ NGUYÊN (upload flow)
│   ├── AnalyzeWithUrlAsync(string, string)        ← MỚI (URL flow)
│   ├── ExtractTokenUsage(...)                     ← GIỮ NGUYÊN
│   ├── UploadToGeminiAsync(...)                   ← GIỮ NGUYÊN
│   └── WaitForFileActiveAsync(...)                ← GIỮ NGUYÊN
├── 3. PARSING (giữ nguyên)
├── 4. SAFE GETTERS (giữ nguyên)
└── 5. UTILITIES
    ├── ReadToBytesAsync(...)                  ← GIỮ NGUYÊN
    ├── DetectMimeType(...)                    ← GIỮ NGUYÊN
    └── DetectMimeTypeFromUrl(...)             ← MỚI

AIAnalysisController.cs
├── POST analyze-only          ← GIỮ NGUYÊN
├── POST analyze-from-url      ← MỚI
├── POST transcribe-only       ← GIỮ NGUYÊN
├── POST analyze-and-transcribe ← GIỮ NGUYÊN
└── GET  whisper-health        ← GIỮ NGUYÊN
```

---

## TEST CASES

Sau khi implement, test với curl:

```bash
# Test 1: URL public từ Supabase (auto detect MIME)
curl -X POST https://localhost:5001/api/AIAnalysis/analyze-from-url \
  -H "Content-Type: application/json" \
  -d '{"audioUrl": "https://xxx.supabase.co/storage/v1/object/public/recordings/dan-bau.flac"}'

# Test 2: URL với explicit MIME type
curl -X POST https://localhost:5001/api/AIAnalysis/analyze-from-url \
  -H "Content-Type: application/json" \
  -d '{"audioUrl": "https://xxx.supabase.co/storage/v1/object/public/recordings/sample.wav", "mimeType": "audio/wav"}'

# Test 3: Invalid URL (expect 400)
curl -X POST https://localhost:5001/api/AIAnalysis/analyze-from-url \
  -H "Content-Type: application/json" \
  -d '{"audioUrl": ""}'

# Test 4: Endpoint cũ vẫn hoạt động (backward compatible)
curl -X POST https://localhost:5001/api/AIAnalysis/analyze-only \
  -F "audioFile=@sample.flac"
```

---

## SO SÁNH HIỆU NĂNG

| Metric | Upload flow (cũ) | URL flow (mới) |
|---|---|---|
| Bandwidth server | File size × 2 (nhận + gửi) | 0 (Gemini tự fetch) |
| Memory server | Toàn bộ file trong RAM | Không load file |
| Latency | Upload + Polling 2-30s | Gemini fetch trực tiếp |
| File size limit | 2GB (Files API) | 100MB (URL method) |
| Yêu cầu URL | Không cần | Public hoặc Signed URL |

---

## LƯU Ý CUỐI

- Nếu `Mscc.GenerativeAI` SDK không hỗ trợ truyền external URL vào `FileData.FileUri` (chỉ chấp nhận Gemini URI format), thì cần **gọi REST API trực tiếp** bằng `HttpClient` thay vì dùng SDK. Trong trường hợp đó, build JSON request body thủ công và POST tới `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`.

- Kiểm tra xem SDK version hiện tại có hỗ trợ không bằng cách test với URL thật trước. Nếu throw exception hoặc trả lỗi `INVALID_ARGUMENT`, chuyển sang dùng raw HTTP request.
