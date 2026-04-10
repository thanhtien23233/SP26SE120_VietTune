# PROMPT: Thêm chức năng Transcription (OpenAI Whisper API) vào VietTune Backend

## Bối cảnh dự án

Bạn đang làm việc trên backend C# .NET của dự án **VietTune Archive** — hệ thống lưu trữ và nghiên cứu âm nhạc truyền thống Việt Nam. Backend sử dụng **EF Core + PostgreSQL**.

Hệ thống **đã có sẵn** chức năng phân tích metadata audio (nhận diện nhạc cụ, tempo, key, ethnic group, vocal style) thông qua `AIAnalysisController` và service `AudioProcessingService`. Controller hiện tại:

```csharp
[ApiController]
[Route("api/[controller]")]
public class AIAnalysisController : ControllerBase
{
    private readonly IAudioProcessingService _processingService;

    public AIAnalysisController(IAudioProcessingService processingService)
    {
        _processingService = processingService;
    }

    // API phân tích metadata (ĐÃ CÓ SẴN - KHÔNG SỬA)
    [HttpPost("analyze-only")]
    [AllowAnonymous]
    public async Task<ActionResult<AIAnalysisResultDto>> AnalyzeOnly(IFormFile audioFile)
    {
        var result = await _processingService.AnalyzeAudioAsync(audioFile);
        return Ok(result);
    }
}
```

## Database schema liên quan

Bảng `Recordings` đã có sẵn các cột cho lyrics:
- `LyricsOriginal` (text) — lời gốc (ngôn ngữ dân tộc hoặc tiếng Việt)
- `LyricsVietnamese` (text) — bản dịch tiếng Việt

Bảng `AudioAnalysisResults` lưu kết quả phân tích metadata:
- `DetectedInstrumentsJson`, `DetectedTempo`, `DetectedKey`
- `SpectralFeaturesJson`, `SuggestedEthnicGroup`, `SuggestedMetadataJson`
- `AnalyzedAt`

## YÊU CẦU: Thêm 2 API endpoint mới vào `AIAnalysisController`

### API 1: `POST /api/AIAnalysis/transcribe-only`

Chỉ transcribe audio, không phân tích metadata.

**Input:** `IFormFile audioFile`
**Output:** DTO chứa transcript text
**Logic:**
1. Validate file (kiểm tra format audio hợp lệ: .flac, .wav, .mp3, .m4a, .ogg, .webm)
2. Kiểm tra file size ≤ 25MB (giới hạn của OpenAI Whisper API)
3. Gọi OpenAI Whisper API (`POST https://api.openai.com/v1/audio/transcriptions`) với:
   - model: `whisper-1`
   - language: `vi` (tiếng Việt)
   - response_format: `verbose_json` (để có thêm thông tin duration, segments nếu cần)
4. Trả về kết quả transcript

### API 2: `POST /api/AIAnalysis/analyze-and-transcribe`

Vừa phân tích metadata VÀ transcribe trong cùng 1 request.

**Input:** `IFormFile audioFile`
**Output:** DTO kết hợp cả kết quả phân tích metadata + transcript
**Logic:**
1. Validate file tương tự API 1
2. Chạy **song song** (parallel) cả 2 tác vụ bằng `Task.WhenAll`:
   - Task 1: Gọi `_processingService.AnalyzeAudioAsync(audioFile)` (service đã có sẵn)
   - Task 2: Gọi Whisper transcription service mới
3. Gộp kết quả từ cả 2 task vào 1 DTO response trả về

## Hướng dẫn implementation chi tiết

### 1. Tạo DTO mới

```
DTOs/
├── TranscriptionResultDto.cs          // Kết quả chỉ transcribe
└── AnalyzeAndTranscribeResultDto.cs   // Kết quả kết hợp cả 2
```

**`TranscriptionResultDto`** cần chứa:
- `Text` (string) — full transcript
- `Language` (string) — ngôn ngữ phát hiện được
- `Duration` (double?) — thời lượng audio (giây)
- `Segments` (List) — danh sách các đoạn transcript có timestamp (start, end, text) — hữu ích cho việc đối chiếu lời với thời điểm trong bản ghi

**`AnalyzeAndTranscribeResultDto`** cần chứa:
- Toàn bộ fields từ `AIAnalysisResultDto` (kết quả phân tích metadata đã có)
- Thêm property `Transcription` kiểu `TranscriptionResultDto`

### 2. Tạo Whisper Transcription Service

```
Services/
└── WhisperTranscriptionService.cs
```

**Interface `IWhisperTranscriptionService`:**
- `Task<TranscriptionResultDto> TranscribeAsync(IFormFile audioFile)`
- `Task<TranscriptionResultDto> TranscribeAsync(Stream audioStream, string fileName)`

**Implementation `WhisperTranscriptionService`:**
- Inject `HttpClient` qua `IHttpClientFactory` (KHÔNG tạo HttpClient trực tiếp — tránh socket exhaustion)
- Inject `IConfiguration` để đọc API key từ `appsettings.json` key path: `OpenAI:ApiKey`
- Gọi `POST https://api.openai.com/v1/audio/transcriptions` với `multipart/form-data`:
  - `file`: audio stream
  - `model`: `"whisper-1"`
  - `language`: `"vi"`
  - `response_format`: `"verbose_json"`
- Parse JSON response từ OpenAI, map sang `TranscriptionResultDto`
- Xử lý error: timeout (đặt timeout 120 giây cho HttpClient vì file lớn xử lý lâu), HTTP error codes, rate limit (429)
- Log lại thời gian xử lý và kết quả

### 3. Xử lý file cho parallel execution (API 2)

**Vấn đề:** `IFormFile` stream chỉ đọc được 1 lần. Khi chạy song song 2 task, cả 2 đều cần đọc stream.

**Giải pháp:** Copy `IFormFile` vào `MemoryStream` trước, rồi tạo 2 stream copy riêng biệt cho 2 task:

```csharp
// Pseudocode — implement chi tiết
using var memoryStream = new MemoryStream();
await audioFile.CopyToAsync(memoryStream);
var fileBytes = memoryStream.ToArray();

// Tạo 2 stream riêng cho 2 task
var streamForAnalysis = new MemoryStream(fileBytes);
var streamForTranscription = new MemoryStream(fileBytes);
```

Lưu ý: Cần wrap stream thành `IFormFile` mock nếu `AnalyzeAudioAsync` yêu cầu `IFormFile` input, hoặc tạo overload nhận `Stream`.

### 4. Đăng ký DI trong `Program.cs` / `Startup.cs`

```csharp
// Đăng ký HttpClient cho Whisper service
builder.Services.AddHttpClient<IWhisperTranscriptionService, WhisperTranscriptionService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(120); // Timeout cho file lớn
});
```

### 5. Cấu hình `appsettings.json`

Thêm section:
```json
{
  "OpenAI": {
    "ApiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

Nhớ thêm `"OpenAI:ApiKey"` vào `appsettings.Development.json` hoặc User Secrets cho dev, **KHÔNG commit API key vào source control**.

### 6. Cập nhật `AIAnalysisController`

Inject thêm `IWhisperTranscriptionService` vào constructor controller. Thêm 2 endpoint mới. **KHÔNG sửa endpoint `analyze-only` hiện có.**

Cả 2 endpoint mới đều cần:
- `[AllowAnonymous]` (tương tự endpoint cũ, để test — sau này sẽ thêm auth)
- Validate file extension và file size trước khi xử lý
- Try-catch với error handling phù hợp, trả về `BadRequest` hoặc `StatusCode(500)` khi lỗi
- Trả về response time trong header hoặc trong DTO để FE hiển thị

## Cấu trúc response mẫu

### `POST /api/AIAnalysis/transcribe-only`
```json
{
  "text": "Trời ơi trời ơi, hoa nở trên đồi...",
  "language": "vi",
  "duration": 245.6,
  "segments": [
    { "start": 0.0, "end": 3.5, "text": "Trời ơi trời ơi" },
    { "start": 3.5, "end": 8.2, "text": "hoa nở trên đồi" }
  ]
}
```

### `POST /api/AIAnalysis/analyze-and-transcribe`
```json
{
  "analysis": {
    "detectedInstruments": ["đàn bầu", "sáo trúc"],
    "detectedTempo": 92.5,
    "detectedKey": "Am",
    "suggestedEthnicGroup": "Kinh",
    "suggestedMetadata": { ... }
  },
  "transcription": {
    "text": "Trời ơi trời ơi, hoa nở trên đồi...",
    "language": "vi",
    "duration": 245.6,
    "segments": [...]
  }
}
```

## Lưu ý quan trọng

1. **KHÔNG sửa code cũ** — chỉ thêm mới. Endpoint `analyze-only` giữ nguyên 100%.
2. **File size limit 25MB** — Whisper API giới hạn. Validate ở controller level và trả lỗi rõ ràng.
3. **Parallel execution** ở API 2 — dùng `Task.WhenAll` để chạy analysis và transcription đồng thời, giảm tổng thời gian response.
4. **HttpClient best practices** — dùng `IHttpClientFactory`, không `new HttpClient()`.
5. **Error handling** — Whisper API có thể trả 429 (rate limit), 413 (file quá lớn), 500. Cần handle từng case.
6. **Logging** — Log thời gian gọi Whisper API, file size, duration audio để monitor performance.
7. **Tiếng dân tộc thiểu số** — Whisper hỗ trợ tiếng Việt tốt nhưng tiếng dân tộc (Tày, Thái, Ê-đê...) sẽ kém chính xác. Transcript là suggestion ban đầu, expert sẽ review và sửa sau qua field `LyricsOriginal` trong bảng `Recordings`.
8. **OpenAI Whisper response format** khi `response_format=verbose_json`:
```json
{
  "task": "transcribe",
  "language": "vietnamese",
  "duration": 245.6,
  "text": "full transcript...",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "segment text",
      "tokens": [...],
      "temperature": 0.0,
      "avg_logprob": -0.25,
      "compression_ratio": 1.1,
      "no_speech_prob": 0.01
    }
  ]
}
```

## Tóm tắt các file cần tạo/sửa

| File | Hành động |
|------|-----------|
| `DTOs/TranscriptionResultDto.cs` | **TẠO MỚI** |
| `DTOs/TranscriptionSegmentDto.cs` | **TẠO MỚI** |
| `DTOs/AnalyzeAndTranscribeResultDto.cs` | **TẠO MỚI** |
| `Services/IWhisperTranscriptionService.cs` | **TẠO MỚI** |
| `Services/WhisperTranscriptionService.cs` | **TẠO MỚI** |
| `Controllers/AIAnalysisController.cs` | **SỬA** — thêm 2 endpoint, inject thêm service |
| `Program.cs` hoặc `Startup.cs` | **SỬA** — đăng ký DI cho WhisperTranscriptionService |
| `appsettings.json` | **SỬA** — thêm section OpenAI config |
