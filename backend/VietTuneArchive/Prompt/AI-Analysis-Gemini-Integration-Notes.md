# Tài liệu Tích hợp Gemini API cho Phân tích Âm nhạc (VietTune)

Tài liệu này tổng hợp toàn bộ thông tin về cách hệ thống VietTune sử dụng **Gemini API** cho việc phân tích âm nhạc và trích xuất metadata (thể loại, nhạc cụ, thang âm, nhịp độ,...).

---

## 🚀 1. Luồng hoạt động (Tổng quan)

Hệ thống cung cấp tính năng phân tích âm nhạc tự động thông qua `AudioProcessingService` (C# Backend). Khi có yêu cầu phân tích, backend sẽ:
1. Lấy dữ liệu từ Database (IDs và Tên của Dân tộc, Nhạc cụ, Phong cách hát, Thang âm, Nghi lễ).
2. Tải/Gửi file audio lên Gemini API hoặc truyền public URL của audio từ Supabase Storage.
3. Sử dụng một **System Prompt** được cá nhân hóa kèm theo Context DB hiện tại và một **Structured JSON Schema**.
4. Gemini phân tích và trả về thông tin dưới dạng JSON chuẩn xác theo Database Reference, sau đó BE parse dữ liệu trả về cho Frontend (FE).

---

## 📥 2. Dữ liệu truyền vào (Lấy gì)

Gemini API nhận vào 3 phần thông tin chính:

### a. File Audio / Public URL
* **Đối với File Audio tải trực tiếp:** Sẽ được đọc và upload qua API `/v1beta/files?key={apiKey}` của Gemini để lấy `fileUri` có thể truy cập được trước khi phân tích.
* **Đối với URL:** Trực tiếp chuyển public URL của audio (VD: từ Supabase storage) qua thuộc tính `fileData`.

### b. System Prompt (Ngữ cảnh của hệ thống)
Hệ thống sử dụng một prompt định danh vai trò của Gemini và cung cấp danh sách dữ liệu thực tế lấy từ Database (gọi là `{DB_CONTEXT}`).

**System Prompt chi tiết:**
```text
Role: Expert Ethnomusicologist specializing in Vietnamese traditional music (Âm nhạc dân gian Việt Nam).

Task: Analyze the provided audio file. Detect the ethnic origin, instruments, tuning systems, regional characteristics, and performance techniques.

Database Reference (you MUST pick from these lists — use exact "id" and "name" values):
{DB_CONTEXT}

Rules:
1. Return EXACTLY ONE analysis result — your single best interpretation.
2. For ethnicGroup, instruments, vocalStyle, musicalScale, ceremony fields: you MUST return objects with "id" and "name" matching EXACTLY from the Database Reference above. If no match exists, return null for that field.
3. For instruments: return an array of objects, each with "id" and "name" from the Database Reference. If an instrument you hear is NOT in the list, skip it.
4. Do NOT invent IDs or names. Only use values from the Database Reference.
5. STRICTLY follow the provided JSON Schema. Do not output markdown or conversational text.
```

`{DB_CONTEXT}` được cache 6 tiếng và tự động sinh ra dưới dạng danh sách từ Database:
* **EthnicGroups:** Danh sách các dân tộc (id, name).
* **Instruments:** Danh sách các nhạc cụ (id, name).
* **VocalStyles:** Các phong cách giọng hát (id, name).
* **MusicalScales:** Thang âm truyền thống (id, name).
* **Ceremonies:** Nghi lễ gắn liền với âm nhạc (id, name).

### c. Structured JSON Schema
Yêu cầu Gemini trả về chính xác định dạng JSON mong muốn thông qua tính năng `responseSchema` của Gemini API.

---

## 📤 3. Dữ liệu trả về (Trả gì)

Gemini trả về một chuỗi JSON hợp lệ và được backend parse thành `AIAnalysisResultDto`.

### JSON Schema từ Gemini API (`music_schema.txt`)

```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string", "description": "Tên bài hát / bản ghi nhận dạng được" },
    "tempo": { "type": "number", "description": "Nhịp độ BPM" },
    "keySignature": { "type": "string", "enum": ["ngũ cung Bắc Bộ", "ngũ cung Nam Bộ", "chromatic", "unknown"] },
    "ethnicGroup": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" }
      },
      "required": ["id", "name"]
    },
    "language": {
      "type": "string",
      "enum": ["tiếng Tày", "tiếng Nùng", "tiếng Việt", "tiếng Chăm", "tiếng Thái", "tiếng H'Mông", "instrumental", "unknown"]
    },
    "instruments": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" }
        },
        "required": ["id", "name"]
      }
    },
    "genre": {
      "type": "string",
      "enum": ["Hát Ru", "Quan Họ", "Ca Trù", "Hát Văn", "Nhã Nhạc", "Đờn Ca Tài Tử", "Cải Lương", "Chèo", "Ví Giặm", "Hò", "instrumental", "unknown"]
    },
    "performanceContext": { "type": "string", "enum": ["hát ru", "lễ hội", "nghi lễ", "giải trí", "lao động", "unknown"] },
    "ceremony": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" }
      },
      "required": ["id", "name"]
    },
    "vocalStyle": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" }
      },
      "required": ["id", "name"]
    },
    "musicalScale": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" }
      },
      "required": ["id", "name"]
    },
    "composer": { "type": "string", "description": "Tác giả (null nếu dân gian)" },
    "recordingLocation": { "type": "string", "description": "Vùng miền / địa phương ước đoán" },
    "lyricsOriginal": { "type": "string", "description": "Lời gốc (nếu nghe được)" },
    "lyricsVietnamese": { "type": "string", "description": "Bản dịch tiếng Việt (nếu ngôn ngữ gốc khác)" }
  },
  "required": [
    "tempo",
    "keySignature",
    "ethnicGroup",
    "language",
    "instruments",
    "genre",
    "performanceContext"
  ]
}
```

---

## 🛣️ 4. Các Endpoints liên quan (Qua đâu)

Toàn bộ các yêu cầu liên quan đến phân tích audio bằng Gemini API đều đi qua controller `AIAnalysisController.cs`:

### 1. `POST /api/AIAnalysis/analyze-only`
* **Mô tả:** Tải trực tiếp file audio từ client lên BE, BE upload lên Gemini và gọi phân tích.
* **Đầu vào:** File audio (Multipart form data).
* **Đầu ra:** Trả về kết quả JSON chi tiết theo schema (Kèm URI lưu trữ file tạm của Gemini & token usage).

### 2. `POST /api/AIAnalysis/analyze-from-url`
* **Mô tả:** Nhận URL file audio từ client (VD: public URL của Supabase Storage) và truyền link trực tiếp cho Gemini phân tích.
* **Đầu vào:** JSON chứa `audioUrl` và `mimeType` (tùy chọn).
* **Đầu ra:** Kết quả phân tích metadata qua JSON Schema.

### 3. `POST /api/AIAnalysis/analyze-and-transcribe`
* **Mô tả:** Chạy đồng thời phân tích metadata bằng Gemini API và tạo transcription lời bài hát bằng local Whisper service.
* **Đầu vào:** File audio (Multipart form data).
* **Đầu ra:** DTO chứa cả `Analysis` (Gemini API) và `Transcription` (Local Whisper service).
