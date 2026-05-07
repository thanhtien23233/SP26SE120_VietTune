# PLAN: Export Academic Datasets — CSV / XLSX / JSON

**Slug:** `export-academic-dataset`
**Ngày tạo:** 2026-04-10
**Tham chiếu:** `PLAN-feature-gaps.md §B`
**Phạm vi:** Frontend only — không cần API mới.

---

## Context Check (Phase -1)

### Hiện trạng — Export JSON đang tồn tại ở 2 chỗ

| File | Hàm / vị trí | Output hiện tại |
|------|-------------|-----------------|
| `src/pages/researcher/ResearcherPortalPage.tsx` | `handleExportDataset` (line 569) | `viettune-researcher-export-YYYY-MM-DD.json` |
| `src/pages/SearchPage.tsx` | inline handler (line 226) | `viettune-search-export-YYYY-MM-DD.json` |

**Payload hiện tại** (ResearcherPortalPage):
```
id, title, titleVietnamese, description, ethnicity (object), region (enum string),
instruments (name array), tags, recordedDate, uploadedDate, verificationStatus
```

**SearchPage payload** thêm: `performers`.

### Thiếu so với yêu cầu
- ❌ CSV export
- ❌ XLSX export
- ❌ Column selector (chọn trường dữ liệu)
- ❌ Academic metadata header (dataset version, license CC-BY-NC, xuất ngày)
- ❌ Export dialog/modal riêng
- ❌ Filename theo format học thuật
- ❌ Code bị nhân đôi giữa ResearcherPortalPage + SearchPage (DRY violation)

### Thư viện & types
| Thứ | Hiện trạng |
|-----|-----------|
| `xlsx` (SheetJS) | **Chưa có** trong `package.json` |
| `Recording` interface | `src/types/recording.ts` — đầy đủ fields |
| `RecordingMetadata` | `tuningSystem, modalStructure, tempo, ritualContext, regionalVariation, lyrics, lyricsTranslation, transcription, culturalSignificance, historicalContext, recordingQuality, originalSource` |
| `Ethnicity` | `name, nameVietnamese, region, population, language, musicalTraditions` |
| `Instrument` | `name, nameVietnamese, category` |
| `Performer` | `name, nameVietnamese, title, specialization, birthYear, deathYear` |

---

## Phase 0 — Socratic Gate (Chốt thiết kế)

| Câu hỏi | Chốt |
|---------|------|
| Formats | **JSON + CSV + XLSX** (3 định dạng, chọn 1 khi export) |
| Column set | **User-selectable** — checkbox, với preset "Academic Standard" |
| Filter source | Dùng **filter đang áp dụng** (approvedRecordings array) — không cần refetch |
| XLSX library | **`xlsx` (SheetJS)** |
| Export locations | **ResearcherPortalPage** (primary) + **SearchPage** (secondary, dùng chung util) |

---

## Thiết kế tổng thể

```
Button "Xuất dataset"
   ↓ click
ExportDatasetDialog (modal)
   ├── Format picker (JSON / CSV / XLSX)
   ├── Column selector (checkboxes, nhóm theo group)
   │     ├── Core: id, title, titleVietnamese
   │     ├── Metadata: ethnicity, region, instruments, performers
   │     ├── Cultural: tuningSystem, ritualContext, regionalVariation, culturalSignificance
   │     ├── Transcript: lyrics, lyricsTranslation, transcription
   │     ├── Timestamps: recordedDate, uploadedDate
   │     └── GPS: gpsLatitude, gpsLongitude
   ├── Preview (số bản thu sẽ export)
   └── Button "Xuất ngay"
         ↓
   datasetExport.ts (util)
   ├── buildRows(recordings, columns) → flat row[]
   ├── toJson(rows, meta)     → Blob
   ├── toCsv(rows)            → Blob (Papa-free, thủ công)
   └── toXlsx(rows, meta)     → Blob (SheetJS)
         ↓
   triggerDownload(blob, filename)
```

---

## Danh sách cột có thể export

| Column key | Label hiển thị | Field path |
|------------|---------------|-----------|
| `id` | ID | `r.id` |
| `title` | Tên bản thu | `r.title` |
| `titleVietnamese` | Tên tiếng Việt | `r.titleVietnamese` |
| `description` | Mô tả | `r.description` |
| `ethnicity` | Dân tộc | `r.ethnicity.nameVietnamese` |
| `region` | Vùng miền | `REGION_NAMES[r.region]` |
| `recordingType` | Loại bản thu | `r.recordingType` |
| `instruments` | Nhạc cụ | `r.instruments.map(i => i.nameVietnamese).join('; ')` |
| `performers` | Nghệ nhân | `r.performers.map(p => p.name).join('; ')` |
| `tags` | Tags | `r.tags.join('; ')` |
| `recordedDate` | Ngày thu âm | `r.recordedDate` |
| `uploadedDate` | Ngày đăng tải | `r.uploadedDate` |
| `verificationStatus` | Trạng thái xác minh | `r.verificationStatus` |
| `tuningSystem` | Hệ thống âm thanh | `r.metadata.tuningSystem` |
| `modalStructure` | Cấu trúc modal | `r.metadata.modalStructure` |
| `tempo` | Tempo (BPM) | `r.metadata.tempo` |
| `ritualContext` | Ngữ cảnh nghi lễ | `r.metadata.ritualContext` |
| `regionalVariation` | Dị bản vùng | `r.metadata.regionalVariation` |
| `lyrics` | Lời gốc | `r.metadata.lyrics` |
| `lyricsTranslation` | Lời dịch | `r.metadata.lyricsTranslation` |
| `transcription` | Phiên âm | `r.metadata.transcription` |
| `culturalSignificance` | Ý nghĩa văn hóa | `r.metadata.culturalSignificance` |
| `historicalContext` | Bối cảnh lịch sử | `r.metadata.historicalContext` |
| `recordingQuality` | Chất lượng thu âm | `r.metadata.recordingQuality` |
| `originalSource` | Nguồn gốc | `r.metadata.originalSource` |
| `gpsLatitude` | GPS Vĩ độ | `r.gpsLatitude` |
| `gpsLongitude` | GPS Kinh độ | `r.gpsLongitude` |

**Preset "Academic Standard"** = `id, title, titleVietnamese, ethnicity, region, instruments, performers, recordedDate, verificationStatus, ritualContext, culturalSignificance, historicalContext, tuningSystem, transcription`

---

## Phase 1 — Dependencies & Utils

### 1.1 Cài `xlsx`
```bash
npm install xlsx
```

### 1.2 Tạo `src/utils/datasetExport.ts`

```typescript
// Types
export interface ExportColumn { key: string; label: string; }
export interface ExportMeta { total: number; exportedAt: string; filters?: string; datasetVersion: string; license: string; }
export type ExportFormat = 'json' | 'csv' | 'xlsx';

// buildRows: flatten Recording[] → plain object[] theo cột được chọn
export function buildRows(recordings: Recording[], columns: ExportColumn[]): Record<string, unknown>[]

// toJson: wrap rows + meta → Blob
export function toJson(rows: ..., meta: ExportMeta): Blob

// toCsv: rows → RFC 4180 CSV Blob (không dùng thư viện ngoài)
export function toCsv(rows: ..., columns: ExportColumn[]): Blob

// toXlsx: rows → XLSX Blob (SheetJS)
export function toXlsx(rows: ..., columns: ExportColumn[], meta: ExportMeta): Blob

// triggerDownload: tạo <a> và click
export function triggerDownload(blob: Blob, filename: string): void

// buildFilename: viettune-academic-dataset-YYYY-MM-DD.{ext}
export function buildFilename(format: ExportFormat): string
```

**Academic JSON wrapper:**
```json
{
  "dataset": "VietTune Traditional Music Archive",
  "version": "1.0",
  "license": "CC-BY-NC 4.0",
  "exportedAt": "...",
  "exportedBy": "Researcher Portal",
  "total": 123,
  "columns": ["id", "title", ...],
  "records": [...]
}
```

**XLSX**: Sheet `"Records"` + sheet `"Metadata"` (dataset info, license, export date, column descriptions).

**CSV header row**: `"VietTune Academic Dataset — Exported: YYYY-MM-DD — License: CC-BY-NC 4.0"` (row 1 comment), rồi header row với tên cột, rồi data.

---

## Phase 2 — ExportDatasetDialog Component

### 2.1 Tạo `src/components/features/research/ExportDatasetDialog.tsx`

**Props:**
```typescript
interface ExportDatasetDialogProps {
  open: boolean;
  onClose: () => void;
  recordings: Recording[];
}
```

**UI layout:**
```
┌──────────────────────────────────────────────────────┐
│ Xuất bộ dữ liệu học thuật              [×]           │
├──────────────────────────────────────────────────────┤
│ Định dạng:  ○ JSON  ○ CSV  ● XLSX                    │
├──────────────────────────────────────────────────────┤
│ Cột dữ liệu:              [✓ Chọn tất cả] [Preset]   │
│  [Core]                                              │
│   ☑ ID  ☑ Tên  ☑ Tên tiếng Việt  ☐ Mô tả           │
│  [Metadata]                                          │
│   ☑ Dân tộc  ☑ Vùng  ☑ Nhạc cụ  ☑ Nghệ nhân ...   │
│  [Cultural / Học thuật]                              │
│   ☑ Hệ thống âm  ☑ Nghi lễ  ☑ Dị bản ...           │
│  [Transcript]                                        │
│   ☐ Lời gốc  ☐ Lời dịch  ☑ Phiên âm                │
│  [GPS]                                               │
│   ☐ GPS Vĩ độ  ☐ GPS Kinh độ                        │
├──────────────────────────────────────────────────────┤
│ Sẽ xuất: 47 bản thu · 14 cột                        │
├──────────────────────────────────────────────────────┤
│              [Hủy]  [Xuất ngay ↓ XLSX]              │
└──────────────────────────────────────────────────────┘
```

**State:**
```typescript
const [format, setFormat] = useState<ExportFormat>('xlsx');
const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set(ACADEMIC_PRESET_KEYS));
const [isExporting, setIsExporting] = useState(false);
```

**Preset button**: áp dụng `ACADEMIC_PRESET_KEYS` vào `selectedKeys`.

**Xuất ngay**: gọi `buildRows` → `toJson/toCsv/toXlsx` → `triggerDownload` → toast success → đóng dialog.

---

## Phase 3 — Tích hợp vào ResearcherPortalPage & SearchPage

### 3.1 ResearcherPortalPage

- Import `ExportDatasetDialog`
- Thêm state: `const [showExportDialog, setShowExportDialog] = useState(false)`
- Thay nút "Xuất dataset (JSON)":
  ```tsx
  <button onClick={() => setShowExportDialog(true)}>
    <Download /> Xuất dataset
  </button>
  <ExportDatasetDialog
    open={showExportDialog}
    onClose={() => setShowExportDialog(false)}
    recordings={approvedRecordings}
  />
  ```
- Xóa `handleExportDataset` callback cũ

### 3.2 SearchPage

- Tương tự — thay inline export handler bằng dialog
- Truyền `recordings` prop từ search results

---

## Phase X — Verification Checklist

| # | Kiểm tra | Type |
|---|----------|------|
| 1 | `npm run lint` passes | Auto |
| 2 | `npm run build` passes | Auto |
| 3 | `npm run test:unit` passes | Auto |
| 4 | Dialog mở khi click "Xuất dataset" | Manual |
| 5 | Format picker chuyển JSON / CSV / XLSX | Manual |
| 6 | Checkbox cột hoạt động, count đúng | Manual |
| 7 | Preset "Academic Standard" áp dụng đúng 14 cột | Manual |
| 8 | "Chọn tất cả" / bỏ chọn tất cả | Manual |
| 9 | JSON download: wrapper đúng format học thuật | Manual |
| 10 | CSV download: header row tiêu đề, data đúng | Manual |
| 11 | XLSX download: sheet "Records" + sheet "Metadata" | Manual |
| 12 | Filename: `viettune-academic-dataset-YYYY-MM-DD.{ext}` | Manual |
| 13 | ResearcherPortalPage: 0 bản thu → nút disabled | Manual |
| 14 | SearchPage: export cũng dùng dialog mới | Manual |
| 15 | Không còn duplicate export logic giữa 2 pages | Code review |

---

### Phase X — Kết quả chạy thực tế (2026-04-10)

**Nhật ký lệnh đã chạy:**
- `npm run lint` → **PASS**
- `npm run build` → **PASS**
- `npm run test:unit` (Vitest: 38 tests) → **PASS**

**Rà soát tĩnh (code review):**
- `ResearcherPortalPage` đã dùng `ExportDatasetDialog`, xóa `handleExportDataset` JSON cũ.
- `SearchPage` đã dùng `ExportDatasetDialog`, xóa block `new Blob(...)` JSON cũ.
- Không còn dấu vết filename cũ `viettune-search-export` / `viettune-researcher-export`.
- Nút export ở `ResearcherPortalPage` vẫn `disabled` khi `searchLoading || approvedRecordings.length === 0`.

| # | Kiểm tra | Type | Trạng thái |
|---|----------|------|-----------|
| 1 | `npm run lint` passes | Auto | ☑ PASS |
| 2 | `npm run build` passes | Auto | ☑ PASS |
| 3 | `npm run test:unit` passes | Auto | ☑ PASS |
| 4 | Dialog mở khi click "Xuất dataset" | Manual | ☐ Chưa chạy manual |
| 5 | Format picker chuyển JSON / CSV / XLSX | Manual | ☐ Chưa chạy manual |
| 6 | Checkbox cột hoạt động, count đúng | Manual | ☐ Chưa chạy manual |
| 7 | Preset "Academic Standard" áp dụng đúng 14 cột | Manual | ☐ Chưa chạy manual |
| 8 | "Chọn tất cả" / bỏ chọn tất cả | Manual | ☐ Chưa chạy manual |
| 9 | JSON download: wrapper đúng format học thuật | Manual | ☐ Chưa chạy manual |
| 10 | CSV download: header row tiêu đề, data đúng | Manual | ☐ Chưa chạy manual |
| 11 | XLSX download: sheet "Records" + sheet "Metadata" | Manual | ☐ Chưa chạy manual |
| 12 | Filename: `viettune-academic-dataset-YYYY-MM-DD.{ext}` | Manual | ☐ Chưa chạy manual |
| 13 | ResearcherPortalPage: 0 bản thu → nút disabled | Manual | ☑ Pass (static review) |
| 14 | SearchPage: export cũng dùng dialog mới | Manual | ☑ Pass (static review) |
| 15 | Không còn duplicate export logic giữa 2 pages | Code review | ☑ PASS |

> Ghi chú: `xlsx` đã có sẵn trong `package.json` trước khi triển khai Phase 1, nên không cần thêm dependency mới ở lần này.

---

## File Delivery Summary

| File | Loại | Giai đoạn |
|------|------|----------|
| `package.json` | Thêm `xlsx` | Phase 1 |
| `src/utils/datasetExport.ts` | **Mới** | Phase 1 |
| `src/components/features/research/ExportDatasetDialog.tsx` | **Mới** | Phase 2 |
| `src/pages/researcher/ResearcherPortalPage.tsx` | Sửa | Phase 3 |
| `src/pages/SearchPage.tsx` | Sửa | Phase 3 |

**Ước tính effort:** ~2–3 giờ  
**Phụ thuộc backend:** Không — toàn bộ frontend.
