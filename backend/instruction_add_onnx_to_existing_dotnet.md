# INSTRUCTION CHO AI AGENT: Tích Hợp ONNX Nhận Diện Nhạc Cụ Vào Hệ Thống .NET Có Sẵn

> **Mục đích**: AI agent đọc instruction này, tự phân tích source code project hiện có,
> rồi thêm chức năng nhận diện nhạc cụ bằng ONNX model vào đúng vị trí, đúng convention.
>
> **QUAN TRỌNG**: Agent PHẢI đọc source code project TRƯỚC khi viết code.
> KHÔNG được giả định tên namespace, DbContext, entity class, folder structure.

---

## BƯỚC 0: KHẢO SÁT PROJECT (BẮT BUỘC — CHẠY TRƯỚC KHI LÀM BẤT CỨ ĐIỀU GÌ)

Agent phải thực hiện các bước khảo sát sau và GHI NHỚ kết quả:

### 0.1. Tìm cấu trúc thư mục tổng quan

```bash
# Tìm file .csproj hoặc .sln
find . -name "*.csproj" -o -name "*.sln" | head -20

# Xem cấu trúc thư mục chính (bỏ bin/obj/node_modules)
find . -type f -name "*.cs" | grep -v "/bin/" | grep -v "/obj/" | head -50
```

Ghi nhớ:
- [ ] Đường dẫn file `.csproj` chính (backend API project)
- [ ] Thư mục chứa Controllers
- [ ] Thư mục chứa Services
- [ ] Thư mục chứa DTOs / Models / ViewModels
- [ ] Thư mục chứa Entity classes (domain models)

### 0.2. Tìm DbContext

```bash
# Tìm class kế thừa DbContext
grep -rl "DbContext" --include="*.cs" | head -10
grep -rn ": DbContext" --include="*.cs"
```

Ghi nhớ:
- [ ] Tên DbContext class (ví dụ: `ApplicationDbContext`, `VietTuneDbContext`, `AppDbContext`...)
- [ ] Namespace của DbContext
- [ ] Đường dẫn file DbContext

### 0.3. Tìm Entity classes liên quan

```bash
# Tìm entity AudioAnalysisResult
grep -rl "AudioAnalysisResult" --include="*.cs" | head -10
grep -rn "class AudioAnalysisResult" --include="*.cs"

# Tìm entity Recording
grep -rl "class Recording" --include="*.cs" | head -10

# Tìm entity Instrument
grep -rl "class Instrument " --include="*.cs" | head -10

# Tìm DbSet declarations
grep -n "DbSet" --include="*.cs" -r | grep -i "audio\|recording\|instrument"
```

Ghi nhớ:
- [ ] Tên + namespace entity class `AudioAnalysisResult` (có thể tên khác)
- [ ] Tên + namespace entity class `Recording`
- [ ] Tên + namespace entity class `Instrument`
- [ ] Tên DbSet properties trong DbContext

### 0.4. Tìm conventions đang dùng

```bash
# Xem 1 controller mẫu để học convention
find . -name "*Controller.cs" -not -path "*/bin/*" | head -5
# Đọc file controller đầu tiên tìm được

# Xem 1 service mẫu
find . -name "*Service.cs" -not -path "*/bin/*" | head -5

# Xem Program.cs hoặc Startup.cs
find . -name "Program.cs" -o -name "Startup.cs" | grep -v "/bin/" | head -5
```

Ghi nhớ:
- [ ] Root namespace (ví dụ: `VietTuneArchive`, `VietTune.API`...)
- [ ] Convention đặt tên controller (có dùng `[Route("api/[controller]")]` không?)
- [ ] Convention inject service (constructor injection? interface-based?)
- [ ] Services đăng ký ở đâu (Program.cs hay Startup.cs? có dùng extension methods?)
- [ ] Có dùng interface cho service không (ví dụ: `IXxxService` + `XxxService`)
- [ ] Convention return type controller (IActionResult? ActionResult<T>? custom response wrapper?)
- [ ] Có dùng response wrapper pattern không (ApiResponse<T>, Result<T>...)
- [ ] Cách xử lý lỗi (middleware? try-catch trong controller? Result pattern?)

### 0.5. Kiểm tra storage service (cho download audio file)

```bash
# Tìm cách project hiện tại handle file upload/download
grep -rn "IFormFile\|FileStream\|BlobClient\|AmazonS3\|CloudStorage" --include="*.cs" | head -10
grep -rn "AudioFileUrl\|StorageService\|FileService\|BlobService" --include="*.cs" | head -10
```

Ghi nhớ:
- [ ] Có storage service không? Tên là gì?
- [ ] Dùng local file system, Azure Blob, hay AWS S3?
- [ ] Cách download file từ URL hiện tại

### 0.6. Kiểm tra authentication/authorization

```bash
grep -rn "\[Authorize\]\|\[AllowAnonymous\]" --include="*.cs" | head -10
grep -rn "Role\|Policy\|Claims" --include="*.cs" | grep -i "authorize" | head -5
```

Ghi nhớ:
- [ ] Controller có cần `[Authorize]` không?
- [ ] Có role-based authorization không? Role nào được phép?

---

## BƯỚC 1: CÀI NUGET PACKAGES

Chạy trong thư mục chứa file `.csproj` của backend API:

```bash
dotnet add package Microsoft.ML.OnnxRuntime --version 1.19.2
dotnet add package NAudio --version 2.2.1
```

---

## BƯỚC 2: COPY MODEL FILES

Tạo thư mục `Models/AI/` (hoặc theo convention project nếu khác) trong project root.

Tạo placeholder files:

```bash
mkdir -p Models/AI
echo "Copy file instrument_detector_full.onnx vào đây" > Models/AI/README.txt
```

Thêm vào file `.csproj` (tìm file `.csproj` đúng từ bước 0.1):

```xml
<ItemGroup>
  <None Update="Models\AI\instrument_detector_full.onnx">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
  <None Update="Models\AI\class_names.txt">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
</ItemGroup>
```

---

## BƯỚC 3: TẠO DTOs

Tạo file DTOs theo convention project (tìm từ bước 0.4).

**Nếu project dùng thư mục `DTOs/`:** tạo `DTOs/AudioAnalysis/InstrumentDetectionDtos.cs`
**Nếu project dùng thư mục `Models/`:** tạo `Models/AudioAnalysis/InstrumentDetectionDtos.cs`
**Nếu project dùng thư mục `Contracts/`:** tạo `Contracts/AudioAnalysis/InstrumentDetectionDtos.cs`

Nội dung (điều chỉnh namespace theo project):

```
class InstrumentDetectionResponse:
  - string PredictedInstrument   (tên nhạc cụ có score cao nhất)
  - float Confidence             (score cao nhất, 0.0-1.0)
  - List<ClassScoreDto> AllScores (tất cả classes + scores, sort giảm dần)
  - int ChunksAnalyzed           (số chunks 3 giây đã xử lý)
  - float AudioDurationSeconds   (thời lượng audio)

class ClassScoreDto:
  - string ClassName
  - float Score

class RecordingAnalysisResponse:
  - Guid AnalysisResultId
  - Guid RecordingId
  - InstrumentDetectionResponse Detection
  - DateTime AnalyzedAt
```

Nếu project dùng response wrapper (ví dụ `ApiResponse<T>`), wrap các response trong wrapper đó.

---

## BƯỚC 4: TẠO SERVICE — InstrumentDetectionService

Đây là file quan trọng nhất. Tạo trong thư mục Services (tìm từ bước 0.1).

**Nếu project dùng interface pattern**, tạo 2 files:
- `IInstrumentDetectionService.cs` (interface)
- `InstrumentDetectionService.cs` (implementation)

**Nếu project không dùng interface**, tạo 1 file:
- `InstrumentDetectionService.cs`

### Cấu trúc service:

```
Constants:
  TargetSampleRate = 16000    (YAMNet yêu cầu 16kHz)
  ChunkSamples = 48000        (3 giây × 16000)

Fields:
  InferenceSession _session    (ONNX runtime session)
  string[] _classNames         (tên classes từ class_names.txt)
  ILogger _logger

Constructor(ILogger, IWebHostEnvironment):
  1. Tìm đường dẫn Models/AI/ từ env.ContentRootPath
  2. Load ONNX: new InferenceSession(onnxPath, sessionOptions)
     - sessionOptions.GraphOptimizationLevel = ORT_ENABLE_ALL
  3. Load class_names.txt: File.ReadAllLines → filter empty → ToArray
  4. Log: "Loaded {N} classes: [dan_bau, dan_tranh, ...]"

Method DetectInstrumentAsync(Stream audioStream, string fileName):
  → InstrumentDetectionResponse
  1. LoadAndResampleAudioAsync(stream, fileName) → float[] waveform
  2. SplitIntoChunks(waveform) → List<float[]> chunks
  3. foreach chunk → RunInference(chunk) → float[] scores
  4. AggregatePredictions(allPredictions) → float[] avgScores
  5. argmax(avgScores) → predictedIndex → classNames[index]
  6. Build InstrumentDetectionResponse (AllScores sorted descending)

Method LoadAndResampleAudioAsync(Stream, string):
  → float[]
  1. Copy stream → MemoryStream (NAudio cần seekable)
  2. Extension switch: .wav → WaveFileReader, .mp3 → Mp3FileReader
  3. MediaFoundationResampler(reader, WaveFormat(16000, 16, 1))
     ResamplerQuality = 60
  4. Read buffer → PCM 16-bit → float: BitConverter.ToInt16 / 32768f
  5. Return float[]

  ⚠️ MediaFoundationResampler CHỈ CHẠY TRÊN WINDOWS.
  Nếu project deploy Linux, thêm fallback dùng ffmpeg:
    - Save stream → temp file
    - Process.Start("ffmpeg", "-i input -ar 16000 -ac 1 -f wav output -y")
    - Read output WAV
    - Delete temp files

Method SplitIntoChunks(float[] waveform):
  → List<float[]>
  - Cắt mỗi 48000 samples
  - Chunk cuối pad zeros: new float[48000] + Array.Copy
  - Tối thiểu 1 chunk

Method RunInference(float[] audioChunk):
  → float[]
  - DenseTensor<float>(audioChunk, new[] { 48000 })
    Shape [48000] — KHÔNG có batch dimension
  - Input name: _session.InputMetadata.Keys.First()
  - _session.Run(inputs) → results.First().AsEnumerable<float>().ToArray()

Method AggregatePredictions(List<float[]>):
  → float[]
  - Trung bình element-wise qua tất cả chunks

Property SupportedInstruments:
  → string[] (expose _classNames ra ngoài để controller dùng)

Implement IDisposable:
  - _session?.Dispose()
```

---

## BƯỚC 5: TẠO CONTROLLER — AudioAnalysisController

Tạo trong thư mục Controllers. Tuân theo convention từ bước 0.4:
- Route prefix giống các controller khác
- Authorization giống các controller khác
- Return type giống các controller khác

### Endpoints:

```
POST /api/audio-analysis/detect-instrument
  - Input: IFormFile file (multipart/form-data)
  - [RequestSizeLimit(50MB)]
  - Validate: file null? extension hợp lệ (.wav, .mp3)? size?
  - Gọi _detectionService.DetectInstrumentAsync(stream, fileName)
  - Return: InstrumentDetectionResponse
  - Try-catch → log error → 500

POST /api/audio-analysis/analyze-recording/{recordingId:guid}
  - Input: Guid recordingId
  - Inject DbContext (từ bước 0.2)
  - Flow:
    1. dbContext.Recordings.FindAsync(recordingId) → 404 if null
    2. Download audio từ Recording.AudioFileUrl
       (dùng storage service từ bước 0.5, hoặc tạo TODO comment)
    3. _detectionService.DetectInstrumentAsync(stream, "recording.wav")
    4. Tạo entity AudioAnalysisResult (dùng entity class từ bước 0.3):
         Id = Guid.NewGuid()
         RecordingId = recordingId
         DetectedInstrumentsJson = JsonSerializer.Serialize(result.AllScores)
         SuggestedMetadataJson = JsonSerializer.Serialize(result)
         AnalyzedAt = DateTime.UtcNow
    5. dbContext.Add(entity) → SaveChangesAsync()
    6. Return RecordingAnalysisResponse

GET /api/audio-analysis/supported-instruments
  - Return: string[] tên nhạc cụ model hỗ trợ
  - Lấy từ _detectionService.SupportedInstruments
```

---

## BƯỚC 6: ĐĂNG KÝ DEPENDENCY INJECTION

Tìm nơi đăng ký services (từ bước 0.4). Thêm:

```csharp
// Nếu dùng interface pattern:
builder.Services.AddSingleton<IInstrumentDetectionService, InstrumentDetectionService>();

// Nếu không dùng interface:
builder.Services.AddSingleton<InstrumentDetectionService>();
```

Dùng Singleton vì:
- ONNX InferenceSession load model ~2-3 giây, chỉ cần 1 lần
- InferenceSession thread-safe cho inference
- Tiết kiệm RAM (model ~20MB)

Đặt dòng này GẦN các service đăng ký khác, theo thứ tự convention project.

---

## BƯỚC 7: KIỂM TRA

```bash
# 1. Build thành công
dotnet build

# 2. Nếu build lỗi, kiểm tra:
#    - Namespace references đúng chưa
#    - DbContext name đúng chưa
#    - Entity class name đúng chưa
#    - NuGet packages đã cài chưa

# 3. Kiểm tra cấu trúc files mới
find . -name "*InstrumentDetection*" -o -name "*AudioAnalysis*" | grep -v bin | grep -v obj
```

---

## QUY TẮC TUYỆT ĐỐI

1. **KHÔNG BAO GIỜ giả định** — tên namespace, tên class, tên folder. LUÔN đọc code trước.
2. **LUÔN match convention** — nếu project dùng `IXxxService`, agent tạo `IInstrumentDetectionService`. Nếu không dùng interface, không tạo interface.
3. **LUÔN match return pattern** — nếu controllers khác return `ApiResponse<T>`, agent cũng return `ApiResponse<T>`. Nếu return `IActionResult`, dùng `IActionResult`.
4. **LUÔN match error handling** — nếu project có global exception middleware, controller không cần try-catch. Nếu không có, thêm try-catch.
5. **LUÔN match authorization** — nếu controllers khác có `[Authorize(Roles = "Admin")]`, thêm attribute tương tự. Endpoint `detect-instrument` có thể `[AllowAnonymous]` hoặc yêu cầu auth tùy business logic.
6. **DbContext inject** — kiểm tra cách inject DbContext hiện tại: constructor injection? `[FromServices]`? method scope?
7. **KHÔNG tạo file trùng** — nếu entity `AudioAnalysisResult` đã có, DÙNG LẠI, không tạo mới.
8. **Comment TODO** — những phần cần tích hợp thêm (storage service download file), đánh dấu `// TODO:` với hướng dẫn cụ thể.
