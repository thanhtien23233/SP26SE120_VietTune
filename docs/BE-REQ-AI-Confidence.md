# Yêu cầu cập nhật API (Backend) - AI Instrument Confidence

Tài liệu này mô tả các điểm cần sửa ở phía Backend (BE) để tính năng hiển thị % độ tin cậy (confidence) của nhạc cụ trên Frontend (FE) hoạt động với dữ liệu thực tế (real data) thay vì báo "Không rõ độ tin cậy" hoặc dùng mock data.

## 🔴 Vấn đề hiện tại

Hiện tại, Frontend (FE) gọi API `/api/AIAnalysis/analyze-only` để lấy thông tin phân tích. Tuy nhiên, schema trả về cho mảng `instruments` (nhạc cụ) đang thiếu hoàn toàn các trường dữ liệu liên quan đến confidence.

**Schema BE đang trả về:**
```json
"instruments": [
  {
    "id": "uuid",
    "name": "Đàn tranh"
  }
]
```
Vì thiếu dữ liệu, FE buộc phải hiển thị là "Không rõ độ tin cậy" (hoặc 0% nếu không fix lỗi). 

Mặc dù hệ thống có endpoint riêng cho Machine Learning Detection (`/api/audio-analysis/detect-instruments`), nhưng việc phải gọi song song 2 API và tự merge ở FE dẫn đến rủi ro:
1. Tên nhạc cụ trả về từ 2 API có thể khác format (ví dụ: "Đàn tranh" có dấu từ AI, "Dan tranh" không dấu từ ML model), buộc FE phải tự chuẩn hóa để map lại.
2. Tốn tài nguyên mạng (phải upload file 2 lần cho 2 API khác nhau nếu không dùng chung storage hiệu quả).

## ✅ Yêu cầu Backend (Chọn 1 trong 2 phương án)

### Phương án 1: Tối ưu nhất (Gộp chung vào AI Analysis Response)

BE gọi ML model ở phía backend, sau đó **gộp chung** kết quả detection vào response của `/api/AIAnalysis/analyze-only` (và `/api/AIAnalysis/analyze-and-transcribe`).

**Cập nhật DTO của `AIAnalysisResultDto` (phần instruments):**
Thêm các trường dữ liệu confidence vào từng object nhạc cụ:

```json
"instruments": [
  {
    "id": "uuid",
    "name": "Đàn tranh",
    
    // THÊM CÁC TRƯỜNG DƯỚI ĐÂY:
    "confidence": 0.92,          // Bắt buộc (0.0 đến 1.0)
    "max_confidence": 0.97,      // Tùy chọn
    "overall_average": 0.88,     // Tùy chọn
    "frame_ratio": 0.72,         // Tùy chọn
    "dominant_frames": 142,      // Tùy chọn
    "total_frames": 197          // Tùy chọn
  }
]
```
*Lưu ý:* Nếu áp dụng phương án này, FE sẽ **không cần** gọi endpoint `/detect-instruments` nữa, UI sẽ lấy thẳng % từ AI response.

---

### Phương án 2: Duy trì 2 endpoint song song (FE tự merge)

Nếu kiến trúc BE yêu cầu tách biệt hoàn toàn AI (Gemini/LLM) và ML Audio Model, BE cần đảm bảo endpoint `/api/audio-analysis/detect-instruments` hoạt động ổn định và trả đúng format:

**Endpoint:** `POST /api/audio-analysis/detect-instruments`
**Payload trả về cần có format:**
```json
{
  "instruments": [
    {
      "instrument": "Dan tranh", // Tên nhạc cụ tiếng Việt không dấu hoặc có dấu
      "confidence": 0.92,
      "max_confidence": 0.97,
      "overall_average": 0.88,
      "frame_ratio": 0.72,
      "dominant_frames": 142,
      "total_frames": 197
    }
  ],
  "audio_info": { ... }
}
```

**Yêu cầu đi kèm cho Phương án 2:**
1. Endpoint này phải được deploy và available (hiện tại có thể đang down hoặc chưa deploy bản mới nhất).
2. Tên nhạc cụ (`instrument`) trả về từ ML model nên đồng nhất (hoặc FE đã cover việc bỏ dấu để match `Đàn tranh` == `Dan tranh`, nhưng BE cần đảm bảo không lệch logic).

## 💡 Khuyến nghị
**Nên chọn Phương án 1.** Việc BE lấy dữ liệu từ ML Model, tổng hợp chung với kết quả phân tích của LLM, rồi trả về 1 payload duy nhất qua `/analyze-only` sẽ giúp FE đơn giản hóa logic, giảm số lượng request và tránh tình trạng race condition khi merge dữ liệu.
