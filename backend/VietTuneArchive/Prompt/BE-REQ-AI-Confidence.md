# Yêu cầu cập nhật API (Backend) - AI Instrument Confidence

Tài liệu này mô tả các điểm cần sửa ở phía Backend (BE) để tính năng hiển thị % độ tin cậy (confidence) của nhạc cụ trên Frontend (FE) hoạt động với dữ liệu thực tế (real data) thay vì báo "Không rõ độ tin cậy" hoặc dùng mock data.

> [!IMPORTANT]
> **Lưu ý quan trọng:** Endpoint `/api/audio-analysis/detect-instruments` là sử dụng AI local, hiện tại **đã bỏ** do có nhiều hạn chế và độ chính xác chưa tối ưu. Hệ thống sẽ **ưu tiên sử dụng Gemini API** cho các phân tích và trích xuất thông tin.

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

Mặc dù hệ thống từng có endpoint riêng cho Machine Learning Detection (`/api/audio-analysis/detect-instruments` sử dụng AI local), nhưng endpoint này **đã bị gỡ bỏ** do các hạn chế kỹ thuật. Việc gọi song song 2 API và tự merge ở FE dẫn đến rủi ro:
1. Tên nhạc cụ trả về từ 2 API có thể khác format (ví dụ: "Đàn tranh" có dấu từ AI, "Dan tranh" không dấu từ ML model), buộc FE phải tự chuẩn hóa để map lại.
2. Tốn tài nguyên mạng (phải upload file 2 lần cho 2 API khác nhau nếu không dùng chung storage hiệu quả).

## ✅ Yêu cầu Backend (Chọn Phương án 1)

### Phương án 1: Tối ưu nhất (Gộp chung vào AI Analysis Response dùng Gemini API)

BE gọi Gemini API ở phía backend, sau đó **gộp chung** kết quả detection vào response của `/api/AIAnalysis/analyze-only` (và `/api/AIAnalysis/analyze-and-transcribe`).

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

### Phương án 2: Duy trì 2 endpoint song song (FE tự merge) - [ĐÃ BỎ]

> [!WARNING]
> **Phương án này đã bị loại bỏ:** Do endpoint `/api/audio-analysis/detect-instruments` (sử dụng local AI) có quá nhiều hạn chế và đã bị xóa khỏi hệ thống. Toàn bộ các phân tích và trích xuất metadata (bao gồm nhạc cụ) sẽ được thực hiện thông qua **Gemini API**.

Do đó, **Phương án 1 (Gộp chung vào AI Analysis Response dùng Gemini API)** là hướng đi duy nhất và tối ưu nhất để đảm bảo tính năng hiển thị % độ tin cậy hoạt động mượt mà.
