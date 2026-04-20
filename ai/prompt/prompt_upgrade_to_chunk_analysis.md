# PROMPT CHO AI AGENT: Nâng Cấp Từ Nhận Diện 1 Nhạc Cụ → Trích Xuất Nhiều Nhạc Cụ (Chunk-by-Chunk)

> **Mục đích**: Thay đổi logic aggregate trong C# service để thay vì trả về 1 nhạc cụ
> duy nhất, hệ thống phân tích từng chunk 3 giây riêng lẻ rồi tổng hợp danh sách
> tất cả nhạc cụ xuất hiện trong bài, kèm % thời lượng và timeline.
>
> **QUAN TRỌNG**: Model ONNX và pipeline Python KHÔNG CẦN THAY ĐỔI.
> Chỉ thay đổi phía C# (DTOs + Service + Controller).

---

## CONTEXT: CÁCH HOẠT ĐỘNG HIỆN TẠI (CŨ)

Hiện tại, service nhận file audio, cắt thành chunks 3 giây, chạy ONNX inference
mỗi chunk, rồi **trung bình scores tất cả chunks** → trả về 1 nhạc cụ duy nhất.

```
Audio 3 phút → 60 chunks
  Chunk 1: [0.85, 0.05, 0.03, 0.07]  → đàn bầu
  Chunk 2: [0.82, 0.08, 0.04, 0.06]  → đàn bầu
  Chunk 3: [0.10, 0.78, 0.05, 0.07]  → đàn tranh
  ...
  ↓ TRUNG BÌNH TẤT CẢ (cách cũ)
  [0.55, 0.30, 0.08, 0.07]
  → "đàn bầu" (55%)  ← CHỈ TRẢ VỀ 1 NHẠC CỤ, BỎ SÓT ĐÀN TRANH
```

## CÁCH HOẠT ĐỘNG MỚI (CẦN ĐỔI)

Giữ kết quả TỪNG chunk riêng lẻ. Mỗi chunk → 1 nhạc cụ chiến thắng (argmax).
Rồi tổng hợp: nhạc cụ nào xuất hiện ở bao nhiêu % chunks → vượt ngưỡng → có mặt.

```
Audio 3 phút → 60 chunks
  Chunk 1:  đàn bầu   (0.85)   ← timestamp: 0:00-0:03
  Chunk 2:  đàn bầu   (0.82)   ← timestamp: 0:03-0:06
  Chunk 3:  đàn tranh  (0.78)   ← timestamp: 0:06-0:09
  Chunk 4:  đàn tranh  (0.81)   ← timestamp: 0:09-0:12
  Chunk 5:  đàn bầu   (0.79)   ← timestamp: 0:12-0:15
  ...

  ↓ TỔNG HỢP (cách mới)

  Nhạc cụ xuất hiện:
  - đàn bầu:   35/60 chunks (58.3%) ← vượt ngưỡng 10% → CÓ MẶT ✅
  - đàn tranh:  20/60 chunks (33.3%) ← vượt ngưỡng 10% → CÓ MẶT ✅
  - sáo trúc:    5/60 chunks (8.3%)  ← dưới ngưỡng 10% → BỎ QUA ❌
  - background:  0/60 chunks (0%)    ← BỎ QUA ❌

  Timeline:
  [0:00-0:06] đàn bầu
  [0:06-0:12] đàn tranh
  [0:12-0:15] đàn bầu
  ...
```

---

## THAY ĐỔI 1/3: CẬP NHẬT DTOs

Tìm file DTOs hiện tại chứa `InstrumentDetectionResponse` (hoặc tương đương).
Giữ nguyên các DTO cũ, THÊM các DTO mới:

### Thêm class `ChunkResult`

```
class ChunkResult:
  - int ChunkIndex              (0, 1, 2, ...)
  - float StartSeconds          (chunk 0 = 0.0, chunk 1 = 3.0, chunk 2 = 6.0...)
  - float EndSeconds            (chunk 0 = 3.0, chunk 1 = 6.0, chunk 2 = 9.0...)
  - string PredictedInstrument  (nhạc cụ thắng ở chunk này)
  - float Confidence            (score cao nhất)
  - float[] AllScores           (scores tất cả classes — tùy chọn, có thể bỏ để response nhẹ hơn)
```

### Thêm class `DetectedInstrumentSummary`

```
class DetectedInstrumentSummary:
  - string InstrumentName       (tên nhạc cụ: "dan_bau")
  - int ChunkCount              (số chunks nhạc cụ này chiến thắng: 35)
  - int TotalChunks             (tổng chunks: 60)
  - float Percentage            (35/60 = 0.583 = 58.3%)
  - float AverageConfidence     (trung bình confidence khi nhạc cụ này thắng)
  - List<TimeSegment> Segments  (các đoạn liên tiếp nhạc cụ này xuất hiện)
```

### Thêm class `TimeSegment`

```
class TimeSegment:
  - float StartSeconds          (bắt đầu đoạn)
  - float EndSeconds            (kết thúc đoạn)
  - float DurationSeconds       (EndSeconds - StartSeconds)
```

### Thêm class `MultiInstrumentDetectionResponse` (response chính mới)

```
class MultiInstrumentDetectionResponse:
  - List<DetectedInstrumentSummary> DetectedInstruments
      (danh sách nhạc cụ được phát hiện, sort theo Percentage giảm dần)
      (CHỈ gồm nhạc cụ vượt ngưỡng, đã lọc bỏ background và dưới ngưỡng)

  - string PrimaryInstrument
      (nhạc cụ chiếm % cao nhất — tương thích ngược với response cũ)

  - int TotalChunks
      (tổng chunks đã phân tích)

  - float AudioDurationSeconds
      (thời lượng audio)

  - float DetectionThreshold
      (ngưỡng % đã dùng để lọc, mặc định 0.10 = 10%)

  - List<ChunkResult> Timeline
      (kết quả từng chunk — cho phép frontend vẽ timeline visualization)
      (TÙY CHỌN: có thể đánh dấu [JsonIgnore] hoặc chỉ trả về khi client request)
```

---

## THAY ĐỔI 2/3: CẬP NHẬT SERVICE

Tìm file `InstrumentDetectionService.cs` (hoặc tương đương).

### Thêm constant

```csharp
// Ngưỡng tối thiểu: nhạc cụ phải xuất hiện ở ít nhất 10% chunks
// mới được coi là "có mặt" trong bài.
// Tránh false positive từ vài chunk nhiễu.
private const float DetectionThresholdPercent = 0.10f;

// Thời lượng mỗi chunk (giây) — dùng để tính timestamp
private const float ChunkDurationSeconds = 3.0f;

// Tên class background — sẽ bị loại khỏi kết quả detected instruments
// Đổi giá trị này nếu class background trong class_names.txt tên khác
private const string BackgroundClassName = "background";
```

### Thêm method `DetectMultipleInstrumentsAsync`

ĐÂY LÀ METHOD CHÍNH MỚI. Không xóa method cũ `DetectInstrumentAsync` (giữ tương thích ngược).

```
Method DetectMultipleInstrumentsAsync(Stream audioStream, string fileName)
  → MultiInstrumentDetectionResponse

Flow:
  1. LoadAndResampleAudioAsync(stream, fileName) → float[] waveform
     (GIỐNG CŨ — không đổi)

  2. SplitIntoChunks(waveform) → List<float[]> chunks
     (GIỐNG CŨ — không đổi)

  3. Với MỖI chunk, gọi RunInference(chunk) → float[] scores
     (GIỐNG CŨ — không đổi)

  4. ĐÂY LÀ PHẦN KHÁC:
     Thay vì AggregatePredictions (trung bình), làm như sau:

     a) Xây dựng List<ChunkResult>:
        for (int i = 0; i < chunks.Count; i++):
          scores = RunInference(chunks[i])
          topIndex = argmax(scores)
          chunkResult = new ChunkResult {
            ChunkIndex = i,
            StartSeconds = i * ChunkDurationSeconds,
            EndSeconds = (i + 1) * ChunkDurationSeconds,
            PredictedInstrument = _classNames[topIndex],
            Confidence = scores[topIndex]
          }
          → thêm vào list chunkResults

     b) Tổng hợp DetectedInstrumentSummary cho mỗi nhạc cụ:
        - Group chunkResults theo PredictedInstrument
        - Với mỗi group:
            instrumentName = group.Key
            chunkCount = group.Count()
            totalChunks = chunks.Count
            percentage = chunkCount / totalChunks
            averageConfidence = group.Average(c => c.Confidence)
            segments = MergeConsecutiveChunks(group)
              (gộp các chunk liên tiếp cùng nhạc cụ thành 1 segment)
        - Sort theo percentage giảm dần

     c) Lọc:
        - Bỏ nhạc cụ có percentage < DetectionThresholdPercent
        - Bỏ class "background" (hoặc tên tương đương)

     d) Build MultiInstrumentDetectionResponse
```

### Thêm helper method `MergeConsecutiveChunks`

```
Method MergeConsecutiveChunks(IEnumerable<ChunkResult> chunks)
  → List<TimeSegment>

Mục đích: gộp các chunk liên tiếp cùng nhạc cụ thành 1 đoạn.

Ví dụ:
  Chunk 3 (9s-12s): đàn bầu
  Chunk 4 (12s-15s): đàn bầu
  Chunk 5 (15s-18s): đàn bầu
  → Merge thành 1 segment: { Start: 9s, End: 18s, Duration: 9s }

  Chunk 10 (30s-33s): đàn bầu
  → Segment riêng: { Start: 30s, End: 33s, Duration: 3s }

Logic:
  1. Sort chunks theo ChunkIndex
  2. Khởi tạo segment đầu tiên từ chunk đầu tiên
  3. Duyệt từng chunk tiếp theo:
     - Nếu chunk.ChunkIndex == previousChunk.ChunkIndex + 1 (liên tiếp):
       → mở rộng segment hiện tại: segment.EndSeconds = chunk.EndSeconds
     - Nếu không liên tiếp:
       → đóng segment cũ, tạo segment mới
  4. Đóng segment cuối cùng
  5. Tính DurationSeconds = EndSeconds - StartSeconds cho mỗi segment
```

---

## THAY ĐỔI 3/3: CẬP NHẬT CONTROLLER

Tìm file `AudioAnalysisController.cs` (hoặc tương đương).

### Thêm endpoint mới

```
POST /api/audio-analysis/detect-instruments  (CHÚ Ý: số nhiều "instruments")
  - Input: IFormFile file
  - Gọi _detectionService.DetectMultipleInstrumentsAsync(stream, fileName)
  - Return: MultiInstrumentDetectionResponse
```

GIỮ NGUYÊN endpoint cũ `detect-instrument` (số ít) để tương thích ngược.

### Cập nhật endpoint analyze-recording

Trong endpoint `analyze-recording/{recordingId}`:
- Đổi từ gọi `DetectInstrumentAsync` sang `DetectMultipleInstrumentsAsync`
- Khi lưu vào DB bảng AudioAnalysisResults:
  ```
  DetectedInstrumentsJson = JsonSerializer.Serialize(result.DetectedInstruments)
    → Lưu danh sách nhạc cụ + percentage + segments

  SuggestedMetadataJson = JsonSerializer.Serialize(result)
    → Lưu toàn bộ kết quả (bao gồm timeline)
  ```

### Thêm endpoint query parameter cho timeline (tùy chọn)

```
POST /api/audio-analysis/detect-instruments?includeTimeline=true
```

Nếu `includeTimeline = false` (mặc định): bỏ trường `Timeline` khỏi response để response nhẹ hơn.
Nếu `includeTimeline = true`: trả về đầy đủ kết quả từng chunk.

Cách implement: sau khi có result, nếu !includeTimeline thì set `result.Timeline = null` trước khi return.

---

## VÍ DỤ RESPONSE MỚI

```json
{
  "detectedInstruments": [
    {
      "instrumentName": "dan_bau",
      "chunkCount": 35,
      "totalChunks": 60,
      "percentage": 0.583,
      "averageConfidence": 0.84,
      "segments": [
        { "startSeconds": 0.0, "endSeconds": 18.0, "durationSeconds": 18.0 },
        { "startSeconds": 36.0, "endSeconds": 72.0, "durationSeconds": 36.0 },
        { "startSeconds": 120.0, "endSeconds": 180.0, "durationSeconds": 60.0 }
      ]
    },
    {
      "instrumentName": "dan_tranh",
      "chunkCount": 20,
      "totalChunks": 60,
      "percentage": 0.333,
      "averageConfidence": 0.79,
      "segments": [
        { "startSeconds": 18.0, "endSeconds": 36.0, "durationSeconds": 18.0 },
        { "startSeconds": 84.0, "endSeconds": 120.0, "durationSeconds": 36.0 }
      ]
    }
  ],
  "primaryInstrument": "dan_bau",
  "totalChunks": 60,
  "audioDurationSeconds": 180.0,
  "detectionThreshold": 0.10,
  "timeline": null
}
```

Khi `includeTimeline=true`, trường `timeline` sẽ là:

```json
"timeline": [
  { "chunkIndex": 0, "startSeconds": 0.0, "endSeconds": 3.0, "predictedInstrument": "dan_bau", "confidence": 0.85 },
  { "chunkIndex": 1, "startSeconds": 3.0, "endSeconds": 6.0, "predictedInstrument": "dan_bau", "confidence": 0.82 },
  { "chunkIndex": 2, "startSeconds": 6.0, "endSeconds": 9.0, "predictedInstrument": "dan_tranh", "confidence": 0.78 },
  ...
]
```

---

## INTEGRATION VỚI DATABASE

Khi lưu kết quả vào bảng `AudioAnalysisResults`:

```
DetectedInstrumentsJson → JSON danh sách nhạc cụ:
  [
    {"name": "dan_bau", "percentage": 0.583, "avgConfidence": 0.84},
    {"name": "dan_tranh", "percentage": 0.333, "avgConfidence": 0.79}
  ]

SuggestedMetadataJson → JSON toàn bộ MultiInstrumentDetectionResponse
```

Ngoài ra, CÓ THỂ tự động thêm vào bảng `RecordingInstruments`:
- Với mỗi nhạc cụ detected, tìm trong bảng `Instruments` theo tên
- Nếu tìm thấy → tạo record trong `RecordingInstruments`:
  ```
  RecordingId = recordingId
  InstrumentId = instrument.Id
  PlayingTechnique = null  (hoặc để expert bổ sung sau)
  ```
- Đánh dấu đây là "AI suggested" (chưa verified bởi expert)
  → Tùy thuộc vào workflow của hệ thống: có thể thêm trực tiếp,
  hoặc lưu vào bảng staging chờ expert approve.

---

## TÓM TẮT THAY ĐỔI

| Thành phần | Hành động | Chi tiết |
|---|---|---|
| Model Python (.onnx) | KHÔNG ĐỔI | Giữ nguyên 100% |
| Pipeline Python (train) | KHÔNG ĐỔI | Giữ nguyên 100% |
| DTOs | THÊM MỚI | ChunkResult, DetectedInstrumentSummary, TimeSegment, MultiInstrumentDetectionResponse |
| Service | THÊM METHOD | DetectMultipleInstrumentsAsync + MergeConsecutiveChunks |
| Service | GIỮ NGUYÊN | DetectInstrumentAsync (tương thích ngược) |
| Controller | THÊM ENDPOINT | POST detect-instruments (số nhiều) |
| Controller | CẬP NHẬT | analyze-recording dùng method mới |
| Program.cs | KHÔNG ĐỔI | Singleton đã đăng ký |

---

## KIỂM TRA SAU KHI SỬA

```bash
# 1. Build
dotnet build

# 2. Test endpoint mới
curl -X POST http://localhost:5000/api/audio-analysis/detect-instruments \
  -F "file=@test_hoa_tau.wav"
# → Phải trả về nhiều nhạc cụ trong detectedInstruments

# 3. Test với timeline
curl -X POST "http://localhost:5000/api/audio-analysis/detect-instruments?includeTimeline=true" \
  -F "file=@test_hoa_tau.wav"
# → Phải có trường timeline với kết quả từng chunk

# 4. Test endpoint cũ vẫn hoạt động (tương thích ngược)
curl -X POST http://localhost:5000/api/audio-analysis/detect-instrument \
  -F "file=@test_solo.wav"
# → Vẫn trả về 1 nhạc cụ như cũ

# 5. Kiểm tra edge cases:
#    - File audio ngắn (< 3 giây) → ít nhất 1 chunk
#    - File chỉ có 1 nhạc cụ → detectedInstruments chỉ có 1 phần tử
#    - File toàn background → detectedInstruments rỗng []
```

---

## QUY TẮC

1. KHÔNG sửa model ONNX hoặc pipeline Python
2. KHÔNG xóa method/endpoint cũ — chỉ THÊM mới
3. Method RunInference, LoadAndResampleAudioAsync, SplitIntoChunks → GIỮA NGUYÊN, tái sử dụng
4. Tuân theo convention project hiện có (namespace, naming, return type, error handling)
5. Constants (threshold, chunk duration, background class name) phải dễ config — đặt ở đầu class hoặc trong appsettings.json
