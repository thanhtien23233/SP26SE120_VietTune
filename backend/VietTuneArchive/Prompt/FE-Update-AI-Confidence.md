# Cập nhật API: Tích hợp Confidence Score cho Nhạc cụ từ AI

Tài liệu này thông báo cho đội ngũ Frontend (FE) về những thay đổi mới nhất ở Backend (BE) liên quan đến việc cung cấp độ tin cậy (`confidence`) của các nhạc cụ được nhận diện bởi AI.

## 1. Mục tiêu
Gộp chung kết quả nhận diện nhạc cụ (với độ tin cậy) vào trực tiếp API phân tích chính để FE không cần gọi thêm một endpoint riêng biệt nào khác. Toàn bộ thông tin được trả về thông qua **Gemini API**.

## 2. Các thay đổi cụ thể trên Backend

### A. Cập nhật DTO (`AIAnalysisResultDto` và `InstrumentRefDto`)
Mảng `instruments` trả về trong kết quả phân tích giờ đây không chỉ có `id` và `name` mà sẽ bao gồm các trường dữ liệu đánh giá độ tin cậy.

**Cấu trúc JSON Schema mới cho `instruments`:**
```json
"instruments": [
  {
    "id": "uuid-cua-nhac-cu",
    "name": "Đàn tranh",
    
    // CÁC TRƯỜNG MỚI ĐƯỢC THÊM VÀO:
    "confidence": 0.92,          // Độ tin cậy (0.0 đến 1.0) - Bắt buộc
    "max_confidence": 0.97,      // Tùy chọn (Nếu có)
    "overall_average": 0.88,     // Tùy chọn (Nếu có)
    "frame_ratio": 0.72,         // Tùy chọn (Nếu có)
    "dominant_frames": 142,      // Tùy chọn (Nếu có)
    "total_frames": 197          // Tùy chọn (Nếu có)
  }
]
```

### B. Cập nhật System Prompt và JSON Schema
- **`music_schema.txt`**: Đã được thêm các trường `confidence`, `max_confidence`, `overall_average`, `frame_ratio`, `dominant_frames`, `total_frames` vào schema để Gemini API trả đúng định dạng.
- **`system_prompt.txt`**: Đã cập nhật yêu cầu (Prompt) để chỉ định rõ Gemini phải ước tính độ tin cậy (`confidence`) cũng như các số liệu khung hình (`frames`) nếu có thể.
- **`MusicBotPrompt.txt`**: RAG Chatbot giờ cũng đã biết về cách hệ thống AI phân tích độ tin cậy của nhạc cụ, và có thể tư vấn/trả lời nếu người dùng thắc mắc về độ tin cậy của AI.

## 3. Hành động yêu cầu từ Frontend (FE)
1. **Dừng gọi API cũ:** FE **KHÔNG CẦN** gọi endpoint `/api/audio-analysis/detect-instruments` nữa.
2. **Sử dụng API chính:** Lấy dữ liệu nhạc cụ kèm `confidence` trực tiếp từ response của:
   - `POST /api/AIAnalysis/analyze-only`
   - `POST /api/AIAnalysis/analyze-from-url`
   - `POST /api/AIAnalysis/analyze-and-transcribe`
3. **Cập nhật UI:** Hiển thị trực tiếp `%` độ tin cậy (nhân `confidence` với 100) trên giao diện thay vì hiển thị "Không rõ độ tin cậy".
