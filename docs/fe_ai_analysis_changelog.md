# 📋 FE Update — AI Analysis Response (2026-05-05)

## Endpoints (không đổi)

| Method | URL | Mô tả |
|--------|-----|-------|
| `POST` | `/api/AIAnalysis/analyze-only` | Upload file phân tích |
| `POST` | `/api/AIAnalysis/analyze-from-url` | Phân tích từ URL |
| `POST` | `/api/AIAnalysis/analyze-and-transcribe` | Phân tích + transcribe |

---

## ❌ Fields đã BỎ

| Field | Lý do |
|-------|-------|
| `genre` | Không có bảng Genre trong DB, bỏ hoàn toàn |
| `lyricsOriginal` | Không cần trong analysis response |
| `lyricsVietnamese` | Không cần trong analysis response |

> [!WARNING]
> FE cần **xoá** các reference tới `genre`, `lyricsOriginal`, `lyricsVietnamese` khỏi code. Các fields này sẽ **không còn** trong response.

---

## ✅ Fields MỚI thêm

### 1. `regionSuggestion` (object, required)

Gợi ý vùng miền — giá trị `region` lấy từ DB (bảng `Provinces.RegionCode`).

```json
"regionSuggestion": {
  "region": "Bắc Bộ",
  "detail": "Đặc trưng thang âm ngũ cung Bắc Bộ, sử dụng đàn tranh và sáo trúc"
}
```

| Prop | Type | Required | Mô tả |
|------|------|----------|-------|
| `region` | `string` | ✅ | Vùng miền — giá trị thật từ DB |
| `detail` | `string` | ❌ | Giải thích chi tiết lý do gợi ý |

---

### 2. `classification` (object, required)

Phân loại tổng hợp — `tags` lấy từ DB (bảng `Tags`).

```json
"classification": {
  "performanceType": "vocal",
  "culturalContext": "lễ hội",
  "tags": ["dân ca", "cổ truyền"]
}
```

| Prop | Type | Required | Mô tả |
|------|------|----------|-------|
| `performanceType` | `string` | ✅ | Enum: `"vocal"` / `"instrumental"` / `"mixed"` |
| `culturalContext` | `string` | ❌ | Bối cảnh văn hóa |
| `tags` | `string[]` | ❌ | Nhãn phân loại — giá trị thật từ DB |

---

### 3. `overallConfidence` (number, required)

```json
"overallConfidence": 0.85
```

| Prop | Type | Required | Mô tả |
|------|------|----------|-------|
| `overallConfidence` | `number` | ✅ | 0.0 – 1.0, độ tin cậy tổng thể |

---

## 📦 Response JSON mẫu đầy đủ

```jsonc
{
  // --- Required fields (giữ nguyên) ---
  "tempo": 120.0,
  "keySignature": "ngũ cung Bắc Bộ",
  "ethnicGroup": { "id": "uuid", "name": "Kinh" },
  "language": "tiếng Việt",
  "instruments": [
    {
      "id": "uuid",
      "name": "đàn tranh",
      "confidence": 0.92,
      "maxConfidence": 0.95,
      "overallAverage": 0.88,
      "frameRatio": 0.75,
      "dominantFrames": 120,
      "totalFrames": 160
    }
  ],
  "performanceContext": "lễ hội",

  // --- ✨ MỚI: AI suggestion fields ---
  "regionSuggestion": {
    "region": "Bắc Bộ",
    "detail": "Thang âm ngũ cung đặc trưng miền Bắc, kết hợp sáo trúc"
  },
  "classification": {
    "performanceType": "mixed",
    "culturalContext": "lễ hội truyền thống",
    "tags": ["dân ca", "cổ truyền"]
  },
  "overallConfidence": 0.85,

  // --- Optional fields (giữ nguyên) ---
  "title": "Lý Ngựa Ô",
  "ceremony": { "id": "uuid", "name": "Hội Lim" },
  "vocalStyle": { "id": "uuid", "name": "Hát quan họ" },
  "musicalScale": { "id": "uuid", "name": "Ngũ cung" },
  "composer": null,
  "recordingLocation": "Bắc Ninh",
  "geminiFileUri": "...",

  // --- Token usage (giữ nguyên) ---
  "tokenUsage": {
    "promptTokenCount": 1234,
    "candidatesTokenCount": 567,
    "totalTokenCount": 1801
  }
}
```

## 🎨 Gợi ý hiển thị

- **`overallConfidence`** → Progress bar / badge: xanh (> 0.7), vàng (0.4–0.7), đỏ (< 0.4)
- **`regionSuggestion.region`** → Pre-fill dropdown vùng miền, `detail` hiển thị tooltip
- **`classification.performanceType`** → Radio button hoặc badge
- **`classification.tags`** → Chip/badge list
- Tất cả fields này là **gợi ý AI** — user có thể sửa trước khi submit
