# PROMPT CHO AI AGENT [2/2]: C# Mel Spectrogram + 2-ONNX Inference Pipeline

> **Mục đích**: Thêm vào project .NET khả năng tạo mel spectrogram từ audio,
> rồi chạy 2 file ONNX nối tiếp (YAMNet backbone → classifier) để nhận diện nhạc cụ.
>
> **Điều kiện trước**:
> - Đã có 3 files từ Python:
>   - `yamnet_backbone.onnx` (input: mel spectrogram → output: embedding 1024)
>   - `instrument_classifier.onnx` (input: embedding 1024 → output: scores N classes)
>   - `class_names.txt` (mapping index → tên nhạc cụ)
> - Đã có project .NET (ASP.NET Core Web API)
>
> **QUAN TRỌNG**: Agent PHẢI đọc source code project TRƯỚC khi viết code.
> Chạy toàn bộ bước khảo sát ở phần đầu.

---

## BƯỚC 0: KHẢO SÁT PROJECT (BẮT BUỘC)

Chạy chính xác các lệnh sau, ghi nhớ kết quả:

```bash
# Tìm cấu trúc project
find . -name "*.csproj" -o -name "*.sln" | head -10
find . -type f -name "*.cs" | grep -v "/bin/" | grep -v "/obj/" | head -50

# Tìm DbContext
grep -rn ": DbContext" --include="*.cs"
grep -n "DbSet" --include="*.cs" -r | grep -i "audio\|recording\|instrument"

# Tìm entity classes
grep -rn "class AudioAnalysisResult" --include="*.cs"
grep -rn "class Recording " --include="*.cs"

# Tìm conventions
find . -name "*Controller.cs" -not -path "*/bin/*" | head -5
find . -name "*Service.cs" -not -path "*/bin/*" | head -5
find . -name "Program.cs" -not -path "*/bin/*" | head -5

# Tìm storage service
grep -rn "IFormFile\|FileStream\|BlobClient\|StorageService" --include="*.cs" | head -10
```

Ghi nhớ: root namespace, DbContext name, entity names, folder structure, conventions.

---

## BƯỚC 1: CÀI NUGET PACKAGES

```bash
dotnet add package Microsoft.ML.OnnxRuntime --version 1.19.2
dotnet add package NAudio --version 2.2.1
dotnet add package FftSharp --version 2.1.0
```

| Package | Vai trò | Size |
|---------|---------|------|
| Microsoft.ML.OnnxRuntime | Chạy ONNX inference | ~30MB |
| NAudio | Đọc .wav/.mp3, resample 16kHz | ~2MB |
| FftSharp | STFT + FFT cho tạo mel spectrogram | ~0.5MB |

---

## BƯỚC 2: COPY MODEL FILES + CSPROJ

Tạo `Models/AI/` trong project, thêm vào `.csproj`:

```xml
<ItemGroup>
  <None Update="Models\AI\yamnet_backbone.onnx">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
  <None Update="Models\AI\instrument_classifier.onnx">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
  <None Update="Models\AI\class_names.txt">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
</ItemGroup>
```

---

## BƯỚC 3: TẠO MelSpectrogramExtractor (QUAN TRỌNG NHẤT)

Tạo class riêng chuyên tạo mel spectrogram từ audio waveform.
Phải match CHÍNH XÁC thông số của YAMNet.

### Thông số YAMNet (KHÔNG ĐƯỢC SAI):

```
Sample rate:      16000 Hz
STFT window:      25 ms = 400 samples
STFT hop:         10 ms = 160 samples
Window function:  Periodic Hann window
FFT size:         512 (hoặc nearest power of 2 >= 400)
Mel bins:         64
Mel frequency range: 125 Hz → 7500 Hz
Log transform:    log(mel_spectrogram + 0.001)
Patch size:       96 frames × 64 mel bins
Patch hop:        48 frames (50% overlap)
```

### Class MelSpectrogramExtractor:

```
Namespace: theo convention project (ví dụ: VietTuneArchive.Services.AI)

Constants:
  SAMPLE_RATE = 16000
  STFT_WINDOW_SAMPLES = 400      // 25ms × 16000
  STFT_HOP_SAMPLES = 160         // 10ms × 16000
  FFT_SIZE = 512                  // nearest power of 2 >= 400
  NUM_MEL_BINS = 64
  MEL_FREQ_LOW = 125.0f
  MEL_FREQ_HIGH = 7500.0f
  PATCH_FRAMES = 96               // frames per mel spectrogram patch
  PATCH_HOP_FRAMES = 48           // 50% overlap between patches
  LOG_OFFSET = 0.001f             // stabilized log: log(mel + 0.001)

Constructor:
  - Tính sẵn mel filterbank matrix (64 × 257)
    (257 = FFT_SIZE/2 + 1 = số frequency bins)
  - Tạo sẵn Hann window (400 samples, periodic variant)
  - Cache lại để không tính lại mỗi lần gọi

Method ExtractPatches(float[] waveform):
  → List<float[,]>  (mỗi item là 1 patch 96×64)
  
  Flow:
  1. Tạo STFT:
     - Chia waveform thành frames 400 samples, trượt 160 samples
     - Mỗi frame: nhân với Hann window → FFT (dùng FftSharp)
     - Lấy magnitude (absolute value) của nửa đầu FFT output (257 bins)
     - Kết quả: float[num_stft_frames][257]

  2. Apply mel filterbank:
     - Nhân mỗi STFT frame với mel filterbank matrix
     - Kết quả: float[num_stft_frames][64]

  3. Stabilized log transform:
     - Áp dụng: log(value + 0.001) cho mỗi giá trị
     - Kết quả: float[num_stft_frames][64] (log-mel spectrogram)

  4. Frame thành patches:
     - Cắt log-mel spectrogram thành patches 96 frames
     - Mỗi patch trượt 48 frames (50% overlap)
     - Kết quả: List<float[96, 64]>
     - Patch cuối nếu < 96 frames → pad zeros

  5. Return list patches

--- CHI TIẾT IMPLEMENT ---

Method BuildMelFilterbank():
  → float[64, 257]
  
  Tạo mel filterbank theo chuẩn HTK:
  1. Convert MEL_FREQ_LOW và MEL_FREQ_HIGH sang mel scale:
     mel = 2595 * log10(1 + freq / 700)
     
  2. Tạo 66 điểm (64 bins + 2 boundary) cách đều trên mel scale
     mel_points = linspace(mel_low, mel_high, 66)
     
  3. Convert ngược từ mel → Hz:
     freq = 700 * (10^(mel / 2595) - 1)
     
  4. Convert Hz → FFT bin index:
     bin = floor((FFT_SIZE + 1) * freq / SAMPLE_RATE)
     
  5. Với mỗi mel bin i (0..63):
     Tạo triangular filter:
     - Tăng tuyến tính từ mel_points[i] đến mel_points[i+1]
     - Giảm tuyến tính từ mel_points[i+1] đến mel_points[i+2]
     - 0 ở ngoài range
     
  6. Normalize mỗi filter (tùy chọn — YAMNet dùng slaney normalization):
     Chia mỗi filter cho (mel_points[i+2] - mel_points[i]) * 2 / (mel_points[i+2] - mel_points[i])
     Hoặc đơn giản: chia cho tổng area
     
  Return: float[64, 257] — mỗi hàng là 1 mel filter

Method CreateHannWindow(int size):
  → float[]
  
  Periodic Hann window (KHÔNG phải symmetric):
  w[n] = 0.5 * (1 - cos(2π * n / size))
  
  Lưu ý: PERIODIC dùng "size" (không phải "size-1") trong mẫu số.
  Đây là khác biệt quan trọng so với symmetric Hann window.

Method ComputeSTFT(float[] waveform):
  → float[num_frames, 257]
  
  1. Tính num_frames = (waveform.Length - STFT_WINDOW_SAMPLES) / STFT_HOP_SAMPLES + 1
  2. Với mỗi frame i:
     a. Lấy 400 samples bắt đầu từ i * 160
     b. Nhân element-wise với Hann window
     c. Zero-pad lên 512 samples (FFT_SIZE)
     d. FFT bằng FftSharp:
        double[] real = ..., imag = ...;
        FftSharp.FFT.Forward(real, imag);
     e. Magnitude = sqrt(real^2 + imag^2) cho 257 bins đầu tiên (0..FFT_SIZE/2)

  LƯU Ý VỀ FftSharp:
  - FftSharp.FFT yêu cầu input length là power of 2
  - Input là double[], không phải float[] → cần convert
  - FFT trả về complex numbers, lấy magnitude
  
  Ví dụ code:
  ```csharp
  var frame = new double[FFT_SIZE]; // 512, zero-initialized
  for (int j = 0; j < STFT_WINDOW_SAMPLES; j++)  // copy 400 samples
      frame[j] = waveform[offset + j] * hannWindow[j];
  
  // FftSharp works with System.Numerics.Complex
  var complex = frame.Select(v => new System.Numerics.Complex(v, 0)).ToArray();
  FftSharp.FFT.Forward(complex);
  
  // Magnitude of first 257 bins
  for (int k = 0; k <= FFT_SIZE / 2; k++)
      stft[frameIdx, k] = (float)complex[k].Magnitude;
  ```

Method ApplyMelFilterbank(float[,] stft):
  → float[num_frames, 64]
  
  Matrix multiply: mel_spectrogram[i, j] = sum(stft[i, k] * melFilterbank[j, k]) for k=0..256

Method ApplyLogTransform(float[,] melSpec):
  → float[num_frames, 64]
  
  logMel[i, j] = MathF.Log(melSpec[i, j] + LOG_OFFSET)

Method FrameIntoPatches(float[,] logMel):
  → List<float[,]>
  
  Cắt logMel thành patches 96×64, trượt 48 frames.
  Patch cuối pad zeros nếu < 96 frames.
```

---

## BƯỚC 4: TẠO InstrumentDetectionService

### Constants:
```csharp
private const int TargetSampleRate = 16000;
private const float ChunkDurationSeconds = 0.96f;   // 1 patch = 0.96s
private const int ChunkSamples = 15360;              // 0.96s × 16000
```

### Fields:
```csharp
private readonly InferenceSession _backboneSession;    // yamnet_backbone.onnx
private readonly InferenceSession _classifierSession;  // instrument_classifier.onnx
private readonly string[] _classNames;
private readonly MelSpectrogramExtractor _melExtractor;
private readonly ILogger _logger;
```

### Constructor:
```csharp
1. Load 2 ONNX sessions:
   _backboneSession = new InferenceSession("Models/AI/yamnet_backbone.onnx", sessionOptions);
   _classifierSession = new InferenceSession("Models/AI/instrument_classifier.onnx", sessionOptions);

2. Load class names từ class_names.txt

3. Tạo MelSpectrogramExtractor instance

4. Log: input/output shapes của cả 2 models, số classes
```

### Method DetectMultipleInstrumentsAsync(Stream audioStream, string fileName):

```
Flow:

1. LoadAndResampleAudioAsync(stream, fileName)
   → float[] waveform (16kHz mono)
   (Dùng NAudio: WaveFileReader/Mp3FileReader → MediaFoundationResampler → float[])

2. _melExtractor.ExtractPatches(waveform)
   → List<float[,]> patches (mỗi patch 96×64)
   Mỗi patch đại diện 0.96 giây audio

3. Với MỖI patch:
   a. Reshape patch thành tensor phù hợp ONNX 1:
      - Nếu backbone nhận (1, 96, 64, 1): thêm batch + channel dimension
      - Nếu backbone nhận (1, 96, 64): thêm batch dimension
      (Kiểm tra _backboneSession.InputMetadata để biết shape chính xác)
   
   b. Chạy backbone inference:
      var backboneTensor = new DenseTensor<float>(patchData, inputShape);
      var backboneInputs = new List<NamedOnnxValue> {
          NamedOnnxValue.CreateFromTensor(
              _backboneSession.InputMetadata.Keys.First(), backboneTensor)
      };
      var backboneResults = _backboneSession.Run(backboneInputs);
      float[] embedding = backboneResults.First().AsEnumerable<float>().ToArray();
      // embedding.Length == 1024
   
   c. Chạy classifier inference:
      var classifierTensor = new DenseTensor<float>(embedding, new[] { 1, 1024 });
      var classifierInputs = new List<NamedOnnxValue> {
          NamedOnnxValue.CreateFromTensor(
              _classifierSession.InputMetadata.Keys.First(), classifierTensor)
      };
      var classifierResults = _classifierSession.Run(classifierInputs);
      float[] scores = classifierResults.First().AsEnumerable<float>().ToArray();
      // scores.Length == NUM_CLASSES
   
   d. argmax(scores) → predictedInstrument cho patch này
   
   e. Lưu ChunkResult:
      chunkIndex, startSeconds, endSeconds, predictedInstrument, confidence

4. Aggregate tất cả ChunkResults:
   - Group theo PredictedInstrument
   - Tính percentage, averageConfidence, merge consecutive segments
   - Lọc: bỏ dưới 10% threshold, bỏ class "background"

5. Build MultiInstrumentDetectionResponse
   (dùng DTOs từ prompt trước — ChunkResult, DetectedInstrumentSummary,
    TimeSegment, MultiInstrumentDetectionResponse)
```

### Method LoadAndResampleAudioAsync:
Giống prompt trước — dùng NAudio, resample 16kHz mono.

⚠️ MediaFoundationResampler chỉ Windows. Thêm fallback ffmpeg cho Linux:
```csharp
// Detect OS
if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
    return LoadWithNAudio(stream, fileName);
else
    return await LoadWithFfmpegAsync(stream, fileName);
```

### Implement IDisposable:
```csharp
_backboneSession?.Dispose();
_classifierSession?.Dispose();
```

---

## BƯỚC 5: TẠO CONTROLLER

AudioAnalysisController với 3 endpoints:

```
POST /api/audio-analysis/detect-instruments
  - IFormFile upload
  - Gọi DetectMultipleInstrumentsAsync
  - Return MultiInstrumentDetectionResponse

POST /api/audio-analysis/analyze-recording/{recordingId:guid}
  - Tìm Recording → download audio → detect → lưu AudioAnalysisResults

GET /api/audio-analysis/supported-instruments
  - Return string[] class names
```

(Chi tiết giống prompt trước — tuân theo conventions project)

---

## BƯỚC 6: ĐĂNG KÝ DI

```csharp
builder.Services.AddSingleton<MelSpectrogramExtractor>();
builder.Services.AddSingleton<InstrumentDetectionService>();
```

Cả 2 singleton vì:
- MelSpectrogramExtractor: mel filterbank matrix tính 1 lần, dùng lại
- InstrumentDetectionService: ONNX sessions load 1 lần

---

## BƯỚC 7: KIỂM TRA

```bash
# 1. Build
dotnet build

# 2. Chạy app, check log:
#    "Backbone loaded: input [1,96,64,1] → output [1,1024]"
#    "Classifier loaded: input [1,1024] → output [1,4]"
#    "4 classes: [background, dan_bau, dan_tranh, sao_truc]"

# 3. Test endpoint
curl -X POST http://localhost:5000/api/audio-analysis/detect-instruments \
  -F "file=@test.wav"

# 4. Expected response:
# {
#   "detectedInstruments": [
#     { "instrumentName": "dan_bau", "percentage": 0.65, ... },
#     { "instrumentName": "dan_tranh", "percentage": 0.25, ... }
#   ],
#   "primaryInstrument": "dan_bau",
#   ...
# }
```

---

## CẤU TRÚC FILES SAU KHI HOÀN TẤT

```
Project/
├── Models/
│   └── AI/
│       ├── yamnet_backbone.onnx          ← YAMNet MobileNet v1
│       ├── instrument_classifier.onnx    ← Trained classifier
│       └── class_names.txt               ← Class mapping
├── Services/
│   ├── AI/
│   │   ├── MelSpectrogramExtractor.cs    ← MỚI: tạo mel spectrogram
│   │   └── InstrumentDetectionService.cs ← MỚI: 2-ONNX inference
├── DTOs/
│   └── AudioAnalysis/
│       └── InstrumentDetectionDtos.cs    ← MỚI: DTOs
├── Controllers/
│   └── AudioAnalysisController.cs        ← MỚI: API endpoints
└── Program.cs                            ← Thêm 2 dòng Singleton
```

---

## QUY TẮC TUYỆT ĐỐI

1. Mel spectrogram thông số PHẢI KHỚP YAMNet: window 25ms, hop 10ms, 64 mel bins, 125-7500Hz, log(x + 0.001). SAI 1 thông số → embedding sai → kết quả sai hoàn toàn.
2. Kiểm tra input shape backbone ONNX trước khi tạo tensor. Shape có thể là (1,96,64,1) hoặc (1,96,64) tùy cách export.
3. KHÔNG giả định namespace, class names, folder structure. ĐỌC CODE TRƯỚC.
4. Tuân theo conventions project hiện có.
5. MelSpectrogramExtractor nên là class riêng biệt, không gộp vào Service — dễ test, dễ maintain.
6. FftSharp dùng System.Numerics.Complex. Cẩn thận convert float ↔ double.
