# TÍCH HỢP VÀO PROJECT .NET — Hướng Dẫn + Code

## TỔNG QUAN FLOW

```
User upload audio (.wav/.mp3)
         ↓
  [AudioAnalysisController]  ← API endpoint
         ↓
  [InstrumentDetectionService]
    1. Load audio file
    2. Resample → 16kHz mono
    3. Cắt thành chunks 3 giây
    4. Chạy ONNX inference mỗi chunk
    5. Aggregate kết quả
         ↓
  Ghi vào bảng AudioAnalysisResults
         ↓
  Response JSON: { instrument: "dan_bau", confidence: 0.87 }
```

---

## BƯỚC 1: CÀI NUGET PACKAGES

```bash
dotnet add package Microsoft.ML.OnnxRuntime --version 1.19.2
dotnet add package NAudio --version 2.2.1
```

---

## BƯỚC 2: COPY FILES VÀO PROJECT

```
YourDotNetProject/
├── Models/
│   └── AI/
│       ├── instrument_detector_full.onnx   ← từ Python export
│       └── class_names.txt                  ← từ Python export
├── Services/
│   └── InstrumentDetectionService.cs        ← tạo mới
├── Controllers/
│   └── AudioAnalysisController.cs           ← tạo mới
└── ...
```

Trong `.csproj`, thêm để copy model files khi build:

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

## BƯỚC 3: SERVICE — InstrumentDetectionService.cs

```csharp
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using NAudio.Wave;

namespace VietTuneArchive.Services;

/// <summary>
/// Service nhận diện nhạc cụ dân tộc từ file audio.
///
/// Pipeline:
///   Audio file → Resample 16kHz mono → Cắt chunks 3s → ONNX → Kết quả
///
/// ONNX model chứa toàn bộ: YAMNet feature extraction + Classifier.
/// Input:  float[48000] (3 giây audio, 16kHz)
/// Output: float[NUM_CLASSES] (xác suất từng nhạc cụ)
/// </summary>
public class InstrumentDetectionService : IDisposable
{
    private readonly InferenceSession _session;
    private readonly string[] _classNames;
    private readonly ILogger<InstrumentDetectionService> _logger;

    // YAMNet yêu cầu 16kHz mono
    private const int TargetSampleRate = 16000;

    // Mỗi chunk 3 giây = 48000 samples
    private const int ChunkSamples = 48000;

    public InstrumentDetectionService(
        ILogger<InstrumentDetectionService> logger,
        IWebHostEnvironment env)
    {
        _logger = logger;

        // Đường dẫn tới model files
        var modelsPath = Path.Combine(env.ContentRootPath, "Models", "AI");
        var onnxPath = Path.Combine(modelsPath, "instrument_detector_full.onnx");
        var classNamesPath = Path.Combine(modelsPath, "class_names.txt");

        // Load ONNX model
        var sessionOptions = new SessionOptions();
        sessionOptions.GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL;
        _session = new InferenceSession(onnxPath, sessionOptions);

        // Load class names
        _classNames = File.ReadAllLines(classNamesPath)
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .ToArray();

        _logger.LogInformation(
            "InstrumentDetection loaded: {ClassCount} classes: [{Classes}]",
            _classNames.Length,
            string.Join(", ", _classNames));
    }

    /// <summary>
    /// Phân tích file audio và nhận diện nhạc cụ.
    /// </summary>
    /// <param name="audioStream">Stream của file audio (wav, mp3...)</param>
    /// <param name="fileName">Tên file gốc (để detect format)</param>
    /// <returns>Kết quả nhận diện</returns>
    public async Task<InstrumentDetectionResult> DetectInstrumentAsync(
        Stream audioStream, string fileName)
    {
        _logger.LogInformation("Analyzing: {FileName}", fileName);

        // 1. Load audio → float[] samples, 16kHz mono
        var waveform = await LoadAndResampleAudioAsync(audioStream, fileName);
        _logger.LogInformation("Audio loaded: {Samples} samples ({Duration:F1}s)",
            waveform.Length, waveform.Length / (float)TargetSampleRate);

        // 2. Cắt thành chunks 3 giây
        var chunks = SplitIntoChunks(waveform);
        _logger.LogInformation("Split into {ChunkCount} chunks", chunks.Count);

        // 3. Chạy inference mỗi chunk
        var allPredictions = new List<float[]>();
        foreach (var chunk in chunks)
        {
            var prediction = RunInference(chunk);
            allPredictions.Add(prediction);
        }

        // 4. Aggregate: trung bình xác suất tất cả chunks
        var avgScores = AggregatePredictions(allPredictions);

        // 5. Tìm class có score cao nhất
        var topIndex = Array.IndexOf(avgScores, avgScores.Max());
        var topClassName = _classNames[topIndex];
        var topConfidence = avgScores[topIndex];

        // 6. Build kết quả đầy đủ
        var result = new InstrumentDetectionResult
        {
            PredictedInstrument = topClassName,
            Confidence = topConfidence,
            AllScores = _classNames
                .Select((name, idx) => new ClassScore
                {
                    ClassName = name,
                    Score = avgScores[idx]
                })
                .OrderByDescending(x => x.Score)
                .ToList(),
            ChunksAnalyzed = chunks.Count,
            AudioDurationSeconds = waveform.Length / (float)TargetSampleRate,
        };

        _logger.LogInformation(
            "Result: {Instrument} ({Confidence:P1})",
            result.PredictedInstrument,
            result.Confidence);

        return result;
    }

    /// <summary>
    /// Load audio file → resample về 16kHz mono float[].
    /// Hỗ trợ: .wav, .mp3
    /// </summary>
    private async Task<float[]> LoadAndResampleAudioAsync(
        Stream audioStream, string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();

        // Copy stream vào memory (NAudio cần seekable stream)
        using var memoryStream = new MemoryStream();
        await audioStream.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        // Chọn reader phù hợp
        WaveStream reader = extension switch
        {
            ".wav" => new WaveFileReader(memoryStream),
            ".mp3" => new Mp3FileReader(memoryStream),
            _ => throw new NotSupportedException(
                $"Format '{extension}' không được hỗ trợ. Dùng .wav hoặc .mp3")
        };

        using (reader)
        {
            // Convert sang 16kHz mono PCM
            var targetFormat = new WaveFormat(TargetSampleRate, 16, 1);
            using var resampler = new MediaFoundationResampler(reader, targetFormat);
            resampler.ResamplerQuality = 60; // Chất lượng cao

            // Đọc tất cả samples
            var samples = new List<float>();
            var buffer = new byte[targetFormat.BlockAlign * 1024];
            int bytesRead;

            while ((bytesRead = resampler.Read(buffer, 0, buffer.Length)) > 0)
            {
                // Convert PCM 16-bit → float [-1.0, +1.0]
                for (int i = 0; i < bytesRead; i += 2)
                {
                    short sample = BitConverter.ToInt16(buffer, i);
                    samples.Add(sample / 32768f);
                }
            }

            return samples.ToArray();
        }
    }

    /// <summary>
    /// Cắt waveform thành chunks 3 giây.
    /// Chunk cuối nếu ngắn hơn 3s → pad zero.
    /// </summary>
    private List<float[]> SplitIntoChunks(float[] waveform)
    {
        var chunks = new List<float[]>();

        for (int offset = 0; offset < waveform.Length; offset += ChunkSamples)
        {
            var chunk = new float[ChunkSamples]; // Tự động zero-padded
            var remaining = Math.Min(ChunkSamples, waveform.Length - offset);
            Array.Copy(waveform, offset, chunk, 0, remaining);
            chunks.Add(chunk);
        }

        // Nếu audio quá ngắn (< 1 giây), vẫn có ít nhất 1 chunk (zero-padded)
        if (chunks.Count == 0)
        {
            chunks.Add(new float[ChunkSamples]);
        }

        return chunks;
    }

    /// <summary>
    /// Chạy ONNX inference trên 1 chunk audio.
    /// Input:  float[48000]
    /// Output: float[NUM_CLASSES]
    /// </summary>
    private float[] RunInference(float[] audioChunk)
    {
        // Tạo input tensor
        var tensor = new DenseTensor<float>(
            audioChunk,
            new[] { ChunkSamples }  // Shape: [48000]
        );

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor(
                _session.InputMetadata.Keys.First(),
                tensor)
        };

        // Run inference
        using var results = _session.Run(inputs);

        // Lấy output
        var output = results.First().AsEnumerable<float>().ToArray();
        return output;
    }

    /// <summary>
    /// Trung bình xác suất từ tất cả chunks.
    /// </summary>
    private float[] AggregatePredictions(List<float[]> predictions)
    {
        var numClasses = predictions[0].Length;
        var avg = new float[numClasses];

        foreach (var pred in predictions)
        {
            for (int i = 0; i < numClasses; i++)
            {
                avg[i] += pred[i];
            }
        }

        for (int i = 0; i < numClasses; i++)
        {
            avg[i] /= predictions.Count;
        }

        return avg;
    }

    public void Dispose()
    {
        _session?.Dispose();
    }
}

// ============================================================
// DTOs
// ============================================================

public class InstrumentDetectionResult
{
    /// <summary>Tên nhạc cụ được nhận diện (score cao nhất)</summary>
    public string PredictedInstrument { get; set; } = string.Empty;

    /// <summary>Độ tin cậy [0.0 - 1.0]</summary>
    public float Confidence { get; set; }

    /// <summary>Scores cho tất cả classes, sắp xếp giảm dần</summary>
    public List<ClassScore> AllScores { get; set; } = new();

    /// <summary>Số chunks đã phân tích</summary>
    public int ChunksAnalyzed { get; set; }

    /// <summary>Thời lượng audio (giây)</summary>
    public float AudioDurationSeconds { get; set; }
}

public class ClassScore
{
    public string ClassName { get; set; } = string.Empty;
    public float Score { get; set; }
}
```

---

## BƯỚC 4: CONTROLLER — AudioAnalysisController.cs

```csharp
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Services;

namespace VietTuneArchive.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AudioAnalysisController : ControllerBase
{
    private readonly InstrumentDetectionService _detectionService;
    private readonly ILogger<AudioAnalysisController> _logger;

    // Giới hạn file upload: 50MB
    private const long MaxFileSize = 50 * 1024 * 1024;

    // Format hỗ trợ
    private static readonly HashSet<string> AllowedExtensions = new(
        StringComparer.OrdinalIgnoreCase)
    {
        ".wav", ".mp3"
    };

    public AudioAnalysisController(
        InstrumentDetectionService detectionService,
        ILogger<AudioAnalysisController> logger)
    {
        _detectionService = detectionService;
        _logger = logger;
    }

    /// <summary>
    /// Phân tích file audio và nhận diện nhạc cụ.
    ///
    /// POST /api/audioanalysis/detect-instrument
    /// Content-Type: multipart/form-data
    /// Body: file = audio file (.wav hoặc .mp3)
    ///
    /// Response:
    /// {
    ///   "predictedInstrument": "dan_bau",
    ///   "confidence": 0.87,
    ///   "allScores": [
    ///     { "className": "dan_bau", "score": 0.87 },
    ///     { "className": "dan_tranh", "score": 0.08 },
    ///     ...
    ///   ],
    ///   "chunksAnalyzed": 5,
    ///   "audioDurationSeconds": 15.2
    /// }
    /// </summary>
    [HttpPost("detect-instrument")]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<IActionResult> DetectInstrument(IFormFile file)
    {
        // --- Validate ---
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "Không có file audio." });

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
            return BadRequest(new { error = $"Format '{extension}' không hỗ trợ. Dùng .wav hoặc .mp3" });

        if (file.Length > MaxFileSize)
            return BadRequest(new { error = "File quá lớn (tối đa 50MB)." });

        // --- Analyze ---
        try
        {
            using var stream = file.OpenReadStream();
            var result = await _detectionService.DetectInstrumentAsync(stream, file.FileName);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi phân tích audio: {FileName}", file.FileName);
            return StatusCode(500, new { error = "Lỗi phân tích audio. Vui lòng thử lại." });
        }
    }

    /// <summary>
    /// Phân tích audio từ Recording đã có trong hệ thống.
    ///
    /// POST /api/audioanalysis/analyze-recording/{recordingId}
    ///
    /// Dùng cho: phân tích recording đã upload, ghi kết quả vào AudioAnalysisResults.
    /// </summary>
    [HttpPost("analyze-recording/{recordingId:guid}")]
    public async Task<IActionResult> AnalyzeRecording(
        Guid recordingId,
        [FromServices] ApplicationDbContext dbContext)
    {
        // 1. Tìm recording trong DB
        var recording = await dbContext.Recordings.FindAsync(recordingId);
        if (recording == null)
            return NotFound(new { error = "Recording không tồn tại." });

        // 2. Download audio file từ storage (S3/Azure Blob/local)
        //    TODO: Thay bằng service lấy file thực tế của bạn
        //    Ví dụ:
        //    var audioStream = await _storageService.DownloadAsync(recording.AudioFileUrl);
        //
        //    Tạm thời return NotImplemented:
        return StatusCode(501, new
        {
            message = "TODO: Kết nối với storage service để download audio file.",
            hint = "Thay comment ở trên bằng code download file từ S3/Azure Blob."
        });

        // 3. Chạy detection
        // var result = await _detectionService.DetectInstrumentAsync(audioStream, "recording.wav");

        // 4. Lưu vào AudioAnalysisResults
        // var analysisResult = new AudioAnalysisResult
        // {
        //     Id = Guid.NewGuid(),
        //     RecordingId = recordingId,
        //     DetectedInstrumentsJson = JsonSerializer.Serialize(result.AllScores),
        //     SuggestedEthnicGroup = null, // TODO: thêm logic suggest ethnic group
        //     SuggestedMetadataJson = JsonSerializer.Serialize(result),
        //     AnalyzedAt = DateTime.UtcNow,
        // };
        // dbContext.AudioAnalysisResults.Add(analysisResult);
        // await dbContext.SaveChangesAsync();

        // return Ok(result);
    }
}
```

---

## BƯỚC 5: ĐĂNG KÝ SERVICE TRONG Program.cs

```csharp
// Program.cs — thêm dòng này vào phần đăng ký services

// Đăng ký InstrumentDetectionService dạng Singleton
// (load model 1 lần duy nhất khi app start, dùng chung cho mọi request)
builder.Services.AddSingleton<InstrumentDetectionService>();
```

---

## BƯỚC 6: CHẠY PYTHON EXPORT

Sau khi train model xong, chạy:

```bash
# Export full pipeline (YAMNet + classifier → 1 ONNX)
python src/export_full_pipeline.py
```

Output:
```
models/
├── instrument_detector_full.onnx   ← Copy vào .NET project
└── class_names.txt                  ← Copy vào .NET project
```

---

## BƯỚC 7: TEST API

```bash
# Upload file audio trực tiếp
curl -X POST \
  http://localhost:5000/api/audioanalysis/detect-instrument \
  -F "file=@test_audio.wav"

# Response:
# {
#   "predictedInstrument": "dan_bau",
#   "confidence": 0.87,
#   "allScores": [
#     { "className": "dan_bau", "score": 0.87 },
#     { "className": "dan_tranh", "score": 0.08 },
#     { "className": "sao_truc", "score": 0.03 },
#     { "className": "background", "score": 0.02 }
#   ],
#   "chunksAnalyzed": 5,
#   "audioDurationSeconds": 15.2
# }
```

---

## LƯU Ý QUAN TRỌNG

### Nếu export_full_pipeline.py lỗi ONNX conversion:

YAMNet có một số TF ops phức tạp (STFT, mel filterbank) mà tf2onnx
có thể không convert được ở opset thấp. Nếu gặp lỗi:

1. Thử tăng opset: đổi `opset=15` thành `opset=17` trong script
2. Nếu vẫn lỗi: dùng `export_onnx.py` (chỉ classifier) + Python
   microservice cho YAMNet embedding extraction

### Performance trên Azure:

- Model ~20MB, load lần đầu ~2-3 giây
- Inference mỗi chunk 3s: ~100-200ms trên CPU
- File audio 3 phút ≈ 60 chunks → ~6-12 giây tổng
- Singleton service → model chỉ load 1 lần
