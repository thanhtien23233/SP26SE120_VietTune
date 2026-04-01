# PROMPT CHO AI AGENT: .NET Integration — HTTP Call FastAPI + ONNX Classifier

> **Mục đích**: Thêm vào project .NET khả năng:
> 1. Gửi audio file tới Python FastAPI service → nhận embeddings 1024-d
> 2. Chạy ONNX classifier trên embeddings → scores
> 3. Aggregate chunk-by-chunk → danh sách nhạc cụ detected
>
> **ĐÃ CÓ SẴN trong project**:
> - `instrument_classifier.onnx` (từ Python training pipeline)
> - `class_names.txt` (mapping index → tên nhạc cụ)
>
> **KHÔNG CẦN**: FftSharp, mel spectrogram, yamnet_backbone.onnx
>
> **QUAN TRỌNG**: Agent PHẢI đọc source code project .NET TRƯỚC khi viết code.

---

## BƯỚC 0: KHẢO SÁT PROJECT (BẮT BUỘC)

```bash
# Cấu trúc project
find . -name "*.csproj" -o -name "*.sln" | head -10
find . -type f -name "*.cs" | grep -v "/bin/" | grep -v "/obj/" | head -50

# DbContext
grep -rn ": DbContext" --include="*.cs"
grep -n "DbSet" --include="*.cs" -r | grep -i "audio\|recording\|instrument"

# Entity classes
grep -rn "class AudioAnalysisResult" --include="*.cs"
grep -rn "class Recording " --include="*.cs"

# Conventions
find . -name "*Controller.cs" -not -path "*/bin/*" | head -5
find . -name "*Service.cs" -not -path "*/bin/*" | head -5
find . -name "Program.cs" -not -path "*/bin/*" | head -5

# Auth pattern
grep -rn "\[Authorize\]" --include="*.cs" | head -5

# Kiểm tra có HttpClient factory không
grep -rn "AddHttpClient\|IHttpClientFactory\|HttpClient" --include="*.cs" | head -10
```

Ghi nhớ: root namespace, DbContext name, entity names, folder structure, conventions.

---

## BƯỚC 1: CÀI NUGET PACKAGES

```bash
dotnet add package Microsoft.ML.OnnxRuntime --version 1.19.2
```

CHỈ CẦN 1 PACKAGE DUY NHẤT.

Không cần: NAudio, FftSharp (Python xử lý audio hết).

---

## BƯỚC 2: THÊM CONFIG

Thêm vào `appsettings.json`:

```json
{
  "YamNetService": {
    "BaseUrl": "http://localhost:8000",
    "TimeoutSeconds": 120
  }
}
```

Thêm vào `appsettings.Development.json`:

```json
{
  "YamNetService": {
    "BaseUrl": "http://localhost:8000"
  }
}
```

Tạo class config (đặt theo convention project):

```csharp
public class YamNetServiceConfig
{
    public string BaseUrl { get; set; } = "http://localhost:8000";
    public int TimeoutSeconds { get; set; } = 120;
}
```

---

## BƯỚC 3: COPY MODEL FILES + CSPROJ

Kiểm tra project đã có `instrument_classifier.onnx` và `class_names.txt` chưa.
Nếu chưa, tạo `Models/AI/` và thêm vào `.csproj`:

```xml
<ItemGroup>
  <None Update="Models\AI\instrument_classifier.onnx">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
  <None Update="Models\AI\class_names.txt">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
</ItemGroup>
```

---

## BƯỚC 4: TẠO DTOs

Tạo trong thư mục DTOs/AudioAnalysis/ (hoặc theo convention project):

```csharp
// ============================================================
// Response từ Python FastAPI service
// ============================================================

/// <summary>
/// Response từ POST /extract-embeddings
/// </summary>
public class YamNetEmbeddingResponse
{
    [JsonPropertyName("embeddings")]
    public List<List<float>> Embeddings { get; set; } = new();

    [JsonPropertyName("num_frames")]
    public int NumFrames { get; set; }

    [JsonPropertyName("duration_seconds")]
    public float DurationSeconds { get; set; }

    [JsonPropertyName("sample_rate")]
    public int SampleRate { get; set; }
}

// ============================================================
// Internal DTOs cho kết quả phân tích
// ============================================================

/// <summary>Kết quả 1 chunk (1 embedding = 0.96s audio)</summary>
public class ChunkResult
{
    public int ChunkIndex { get; set; }
    public float StartSeconds { get; set; }
    public float EndSeconds { get; set; }
    public string PredictedInstrument { get; set; } = string.Empty;
    public float Confidence { get; set; }
}

/// <summary>1 đoạn liên tiếp cùng nhạc cụ</summary>
public class TimeSegment
{
    public float StartSeconds { get; set; }
    public float EndSeconds { get; set; }
    public float DurationSeconds { get; set; }
}

/// <summary>Tổng hợp 1 nhạc cụ detected</summary>
public class DetectedInstrumentSummary
{
    public string InstrumentName { get; set; } = string.Empty;
    public int ChunkCount { get; set; }
    public int TotalChunks { get; set; }
    public float Percentage { get; set; }
    public float AverageConfidence { get; set; }
    public List<TimeSegment> Segments { get; set; } = new();
}

/// <summary>Response chính — danh sách nhạc cụ detected</summary>
public class MultiInstrumentDetectionResponse
{
    /// <summary>Nhạc cụ detected, sort theo percentage giảm dần</summary>
    public List<DetectedInstrumentSummary> DetectedInstruments { get; set; } = new();

    /// <summary>Nhạc cụ chiếm % cao nhất</summary>
    public string PrimaryInstrument { get; set; } = string.Empty;

    /// <summary>Tổng chunks phân tích</summary>
    public int TotalChunks { get; set; }

    /// <summary>Thời lượng audio (giây)</summary>
    public float AudioDurationSeconds { get; set; }

    /// <summary>Ngưỡng detection (mặc định 0.10)</summary>
    public float DetectionThreshold { get; set; }

    /// <summary>Timeline từng chunk (null nếu không request)</summary>
    public List<ChunkResult>? Timeline { get; set; }
}
```

---

## BƯỚC 5: TẠO InstrumentDetectionService

**Đây là file chính.** Logic:
1. Gửi audio tới Python FastAPI → nhận danh sách embeddings
2. Mỗi embedding → chạy ONNX classifier → scores → argmax → nhạc cụ
3. Aggregate tất cả chunks → danh sách nhạc cụ

```
Class InstrumentDetectionService : IDisposable

Constants:
  DETECTION_THRESHOLD = 0.10f         // nhạc cụ phải >10% chunks
  FRAME_DURATION = 0.96f              // mỗi frame = 0.96 giây
  FRAME_HOP = 0.48f                   // frames overlap 50%
  BACKGROUND_CLASS = "background"     // bỏ khỏi kết quả

Fields:
  HttpClient _httpClient                  // gọi Python FastAPI
  InferenceSession _classifierSession     // ONNX classifier
  string[] _classNames                    // từ class_names.txt
  string _classifierInputName             // tên input tensor ONNX
  ILogger _logger

Constructor(HttpClient httpClient, IWebHostEnvironment env, ILogger):
  1. _httpClient = httpClient (inject qua HttpClientFactory)
  2. Load ONNX classifier:
     var onnxPath = Path.Combine(env.ContentRootPath, "Models", "AI", "instrument_classifier.onnx")
     var options = new SessionOptions { GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL }
     _classifierSession = new InferenceSession(onnxPath, options)
     _classifierInputName = _classifierSession.InputMetadata.Keys.First()
  3. Load class_names.txt:
     _classNames = File.ReadAllLines(classNamesPath).Where(l => !string.IsNullOrWhiteSpace(l)).ToArray()
  4. Log: "Classifier loaded. {N} classes: [...]"

Property SupportedInstruments → string[]:
  return _classNames

Method DetectMultipleInstrumentsAsync(Stream audioStream, string fileName):
  → Task<MultiInstrumentDetectionResponse>

  Flow:
  1. GỌI PYTHON FASTAPI:
     - Tạo MultipartFormDataContent
     - Thêm StreamContent với audioStream, name="file", fileName
     - POST tới "{baseUrl}/extract-embeddings"
     - Deserialize response thành YamNetEmbeddingResponse
     - embeddings = response.Embeddings (List<List<float>>)
     - Log: "Received {N} embeddings from YAMNet service"

     Code mẫu:
     ```csharp
     using var content = new MultipartFormDataContent();
     using var streamContent = new StreamContent(audioStream);
     streamContent.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");
     content.Add(streamContent, "file", fileName);

     var httpResponse = await _httpClient.PostAsync("/extract-embeddings", content);
     httpResponse.EnsureSuccessStatusCode();

     var json = await httpResponse.Content.ReadAsStringAsync();
     var yamnetResponse = JsonSerializer.Deserialize<YamNetEmbeddingResponse>(json);
     ```

  2. CHẠY ONNX CLASSIFIER cho mỗi embedding:
     var chunkResults = new List<ChunkResult>();

     for (int i = 0; i < yamnetResponse.Embeddings.Count; i++)
     {
         float[] embedding = yamnetResponse.Embeddings[i].ToArray();

         // Tạo tensor [1, 1024]
         var tensor = new DenseTensor<float>(embedding, new[] { 1, 1024 });
         var inputs = new List<NamedOnnxValue>
         {
             NamedOnnxValue.CreateFromTensor(_classifierInputName, tensor)
         };

         using var results = _classifierSession.Run(inputs);
         float[] scores = results.First().AsEnumerable<float>().ToArray();

         // Argmax
         int topIdx = Array.IndexOf(scores, scores.Max());

         chunkResults.Add(new ChunkResult
         {
             ChunkIndex = i,
             StartSeconds = i * FRAME_HOP,
             EndSeconds = i * FRAME_HOP + FRAME_DURATION,
             PredictedInstrument = _classNames[topIdx],
             Confidence = scores[topIdx],
         });
     }

  3. AGGREGATE:
     Gọi AggregateResults(chunkResults, yamnetResponse.DurationSeconds)

  4. Return MultiInstrumentDetectionResponse

Method AggregateResults(List<ChunkResult> chunks, float duration):
  → MultiInstrumentDetectionResponse

  1. Group chunks theo PredictedInstrument
  2. Với mỗi group:
     - instrumentName = group.Key
     - chunkCount = group.Count()
     - totalChunks = chunks.Count
     - percentage = chunkCount / (float)totalChunks
     - averageConfidence = group.Average(c => c.Confidence)
     - segments = MergeConsecutiveChunks(group)
  3. Lọc:
     - Bỏ percentage < DETECTION_THRESHOLD
     - Bỏ instrumentName == BACKGROUND_CLASS
  4. Sort theo percentage giảm dần
  5. Build response:
     - DetectedInstruments = filtered list
     - PrimaryInstrument = first item name (hoặc "unknown" nếu rỗng)
     - TotalChunks = chunks.Count
     - AudioDurationSeconds = duration
     - DetectionThreshold = DETECTION_THRESHOLD

Method MergeConsecutiveChunks(IEnumerable<ChunkResult> chunks):
  → List<TimeSegment>

  Sort theo ChunkIndex.
  Duyệt: nếu chunk liên tiếp (index +1) → mở rộng segment.
  Nếu không → đóng segment cũ, mở mới.
  Tính DurationSeconds = End - Start.

Dispose:
  _classifierSession?.Dispose()
```

---

## BƯỚC 6: TẠO CONTROLLER

AudioAnalysisController với 3 endpoints:

```
POST /api/audio-analysis/detect-instruments
  Input: IFormFile file
  Query: ?includeTimeline=true (tùy chọn)
  Validation: file null? extension .wav/.mp3? size < 50MB?
  Flow:
    1. file.OpenReadStream()
    2. _detectionService.DetectMultipleInstrumentsAsync(stream, file.FileName)
    3. Nếu !includeTimeline → result.Timeline = null
    4. Return Ok(result)
  Try-catch → log → 500

POST /api/audio-analysis/analyze-recording/{recordingId:guid}
  1. Tìm Recording trong DB → 404 nếu không có
  2. Download audio từ Recording.AudioFileUrl
     (TODO: dùng storage service của project)
  3. _detectionService.DetectMultipleInstrumentsAsync(stream, "recording.wav")
  4. Tạo AudioAnalysisResult entity:
     Id = Guid.NewGuid()
     RecordingId = recordingId
     DetectedInstrumentsJson = JsonSerializer.Serialize(result.DetectedInstruments)
     SuggestedMetadataJson = JsonSerializer.Serialize(result)
     AnalyzedAt = DateTime.UtcNow
  5. dbContext.Add → SaveChangesAsync
  6. Return Ok(result)

GET /api/audio-analysis/supported-instruments
  Return: _detectionService.SupportedInstruments
```

---

## BƯỚC 7: ĐĂNG KÝ DI TRONG Program.cs

```csharp
// 1. Bind config
builder.Services.Configure<YamNetServiceConfig>(
    builder.Configuration.GetSection("YamNetService"));

// 2. Đăng ký HttpClient cho InstrumentDetectionService
builder.Services.AddHttpClient<InstrumentDetectionService>((sp, client) =>
{
    var config = sp.GetRequiredService<IOptions<YamNetServiceConfig>>().Value;
    client.BaseAddress = new Uri(config.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(config.TimeoutSeconds);
});
```

LƯU Ý: Dùng `AddHttpClient<T>` (Typed HttpClient) — KHÔNG dùng `AddSingleton`.
Vì HttpClient cần được quản lý bởi HttpClientFactory.
InferenceSession vẫn nên tạo 1 lần trong constructor (singleton behavior
được đảm bảo bởi HttpClientFactory lifetime).

Nếu project dùng interface pattern, tạo `IInstrumentDetectionService` + đăng ký:
```csharp
builder.Services.AddHttpClient<IInstrumentDetectionService, InstrumentDetectionService>(...);
```

---

## BƯỚC 8: KIỂM TRA

```bash
# 1. Start Python service (terminal 1)
cd viettune-embedding-service
uvicorn app:app --host 0.0.0.0 --port 8000

# 2. Start .NET API (terminal 2)
dotnet run

# 3. Test health
curl http://localhost:8000/health
# → {"status":"ok"}

# 4. Test detect instruments
curl -X POST http://localhost:5000/api/audio-analysis/detect-instruments \
  -F "file=@test.wav"
# → {
#   "detectedInstruments": [
#     {"instrumentName":"dan_bau","percentage":0.65,...},
#     {"instrumentName":"dan_tranh","percentage":0.25,...}
#   ],
#   "primaryInstrument": "dan_bau",
#   ...
# }

# 5. Test supported instruments
curl http://localhost:5000/api/audio-analysis/supported-instruments
# → ["background","dan_bau","dan_tranh","sao_truc"]
```

---

## CẤU TRÚC FILES SAU KHI HOÀN TẤT

```
.NET Project/
├── Models/AI/
│   ├── instrument_classifier.onnx     ← ONNX classifier (đã có)
│   └── class_names.txt                ← Class mapping (đã có)
├── DTOs/AudioAnalysis/
│   └── InstrumentDetectionDtos.cs     ← MỚI
├── Services/
│   └── InstrumentDetectionService.cs  ← MỚI
├── Controllers/
│   └── AudioAnalysisController.cs     ← MỚI
├── appsettings.json                   ← Thêm YamNetService section
└── Program.cs                         ← Thêm HttpClient + Config

Python Service (riêng biệt)/
├── app.py                             ← FastAPI service
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## NUGET PACKAGES CẦN THIẾT (CHỈ 1 PACKAGE)

```
Microsoft.ML.OnnxRuntime    (~30MB)    — Chạy ONNX classifier
```

KHÔNG CẦN: NAudio, FftSharp, NWaves, MathNet.Numerics.

---

## QUY TẮC TUYỆT ĐỐI

1. **KHÔNG tạo mel spectrogram trong C#** — Python xử lý hết phần audio
2. **KHÔNG load yamnet_backbone.onnx** — không có file này, không cần
3. **HttpClient dùng HttpClientFactory** — KHÔNG new HttpClient() thủ công
4. **ONNX classifier input = float[1, 1024]** — embedding từ Python response
5. **Tuân theo conventions project** — namespace, return type, error handling, auth
6. **Không giả định** — đọc code project trước, tìm đúng tên DbContext, entity
7. **appsettings.json** — URL Python service phải configurable, không hardcode
8. **Timeout 120 giây** — audio dài (3+ phút) cần thời gian xử lý
