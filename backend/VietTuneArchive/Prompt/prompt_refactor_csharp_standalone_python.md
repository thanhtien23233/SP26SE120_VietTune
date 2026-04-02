# PROMPT CHO AI AGENT: Refactor C# Backend — Bỏ ONNX, Gọi Python /analyze Endpoint

> **Mục đích**: Refactor `InstrumentDetectionService` trong project .NET để:
> 1. BỎ HOÀN TOÀN dependency vào ONNX model files (`instrument_classifier.onnx`, `class_names.txt`)
> 2. BỎ HOÀN TOÀN NuGet package `Microsoft.ML.OnnxRuntime`
> 3. BỎ HOÀN TOÀN logic inference ONNX trong C# (RunInference, classify embeddings, aggregate scores)
> 4. C# CHỈ gửi file audio tới Python service endpoint `POST /analyze`, nhận JSON kết quả nhạc cụ
>
> **Lý do**: Python service (viettune-embedding-service) giờ đã xử lý TOÀN BỘ pipeline:
> Audio → YAMNet embeddings → ONNX classifier → Aggregate → Kết quả nhạc cụ.
> C# không cần giữ model files nữa, giúp deploy đơn giản hơn và tái sử dụng cao hơn.

---

## BƯỚC 0: KHẢO SÁT PROJECT (BẮT BUỘC — LÀM TRƯỚC KHI VIẾT CODE)

### 0.1. Tìm cấu trúc thư mục
```bash
# Tìm thư mục gốc project
find . -name "*.csproj" -type f

# Liệt kê cấu trúc
find . -type f -name "*.cs" | head -50
```

### 0.2. Tìm file InstrumentDetectionService hiện tại
```bash
find . -name "InstrumentDetectionService*" -type f
find . -name "*InstrumentDetection*" -type f
```
→ Đọc toàn bộ file này. Ghi nhớ:
- Namespace
- Interface (nếu có): `IInstrumentDetectionService`
- Constructor dependencies (HttpClient, IWebHostEnvironment, ILogger, InferenceSession...)
- Tất cả public methods
- DTOs đang dùng (response types)

### 0.3. Tìm file Controller
```bash
find . -name "AudioAnalysis*Controller*" -type f
```
→ Đọc toàn bộ. Ghi nhớ:
- Các endpoints hiện có
- Cách gọi service
- Authorization pattern
- Return type pattern (Ok, BadRequest, ApiResponse wrapper...)

### 0.4. Tìm DTOs hiện tại
```bash
find . -name "*InstrumentDetection*" -o -name "*AudioAnalysis*" | grep -i dto
find . -name "*MultiInstrument*" -type f
find . -name "*DetectionResult*" -type f
```
→ Đọc hết. Liệt kê tất cả DTOs đang dùng.

### 0.5. Tìm cách đăng ký DI hiện tại
```bash
grep -rn "InstrumentDetection" --include="*.cs" .
grep -rn "AddHttpClient\|AddSingleton\|AddScoped\|AddTransient" --include="*.cs" . | grep -i instrument
```
→ Ghi nhớ cách đăng ký hiện tại (Singleton? HttpClientFactory? Interface?)

### 0.6. Tìm config
```bash
grep -rn "YamNet\|Yamnet\|yamnet\|EmbeddingService\|embedding.service\|EMBEDDING" --include="*.json" --include="*.cs" .
```
→ Ghi nhớ key config hiện tại (URL, timeout...)

### 0.7. Tìm ONNX dependencies cần xóa
```bash
grep -rn "OnnxRuntime\|InferenceSession\|onnx\|\.onnx" --include="*.cs" --include="*.csproj" .
find . -name "*.onnx" -type f
find . -name "class_names.txt" -path "*/AI/*"
```

### 0.8. Kiểm tra conventions project
Đọc 2-3 controller/service khác để nắm:
- Return type: `IActionResult` hay `ActionResult<T>` hay custom `ApiResponse<T>`?
- Error handling: try-catch trong controller hay global exception middleware?
- Naming: PascalCase? camelCase response?
- Async pattern
- Logging pattern

---

## BƯỚC 1: XÓA ONNX DEPENDENCIES

### 1.1. Xóa NuGet package
Tìm file `.csproj` chứa OnnxRuntime:
```bash
grep -rn "OnnxRuntime" --include="*.csproj" .
```
→ Xóa dòng `<PackageReference Include="Microsoft.ML.OnnxRuntime" ... />`

### 1.2. Xóa model files (optional — có thể giữ làm backup)
```
Models/AI/instrument_classifier.onnx   ← KHÔNG CẦN NỮA
Models/AI/class_names.txt              ← KHÔNG CẦN NỮA
```

### 1.3. Xóa NAudio (nếu chỉ dùng cho instrument detection)
Kiểm tra NAudio có dùng ở chỗ khác không:
```bash
grep -rn "NAudio" --include="*.cs" . | grep -v "InstrumentDetection"
```
Nếu KHÔNG dùng ở đâu khác → xóa luôn `<PackageReference Include="NAudio" ... />`

---

## BƯỚC 2: TẠO DTOs MỚI CHO RESPONSE TỪ PYTHON

Python `/analyze` endpoint trả về JSON có cấu trúc sau:

```json
{
    "success": true,
    "data": {
        "instruments": [
            {
                "instrument": "dan_bau",
                "confidence": 0.8923,
                "max_confidence": 0.9512,
                "overall_average": 0.7234,
                "frame_ratio": 0.6500,
                "dominant_frames": 81,
                "total_frames": 124
            },
            {
                "instrument": "dan_tranh",
                "confidence": 0.7156,
                "max_confidence": 0.8234,
                "overall_average": 0.5123,
                "frame_ratio": 0.2500,
                "dominant_frames": 31,
                "total_frames": 124
            }
        ],
        "timeline": [
            {
                "instrument": "dan_bau",
                "start_seconds": 0.96,
                "end_seconds": 15.84,
                "num_frames": 30
            },
            {
                "instrument": "dan_tranh",
                "start_seconds": 16.32,
                "end_seconds": 25.44,
                "num_frames": 18
            }
        ],
        "audio_info": {
            "filename": "test.mp3",
            "duration_seconds": 180.0,
            "analyzed_duration": 60.0,
            "num_frames": 124,
            "sample_rate": 16000
        }
    }
}
```

### Tạo DTOs tương ứng:

Đặt trong thư mục DTOs phù hợp với convention project (tìm ở bước 0.4).

```
File: InstrumentDetectionDtos.cs (hoặc tách nhiều file nếu project convention như vậy)

Classes cần tạo:
─────────────────────────────────────────────────────────

1. PythonAnalyzeResponse
   - bool Success
   - PythonAnalyzeData Data

2. PythonAnalyzeData
   - List<DetectedInstrument> Instruments
   - List<InstrumentTimeSegment>? Timeline
   - AudioAnalysisInfo AudioInfo

3. DetectedInstrument
   - string Instrument
   - double Confidence
   - double MaxConfidence
   - double OverallAverage
   - double FrameRatio
   - int DominantFrames
   - int TotalFrames

4. InstrumentTimeSegment
   - string Instrument
   - double StartSeconds
   - double EndSeconds
   - int NumFrames

5. AudioAnalysisInfo
   - string Filename
   - double DurationSeconds
   - double AnalyzedDuration
   - int NumFrames
   - int SampleRate
```

⚠️ QUAN TRỌNG: Python trả JSON snake_case (`frame_ratio`), C# dùng PascalCase.
Thêm `JsonPropertyName` attribute:

```csharp
using System.Text.Json.Serialization;

public class DetectedInstrument
{
    [JsonPropertyName("instrument")]
    public string Instrument { get; set; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("max_confidence")]
    public double MaxConfidence { get; set; }

    [JsonPropertyName("overall_average")]
    public double OverallAverage { get; set; }

    [JsonPropertyName("frame_ratio")]
    public double FrameRatio { get; set; }

    [JsonPropertyName("dominant_frames")]
    public int DominantFrames { get; set; }

    [JsonPropertyName("total_frames")]
    public int TotalFrames { get; set; }
}
```

Làm tương tự cho TẤT CẢ DTOs. Mọi property đều cần `[JsonPropertyName("snake_case")]`.

---

## BƯỚC 3: VIẾT LẠI InstrumentDetectionService

### Nguyên tắc:
- BỎ HẾT: InferenceSession, _classifierSession, _classNames, RunInference, LoadAndResampleAudioAsync, SplitIntoChunks, AggregatePredictions, classify embeddings logic
- GIỮ LẠI: HttpClient (đã có sẵn), ILogger
- THÊM: Logic gọi HTTP POST /analyze → deserialize response

### Service mới (pseudocode):

```
Class InstrumentDetectionService

Fields:
  HttpClient _httpClient
  ILogger _logger

Constructor(HttpClient httpClient, ILogger<InstrumentDetectionService> logger):
  _httpClient = httpClient
  _logger = logger
  // KHÔNG load ONNX, KHÔNG load class_names.txt
  // KHÔNG cần IWebHostEnvironment nữa

Method DetectInstrumentsAsync(Stream audioStream, string fileName, bool includeTimeline = false):
  → Task<PythonAnalyzeResponse>

  Flow:
  1. Tạo MultipartFormDataContent
  2. Thêm StreamContent với audioStream
  3. POST tới "/analyze?include_timeline={includeTimeline}"
  4. Deserialize response thành PythonAnalyzeResponse
  5. Return

  Code:
  ─────
  using var content = new MultipartFormDataContent();
  
  // QUAN TRỌNG: Reset stream position nếu cần
  if (audioStream.CanSeek)
      audioStream.Position = 0;
  
  using var streamContent = new StreamContent(audioStream);
  streamContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
  content.Add(streamContent, "file", fileName);

  var url = $"/analyze?include_timeline={includeTimeline.ToString().ToLower()}";
  
  _logger.LogInformation("Sending {FileName} to instrument detection service...", fileName);
  
  var response = await _httpClient.PostAsync(url, content);
  
  if (!response.IsSuccessStatusCode)
  {
      var errorBody = await response.Content.ReadAsStringAsync();
      _logger.LogError("Instrument detection failed: {StatusCode} - {Error}", 
          response.StatusCode, errorBody);
      throw new HttpRequestException($"Instrument detection service returned {response.StatusCode}: {errorBody}");
  }
  
  var json = await response.Content.ReadAsStringAsync();
  var result = JsonSerializer.Deserialize<PythonAnalyzeResponse>(json);
  
  if (result?.Data?.Instruments != null)
  {
      var names = result.Data.Instruments.Select(i => i.Instrument).ToList();
      _logger.LogInformation("Detected instruments: {Instruments}", string.Join(", ", names));
  }
  
  return result;
  ─────

Method GetServiceHealthAsync():
  → Task<bool>
  
  try:
    var response = await _httpClient.GetAsync("/health");
    return response.IsSuccessStatusCode;
  catch:
    return false;
```

### KHÔNG implement IDisposable nữa (không có InferenceSession cần dispose)

### KHÔNG có property SupportedInstruments nữa
Nếu cần danh sách instruments, gọi `/health` endpoint lấy từ field `classes`.

---

## BƯỚC 4: CẬP NHẬT CONTROLLER

### Thay đổi endpoints:

**Endpoint detect-instruments:**

CŨ:
```csharp
using var stream = file.OpenReadStream();
var result = await _detectionService.DetectMultipleInstrumentsAsync(stream, file.FileName);
```

MỚI:
```csharp
using var stream = file.OpenReadStream();
var result = await _detectionService.DetectInstrumentsAsync(stream, file.FileName, includeTimeline);
return Ok(result.Data);  // hoặc Ok(result) tùy convention
```

**Endpoint analyze-recording/{recordingId}:**

Tương tự — gọi `DetectInstrumentsAsync` thay vì `DetectMultipleInstrumentsAsync`.

Khi lưu vào DB (bảng `AudioAnalysisResults`):
```csharp
var analysisResult = new AudioAnalysisResult
{
    Id = Guid.NewGuid(),
    RecordingId = recordingId,
    DetectedInstrumentsJson = JsonSerializer.Serialize(result.Data.Instruments),
    SuggestedMetadataJson = JsonSerializer.Serialize(result.Data),
    AnalyzedAt = DateTime.UtcNow,
    // Nếu bảng có thêm fields:
    DetectedTempo = null,   // Python service chưa trả tempo
    DetectedKey = null,     // Python service chưa trả key
};
```

**Endpoint supported-instruments:**

CŨ: return `_detectionService.SupportedInstruments`

MỚI: Có 2 cách:
- Cách 1: Hardcode danh sách (nếu ít thay đổi)
- Cách 2: Gọi `/health` lấy field `classes`:
```csharp
[HttpGet("supported-instruments")]
public async Task<IActionResult> GetSupportedInstruments()
{
    // Gọi health endpoint của Python service
    var response = await _httpClient.GetAsync("/health");
    var json = await response.Content.ReadAsStringAsync();
    var health = JsonSerializer.Deserialize<JsonElement>(json);
    var classes = health.GetProperty("classes").EnumerateArray()
        .Select(x => x.GetString())
        .Where(x => x != "background")
        .ToList();
    return Ok(classes);
}
```

**Xóa endpoint cũ detect-instrument (số ít) nếu không còn dùng.**

---

## BƯỚC 5: CẬP NHẬT DI REGISTRATION (Program.cs)

### Xóa:
```csharp
// XÓA những dòng liên quan đến ONNX singleton
builder.Services.AddSingleton<InstrumentDetectionService>();  // XÓA nếu là singleton
builder.Services.AddSingleton<MelSpectrogramExtractor>();     // XÓA nếu có
```

### Giữ/Sửa HttpClient registration:
```csharp
// GIỮ NGUYÊN hoặc SỬA — InstrumentDetectionService vẫn dùng HttpClientFactory
builder.Services.AddHttpClient<InstrumentDetectionService>((sp, client) =>
{
    var config = sp.GetRequiredService<IOptions<YamNetServiceConfig>>().Value;
    // HOẶC đọc từ IConfiguration trực tiếp
    client.BaseAddress = new Uri(config.BaseUrl);  
    client.Timeout = TimeSpan.FromSeconds(config.TimeoutSeconds);
});

// Nếu dùng interface pattern:
builder.Services.AddHttpClient<IInstrumentDetectionService, InstrumentDetectionService>((sp, client) =>
{
    // tương tự...
});
```

### Config trong appsettings.json:
```json
{
  "YamNetService": {
    "BaseUrl": "http://localhost:8000",
    "TimeoutSeconds": 120
  }
}
```

⚠️ Timeout 120 giây vì file audio dài cần thời gian xử lý.

---

## BƯỚC 6: XÓA CODE/FILES KHÔNG CẦN

Sau khi refactor xong, xóa:

### Files C# cần xóa:
```bash
# Tìm và xóa các file liên quan ONNX inference
find . -name "MelSpectrogramExtractor*" -type f     # Nếu có
find . -name "*YamNetEmbeddingResponse*" -type f     # DTO cũ nhận embeddings
```

### Xóa trong InstrumentDetectionService (nếu không tách file riêng):
- Method `RunInference`
- Method `LoadAndResampleAudioAsync`
- Method `SplitIntoChunks`
- Method `AggregatePredictions`
- Method `ClassifyEmbeddings` (nếu có)
- Method `MergeConsecutiveChunks` (nếu có — logic này giờ Python làm)
- Tất cả `using Microsoft.ML.OnnxRuntime*`
- Tất cả `using NAudio*` (nếu không dùng ở chỗ khác)

### Model files (có thể giữ backup hoặc xóa):
```
Models/AI/instrument_classifier.onnx
Models/AI/instrument_detector_full.onnx
Models/AI/yamnet_backbone.onnx
Models/AI/class_names.txt
```

---

## BƯỚC 7: KIỂM TRA

### 7.1. Build phải thành công
```bash
dotnet build
# KHÔNG được có error liên quan OnnxRuntime, InferenceSession, NAudio
```

### 7.2. Test endpoint
```bash
# 1. Chạy Python service (Docker hoặc local)
docker run -d -p 8000:8000 --name viettune-embedding thanhtien23233/viettune-embedding:latest
# HOẶC: uvicorn app:app --host 0.0.0.0 --port 8000

# 2. Verify Python service
curl http://localhost:8000/health
# → {"status":"ok","model":"yamnet_v1","classifier":"loaded","classes":["background","dan_bau","dan_tranh"]}

# 3. Chạy .NET API
dotnet run

# 4. Test detect instruments
curl -X POST http://localhost:5000/api/audio-analysis/detect-instruments \
  -F "file=@test.mp3"

# Expected response:
# {
#   "instruments": [
#     { "instrument": "dan_bau", "confidence": 0.89, "frameRatio": 0.65, ... }
#   ],
#   "timeline": null,
#   "audioInfo": { "durationSeconds": 180.0, ... }
# }

# 5. Test với timeline
curl -X POST "http://localhost:5000/api/audio-analysis/detect-instruments?includeTimeline=true" \
  -F "file=@test.mp3"

# 6. Test health/supported-instruments
curl http://localhost:5000/api/audio-analysis/supported-instruments
```

### 7.3. Verify ONNX đã bị xóa hoàn toàn
```bash
# Không còn reference nào tới OnnxRuntime
grep -rn "OnnxRuntime\|InferenceSession\|\.onnx" --include="*.cs" --include="*.csproj" .
# → Kết quả phải RỖNG

# Không còn NAudio (nếu đã xóa)
grep -rn "NAudio" --include="*.cs" --include="*.csproj" .
# → Kết quả phải RỖNG (hoặc chỉ ở chỗ khác không liên quan)
```

---

## TÓM TẮT THAY ĐỔI

| Thành phần | Hành động | Chi tiết |
|---|---|---|
| `Microsoft.ML.OnnxRuntime` NuGet | **XÓA** | Không cần nữa |
| `NAudio` NuGet | **XÓA** (nếu không dùng chỗ khác) | Không cần resample audio |
| `instrument_classifier.onnx` | **XÓA** (hoặc backup) | Python service giữ model |
| `class_names.txt` | **XÓA** (hoặc backup) | Python service giữ |
| `InstrumentDetectionService` | **VIẾT LẠI** | Chỉ gọi HTTP, không inference |
| DTOs cũ (embedding response) | **XÓA** | Thay bằng DTOs mới |
| DTOs mới (Python response) | **TẠO MỚI** | Map JSON từ Python `/analyze` |
| Controller endpoints | **CẬP NHẬT** | Gọi method mới, return data mới |
| DI registration | **CẬP NHẬT** | Bỏ Singleton ONNX, giữ HttpClient |
| `MelSpectrogramExtractor` | **XÓA** | Không cần |
| `RunInference`, `SplitIntoChunks`, `AggregatePredictions` | **XÓA** | Python làm hết |
| `LoadAndResampleAudioAsync` | **XÓA** | Python dùng librosa |
| appsettings.json | **GIỮ/SỬA** | URL Python service |

---

## KIẾN TRÚC SAU KHI REFACTOR

```
TRƯỚC (phức tạp):
  C# Backend
  ├── HttpClient → Python /extract-embeddings → nhận embeddings
  ├── ONNX InferenceSession → classify từng embedding
  ├── NAudio → resample audio
  ├── Aggregate logic → kết quả nhạc cụ
  ├── instrument_classifier.onnx (20MB)
  └── class_names.txt

SAU (đơn giản):
  C# Backend
  └── HttpClient → Python /analyze → nhận kết quả nhạc cụ (JSON)
      (XONG. Không cần gì khác.)
```

---

## QUY TẮC TUYỆT ĐỐI

1. **KHẢO SÁT TRƯỚC** — Bước 0 BẮT BUỘC trước khi viết bất kỳ code nào
2. **KHÔNG giả định** — đọc code project để biết đúng namespace, naming, return type, DI pattern
3. **MATCH CONVENTION** — mọi code mới phải giống phong cách code hiện có
4. **KHÔNG tạo file trùng** — nếu DTO đã có, sửa lại, KHÔNG tạo mới
5. **JsonPropertyName BẮT BUỘC** — mọi DTO property phải có `[JsonPropertyName("snake_case")]` vì Python trả snake_case
6. **Timeout 120 giây** — audio dài cần thời gian xử lý
7. **appsettings.json configurable** — URL Python service KHÔNG hardcode trong code
8. **XÓA SẠCH** — sau khi refactor, KHÔNG còn bất kỳ reference nào tới OnnxRuntime, InferenceSession, NAudio (nếu không dùng chỗ khác)
9. **KHÔNG sửa Python service** — chỉ sửa phía C#
10. **TEST BUILD** — `dotnet build` phải pass sau khi refactor
