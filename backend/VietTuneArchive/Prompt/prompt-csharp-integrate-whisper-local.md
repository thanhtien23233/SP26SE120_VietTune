# PROMPT: Tích hợp C# .NET Backend với viettune-whisper-service (Python local)

## Bối cảnh

Dự án **VietTune Archive** (C# .NET, EF Core, PostgreSQL) đã có sẵn:

1. **`AIAnalysisController`** với endpoint `POST /api/AIAnalysis/analyze-only` — phân tích metadata audio (nhạc cụ, tempo, key, ethnic group). **KHÔNG ĐƯỢC SỬA endpoint này.**

2. **`GeminiTranscriptionService`** (hoặc `WhisperTranscriptionService` cũ gọi cloud API) — **KHÔNG ĐƯỢC SỬA, KHÔNG XÓA** các file cũ. Để nguyên code cũ, chỉ thêm mới.

3. **Python FastAPI service** chạy local tại `http://localhost:8001` cung cấp:
   - `POST /transcribe` — nhận file audio (multipart), trả JSON transcript
   - `GET /health` — health check
   - Auth qua header `X-API-Key`

**Response mẫu từ Python service `POST /transcribe`:**
```json
{
  "text": "Trời ơi trời ơi, hoa nở trên đồi...",
  "language": "vi",
  "duration": 245.6,
  "segments": [
    {"start": 0.0, "end": 3.5, "text": "Trời ơi trời ơi"},
    {"start": 3.5, "end": 8.2, "text": "hoa nở trên đồi"}
  ],
  "processing_time": 12.34,
  "model_used": "medium"
}
```

---

## YÊU CẦU: Chỉ THÊM MỚI, không sửa code cũ

### Quy tắc tuyệt đối

| Được làm | KHÔNG được làm |
|------------|------------------|
| Tạo file mới | Sửa/xóa `GeminiTranscriptionService` |
| Thêm endpoint mới vào `AIAnalysisController` | Sửa/xóa endpoint `analyze-only` |
| Thêm DI registration mới trong `Program.cs` | Xóa DI registration cũ |
| Tạo DTO mới | Sửa DTO cũ (`AIAnalysisResultDto`) |
| Thêm config mới trong `appsettings.json` | Xóa config cũ (`Gemini:ApiKey`, `OpenAI:ApiKey`) |

---

## Files cần TẠO MỚI

### 1. `DTOs/LocalTranscriptionResultDto.cs`

```csharp
// Map chính xác với response từ Python service
public class LocalTranscriptionResultDto
{
    public string Text { get; set; }                              // Full transcript
    public string Language { get; set; }                          // "vi"
    public double? Duration { get; set; }                         // Thời lượng audio (giây)
    public List<TranscriptionSegmentDto> Segments { get; set; }   // Segments có timestamp
    public double ProcessingTime { get; set; }                    // Thời gian Whisper xử lý (giây)
    public string ModelUsed { get; set; }                         // "medium"
}
```

### 2. `DTOs/TranscriptionSegmentDto.cs`

(Nếu file này đã tồn tại từ implementation cũ thì KHÔNG tạo lại, dùng lại luôn)

```csharp
public class TranscriptionSegmentDto
{
    public double Start { get; set; }   // Giây bắt đầu
    public double End { get; set; }     // Giây kết thúc
    public string Text { get; set; }    // Nội dung đoạn
}
```

### 3. `DTOs/AnalyzeAndTranscribeResultDto.cs`

Kết hợp cả phân tích metadata + transcript trong 1 response:

```csharp
public class AnalyzeAndTranscribeResultDto
{
    public AIAnalysisResultDto Analysis { get; set; }                  // Kết quả phân tích (DTO cũ, dùng lại)
    public LocalTranscriptionResultDto Transcription { get; set; }     // Kết quả transcript
}
```

### 4. `Services/ILocalWhisperService.cs` — Interface

```csharp
public interface ILocalWhisperService
{
    /// <summary>
    /// Gọi Python Whisper service local để transcribe audio
    /// </summary>
    Task<LocalTranscriptionResultDto> TranscribeAsync(IFormFile audioFile, string language = "vi");
    
    /// <summary>
    /// Kiểm tra Python service có đang chạy không
    /// </summary>
    Task<bool> IsHealthyAsync();
}
```

### 5. `Services/LocalWhisperService.cs` — Implementation

**Đây là file quan trọng nhất.** Service này gọi HTTP đến Python FastAPI.

**Constructor nhận:**
- `HttpClient` (qua `IHttpClientFactory`)
- `IConfiguration` để đọc config
- `ILogger<LocalWhisperService>`

**Config đọc từ `appsettings.json`:**
```json
{
  "LocalWhisperService": {
    "BaseUrl": "http://localhost:8001",
    "ApiKey": "viettune-whisper-secret-2026",
    "TimeoutSeconds": 300
  }
}
```

**Method `TranscribeAsync` logic:**
1. Tạo `MultipartFormDataContent`
2. Add file stream với field name `"file"` (đúng với Python service nhận)
3. Add header `X-API-Key` vào request
4. Có thể thêm query param `?language=vi` nếu Python service hỗ trợ
5. `POST` đến `{BaseUrl}/transcribe`
6. Kiểm tra response status:
   - 200: parse JSON → `LocalTranscriptionResultDto`
   - 401: throw exception "Whisper service authentication failed — kiểm tra API key"
   - 503: throw exception "Whisper service unavailable — model chưa load xong"
   - 400: throw exception với message từ response body
   - Khác: throw exception với status code + body
7. Log: file name, file size, processing time từ response

**Method `IsHealthyAsync` logic:**
1. `GET` đến `{BaseUrl}/health`
2. Return `true` nếu status 200 và response chứa `"model_loaded": true`
3. Return `false` nếu bất kỳ exception hoặc status khác
4. Timeout ngắn (5 giây) — chỉ để check nhanh

**Error handling quan trọng:**
- `HttpRequestException` khi Python service không chạy → throw message rõ ràng: "Whisper service không khả dụng tại {BaseUrl}. Kiểm tra Python service đã chạy chưa."
- `TaskCanceledException` khi timeout → throw: "Whisper service timeout sau {TimeoutSeconds}s. File có thể quá lớn."
- Mọi exception khác → log full error + rethrow

### 6. Cập nhật `AIAnalysisController` — THÊM 3 endpoint mới

Inject thêm `ILocalWhisperService` vào constructor (giữ nguyên các inject cũ):

```csharp
// Constructor mới
public AIAnalysisController(
    IAudioProcessingService processingService,    // CŨ — giữ nguyên
    ILocalWhisperService localWhisperService      // MỚI — thêm vào
)
```

#### Endpoint mới 1: `POST /api/AIAnalysis/transcribe-only`

Chỉ transcribe, không phân tích metadata.

```csharp
[HttpPost("transcribe-only")]
[AllowAnonymous]
public async Task<ActionResult<LocalTranscriptionResultDto>> TranscribeOnly(IFormFile audioFile)
```

**Logic:**
1. Validate `audioFile` không null, không rỗng
2. Validate extension: `.flac`, `.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm`, `.mp4`
3. Validate size: ≤ 100MB (local service không giới hạn 25MB)
4. Gọi `_localWhisperService.TranscribeAsync(audioFile)`
5. Try-catch:
   - Thành công → `Ok(result)`
   - Exception → Log error, trả `StatusCode(500, new { error = ex.Message })`

#### Endpoint mới 2: `POST /api/AIAnalysis/analyze-and-transcribe`

Chạy SONG SONG phân tích metadata + transcribe.

```csharp
[HttpPost("analyze-and-transcribe")]
[AllowAnonymous]
public async Task<ActionResult<AnalyzeAndTranscribeResultDto>> AnalyzeAndTranscribe(IFormFile audioFile)
```

**Logic:**
1. Validate file tương tự endpoint trên
2. **Copy file vào MemoryStream** trước (vì IFormFile stream chỉ đọc 1 lần):
   ```csharp
   using var memoryStream = new MemoryStream();
   await audioFile.CopyToAsync(memoryStream);
   var fileBytes = memoryStream.ToArray();
   ```
3. Tạo 2 `IFormFile` mock từ `fileBytes` — hoặc tạo helper method `CreateFormFile(byte[] bytes, string fileName, string contentType)` trả về `FormFile`
4. Chạy song song bằng `Task.WhenAll`:
   ```csharp
   var analysisTask = _processingService.AnalyzeAudioAsync(formFileForAnalysis);
   var transcribeTask = _localWhisperService.TranscribeAsync(formFileForTranscribe);
   await Task.WhenAll(analysisTask, transcribeTask);
   ```
5. Gộp kết quả:
   ```csharp
   var result = new AnalyzeAndTranscribeResultDto
   {
       Analysis = analysisTask.Result,
       Transcription = transcribeTask.Result
   };
   return Ok(result);
   ```
6. Error handling: Nếu 1 trong 2 task fail, vẫn trả kết quả của task thành công + error message cho task lỗi. **KHÔNG** để 1 task fail làm mất kết quả task kia. Dùng pattern:
   ```csharp
   // Thay vì Task.WhenAll throw ngay khi 1 task fail
   // Chạy riêng và bắt exception từng task
   AIAnalysisResultDto analysisResult = null;
   LocalTranscriptionResultDto transcriptionResult = null;
   string analysisError = null;
   string transcriptionError = null;

   var analysisTask = Task.Run(async () => {
       try { analysisResult = await _processingService.AnalyzeAudioAsync(...); }
       catch (Exception ex) { analysisError = ex.Message; }
   });
   var transcribeTask = Task.Run(async () => {
       try { transcriptionResult = await _localWhisperService.TranscribeAsync(...); }
       catch (Exception ex) { transcriptionError = ex.Message; }
   });

   await Task.WhenAll(analysisTask, transcribeTask);
   ```
   Trả response luôn 200 nhưng field nào lỗi thì null + kèm error message.

#### Endpoint mới 3: `GET /api/AIAnalysis/whisper-health`

Kiểm tra Python Whisper service có sẵn sàng không.

```csharp
[HttpGet("whisper-health")]
[AllowAnonymous]
public async Task<ActionResult> WhisperHealth()
```

**Logic:**
1. Gọi `_localWhisperService.IsHealthyAsync()`
2. `true` → `Ok(new { status = "healthy" })`
3. `false` → `StatusCode(503, new { status = "unhealthy", message = "Whisper service is not available" })`

---

## Files cần SỬA (chỉ THÊM, không xóa dòng nào)

### 7. `Program.cs` (hoặc `Startup.cs`) — Thêm DI registration

Thêm vào DƯỚI các registration hiện có (không sửa/xóa registration cũ):

```csharp
// === LOCAL WHISPER SERVICE (MỚI) ===
builder.Services.AddHttpClient<ILocalWhisperService, LocalWhisperService>(client =>
{
    var baseUrl = builder.Configuration["LocalWhisperService:BaseUrl"] ?? "http://localhost:8001";
    client.BaseAddress = new Uri(baseUrl);
    
    var timeout = int.Parse(builder.Configuration["LocalWhisperService:TimeoutSeconds"] ?? "300");
    client.Timeout = TimeSpan.FromSeconds(timeout);
});
```

### 8. `appsettings.json` — Thêm section config

Thêm section mới, KHÔNG xóa config cũ (Gemini, OpenAI):

```json
{
  "LocalWhisperService": {
    "BaseUrl": "http://localhost:8001",
    "ApiKey": "viettune-whisper-secret-2026",
    "TimeoutSeconds": 300
  }
}
```

### 9. `appsettings.Development.json` — Override cho dev

```json
{
  "LocalWhisperService": {
    "BaseUrl": "http://localhost:8001",
    "ApiKey": "viettune-whisper-secret-2026",
    "TimeoutSeconds": 300
  }
}
```

---

## Helper cần tạo (nếu chưa có)

### `Helpers/FormFileHelper.cs`

Tạo `IFormFile` từ byte array — dùng cho parallel execution khi cần 2 stream riêng:

```csharp
public static class FormFileHelper
{
    public static IFormFile CreateFromBytes(byte[] bytes, string fileName, string contentType)
    {
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }
}
```

---

## Response mẫu các endpoint mới

### `POST /api/AIAnalysis/transcribe-only`
```json
{
  "text": "Trời ơi trời ơi, hoa nở trên đồi...",
  "language": "vi",
  "duration": 245.6,
  "segments": [
    {"start": 0.0, "end": 3.5, "text": "Trời ơi trời ơi"},
    {"start": 3.5, "end": 8.2, "text": "hoa nở trên đồi"}
  ],
  "processingTime": 12.34,
  "modelUsed": "medium"
}
```

### `POST /api/AIAnalysis/analyze-and-transcribe` (cả 2 thành công)
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
    "segments": [...],
    "processingTime": 12.34,
    "modelUsed": "medium"
  }
}
```

### `POST /api/AIAnalysis/analyze-and-transcribe` (1 task lỗi)
```json
{
  "analysis": {
    "detectedInstruments": ["đàn bầu"],
    "detectedTempo": 92.5,
    ...
  },
  "transcription": null,
  "errors": {
    "transcription": "Whisper service không khả dụng tại http://localhost:8002"
  }
}
```

### `GET /api/AIAnalysis/whisper-health`
```json
{
  "status": "healthy"
}
```

---

## Tóm tắt tất cả file

| File | Hành động | Ghi chú |
|------|-----------|---------|
| `DTOs/LocalTranscriptionResultDto.cs` | **TẠO MỚI** | Map với Python response |
| `DTOs/TranscriptionSegmentDto.cs` | **TẠO MỚI** (nếu chưa có) | Segment có start/end/text |
| `DTOs/AnalyzeAndTranscribeResultDto.cs` | **TẠO MỚI** | Kết hợp analysis + transcription |
| `Services/ILocalWhisperService.cs` | **TẠO MỚI** | Interface |
| `Services/LocalWhisperService.cs` | **TẠO MỚI** | Gọi HTTP đến Python service |
| `Helpers/FormFileHelper.cs` | **TẠO MỚI** | Helper tạo IFormFile từ bytes |
| `Controllers/AIAnalysisController.cs` | **SỬA** | Thêm inject + 3 endpoint mới |
| `Program.cs` | **SỬA** | Thêm DI registration |
| `appsettings.json` | **SỬA** | Thêm section `LocalWhisperService` |
| `appsettings.Development.json` | **SỬA** | Override config cho dev |

---

## Checklist kiểm tra sau khi implement

1. ☐ Chạy Python whisper service: `uvicorn main:app --host 0.0.0.0 --port 8001`
2. ☐ Chạy .NET backend
3. ☐ `GET /api/AIAnalysis/whisper-health` trả `200 healthy`
4. ☐ `POST /api/AIAnalysis/transcribe-only` với file mp3 → trả transcript JSON
5. ☐ `POST /api/AIAnalysis/analyze-and-transcribe` → trả cả analysis + transcription
6. ☐ Tắt Python service → `transcribe-only` trả error rõ ràng, `analyze-and-transcribe` vẫn trả analysis + transcription null
7. ☐ Upload file > 100MB → trả 400 Bad Request
8. ☐ Upload file .txt (sai format) → trả 400 Bad Request
9. ☐ Endpoint `analyze-only` CŨ vẫn hoạt động bình thường, không bị ảnh hưởng
