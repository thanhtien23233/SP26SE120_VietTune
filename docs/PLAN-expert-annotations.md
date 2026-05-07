# PLAN: §C — Expert Annotation Tools (Scholarly)

**Slug:** `expert-annotations`
**Ngày tạo:** 2026-04-10
**Tham chiếu:** `PLAN-feature-gaps.md §C`
**Phạm vi:** Frontend only — API đã có sẵn đầy đủ trong Swagger.

---

## Context Check (Phase -1)

### Swagger API — đầy đủ, chưa được dùng

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/Annotation/get-by-recording-id?recordingId={uuid}` | Lấy annotations theo recording |
| `GET` | `/api/Annotation/get-by-expert-id?expertId={uuid}` | Lấy annotations của 1 expert |
| `POST` | `/api/Annotation/create` | Tạo annotation mới |
| `PUT` | `/api/Annotation/update` | Cập nhật annotation |
| `DELETE` | `/api/Annotation/delete?id={uuid}` | Xóa annotation |
| `GET` | `/api/Song/{songId}/annotations` | Annotations theo song (paged) |

### DTOs (chính xác từ Swagger)

**`AnnotationDto`** (đọc)
```
id: uuid
recordingId: uuid
expertId: uuid
content: string | null
type: string | null
researchCitation: string | null
timestampStart: int32 | null    ← thời gian bắt đầu tính bằng giây
timestampEnd: int32 | null      ← thời gian kết thúc tính bằng giây
createdAt: datetime
```

**`CreateAnnotationDto`** (tạo mới)
```
recordingId: uuid
expertId: uuid
content: string | null
type: string | null
researchCitation: string | null
timestampStart: int32 | null
timestampEnd: int32 | null
```

**`UpdateAnnotationDto`** (cập nhật)
```
id: uuid
recordingId: uuid
expertId: uuid
content: string | null
type: string | null
researchCitation: string | null
timestampStart: int32 | null
timestampEnd: int32 | null
```

**`AnnotationDtoPagedList`** (dùng cho `/api/Song/{songId}/annotations`)
```
items: AnnotationDto[]
page: int32
pageSize: int32
total: int32
```

### Hiện trạng frontend

| Thành phần | Trạng thái |
|------------|-----------|
| `src/services/annotationApi.ts` | **Không tồn tại** |
| `src/types/annotation.ts` | **Không tồn tại** |
| `src/components/features/annotation/AnnotationPanel.tsx` | **Không tồn tại** |
| `ModerationPage.tsx` — tab annotation | **Không tồn tại** |
| `RecordingDetailPage.tsx` — hiển thị annotations | **Không tồn tại** |
| `expertReviewNotesDraft` | Có — **free-text textarea** per submission (localStorage), không phải API annotation |

### Gap vs yêu cầu

- ❌ Không có API service layer
- ❌ Không có TypeScript types
- ❌ Không có UI CRUD annotations
- ❌ Annotation không có loại (scholarly_note / rare_variant / research_link)
- ❌ Không có timestamp range annotation trên audio
- ❌ Không có panel trong ModerationPage
- ❌ Không có hiển thị read-only cho public (RecordingDetailPage)

---

## Phase 0 — Socratic Gate (Chốt thiết kế)

| Câu hỏi | Chốt |
|---------|------|
| Annotation types (field `type` string) | **4 giá trị cố định:** `scholarly_note`, `rare_variant`, `research_link`, `general` |
| Ai được tạo annotation? | **Expert + Admin** (dùng `useAuth` để lấy `user.id` làm `expertId`) |
| Timestamp range | **Có** — UI nhập số giây (int), map sang `timestampStart` / `timestampEnd` |
| Research citation format | **URL** hoặc **văn bản** — 1 field `researchCitation` |
| Tích hợp chính | **ModerationPage** (tab mới `annotation`) — expert thao tác trong khi review |
| Tích hợp phụ | **RecordingDetailPage** — hiển thị read-only (không filter bởi user) |
| Researcher portal | **Không** — ngoài phạm vi lần này |

---

## Thiết kế tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│ ModerationPage — tab "Chú thích học thuật"                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ AnnotationPanel (recordingId = selectedRecordingId)  │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │ Danh sách annotations (load từ API)           │  │    │
│  │  │  • [scholarly_note] "Giai điệu này..." [×]    │  │    │
│  │  │  • [rare_variant]   "Dị bản vùng..."  [×]    │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  │  [+ Thêm chú thích]                                  │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │ AnnotationForm (create / edit)                │  │    │
│  │  │  Loại: [scholarly_note ▼]                     │  │    │
│  │  │  Nội dung: [                    ]              │  │    │
│  │  │  Research citation: [URL / văn bản]            │  │    │
│  │  │  Timestamp: [từ 00:00] đến [00:00]             │  │    │
│  │  │                      [Hủy] [Lưu chú thích]    │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

RecordingDetailPage — section "Chú thích chuyên gia"
  • Read-only — hiển thị tất cả annotations của bản thu
  • Phân nhóm theo type, timestamp (nếu có)
```

---

## Danh sách annotation types

| Key | Label | Icon |
|-----|-------|------|
| `scholarly_note` | Ghi chú học thuật | 📝 |
| `rare_variant` | Dị bản hiếm gặp | 🌟 |
| `research_link` | Tài liệu nghiên cứu | 🔗 |
| `general` | Ghi chú chung | 💬 |

---

## Phase 1 — Types & API Service

### 1.1 Tạo `src/types/annotation.ts`

```typescript
export type AnnotationType = 'scholarly_note' | 'rare_variant' | 'research_link' | 'general';

export interface AnnotationDto {
  id: string;
  recordingId: string;
  expertId: string;
  content: string | null;
  type: string | null;           // mapped to AnnotationType on read
  researchCitation: string | null;
  timestampStart: number | null; // seconds (int)
  timestampEnd: number | null;   // seconds (int)
  createdAt: string;
}

export interface CreateAnnotationDto {
  recordingId: string;
  expertId: string;
  content?: string | null;
  type?: string | null;
  researchCitation?: string | null;
  timestampStart?: number | null;
  timestampEnd?: number | null;
}

export interface UpdateAnnotationDto {
  id: string;
  recordingId: string;
  expertId: string;
  content?: string | null;
  type?: string | null;
  researchCitation?: string | null;
  timestampStart?: number | null;
  timestampEnd?: number | null;
}

export interface AnnotationDtoPagedList {
  items: AnnotationDto[] | null;
  page: number;
  pageSize: number;
  total: number;
}

export const ANNOTATION_TYPE_LABELS: Record<string, string> = {
  scholarly_note: 'Ghi chú học thuật',
  rare_variant: 'Dị bản hiếm gặp',
  research_link: 'Tài liệu nghiên cứu',
  general: 'Ghi chú chung',
};

export const ANNOTATION_TYPES = ['scholarly_note', 'rare_variant', 'research_link', 'general'] as const;
```

### 1.2 Tạo `src/services/annotationApi.ts`

```typescript
import { api } from '@/services/api';
import type { AnnotationDto, AnnotationDtoPagedList, CreateAnnotationDto, UpdateAnnotationDto } from '@/types/annotation';

// Helper để unwrap response (backend có thể bọc trong { data: [...] } hoặc trả thẳng)
function unwrapAnnotations(res: unknown): AnnotationDto[] { ... }

export const annotationApi = {
  async getByRecordingId(recordingId: string): Promise<AnnotationDto[]> {
    const res = await api.get('/Annotation/get-by-recording-id', { params: { recordingId } });
    return unwrapAnnotations(res);
  },

  async getByExpertId(expertId: string): Promise<AnnotationDto[]> {
    const res = await api.get('/Annotation/get-by-expert-id', { params: { expertId } });
    return unwrapAnnotations(res);
  },

  async getBySongId(songId: string, page = 1, pageSize = 20): Promise<AnnotationDtoPagedList> {
    const res = await api.get(`/Song/${encodeURIComponent(songId)}/annotations`, { params: { page, pageSize } });
    // extract paged list
    ...
  },

  async create(data: CreateAnnotationDto): Promise<void> {
    await api.post('/Annotation/create', data);
  },

  async update(data: UpdateAnnotationDto): Promise<void> {
    await api.put('/Annotation/update', data);
  },

  async delete(id: string): Promise<void> {
    await api.delete('/Annotation/delete', { params: { id } });
  },
};
```

---

## Phase 2 — AnnotationPanel Component

### 2.1 Tạo `src/components/features/annotation/AnnotationPanel.tsx`

**Props:**
```typescript
interface AnnotationPanelProps {
  recordingId: string;
  expertId: string;            // user.id từ useAuth — chỉ expert mới tạo/xóa
  canEdit?: boolean;           // true nếu user là Expert/Admin
  className?: string;
}
```

**State:**
```typescript
const [annotations, setAnnotations] = useState<AnnotationDto[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [showForm, setShowForm] = useState(false);
const [editTarget, setEditTarget] = useState<AnnotationDto | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Logic:**
- `load()` → `annotationApi.getByRecordingId(recordingId)`
- `handleCreate(data)` → `annotationApi.create({ ...data, recordingId, expertId })` → reload
- `handleUpdate(data)` → `annotationApi.update(data)` → reload
- `handleDelete(id)` → confirm → `annotationApi.delete(id)` → reload
- Chỉ expert tạo annotation của chính mình có thể xóa (`annotation.expertId === expertId`)

**UI layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Chú thích chuyên gia                         [+ Thêm]       │
├──────────────────────────────────────────────────────────────┤
│ [scholarly_note badge]  0:15 – 0:45                         │
│  "Giai điệu này có dị bản ở vùng Tây Bắc..."               │
│  Citation: https://doi.org/...                [✏️] [🗑️]     │
│──────────────────────────────────────────────────────────────│
│ [rare_variant badge]  (không có timestamp)                   │
│  "Đây là dị bản hiếm gặp chỉ xuất hiện..."                 │
│  Citation: —                                  [✏️] [🗑️]     │
└──────────────────────────────────────────────────────────────┘
```

**Inline form (toggle):**
- Select `type` (4 options)
- Textarea `content`
- Input `researchCitation` (URL / văn bản)
- Số giây `timestampStart` / `timestampEnd` (int, optional)
- Buttons: Hủy / Lưu

---

## Phase 3 — Tích hợp ModerationPage

### 3.1 Thêm tab `annotation` vào ModerationPage

```typescript
type ExpertTabId = 'review' | 'ai' | 'knowledge' | 'annotation';  // thêm 'annotation'
```

**Tab header:**
```tsx
{ id: 'annotation', label: 'Chú thích học thuật', icon: PenLine }
```

**Tab content:**
```tsx
{activeTab === 'annotation' && selectedId ? (
  <div className="p-4">
    <AnnotationPanel
      recordingId={selectedRecordingId}   // recordingId từ full recording loaded
      expertId={user.id}
      canEdit={user.role === UserRole.EXPERT || user.role === UserRole.ADMIN}
    />
  </div>
) : activeTab === 'annotation' && !selectedId ? (
  <p>Chọn bản thu từ hàng đợi để xem chú thích.</p>
) : null}
```

**Lưu ý:** `selectedRecordingId` là `recording.id` từ `selectedRecordingFull` đã load theo `selectedId` (submission id). Cần mapping `submissionId → recordingId` — dùng `recording.id` từ full recording object.

---

## Phase 4 — RecordingDetailPage (Read-only)

### 4.1 Thêm section "Chú thích chuyên gia" vào RecordingDetailPage

- Chỉ hiển thị khi `annotations.length > 0`
- Không có form tạo/sửa/xóa (read-only cho public)
- Group theo `type` (scholarly_note, rare_variant, research_link, general)
- Nếu có `timestampStart` → hiển thị timestamp dạng `MM:SS`
- Citation nếu là URL → render thành `<a href>` (`target="_blank"`)

**Load:** `useEffect(() => annotationApi.getByRecordingId(recording.id))` sau khi `recording` đã loaded.

---

## Phase X — Verification Checklist

| # | Kiểm tra | Type |
|---|----------|------|
| 1 | `npm run lint` passes | Auto |
| 2 | `npm run build` passes | Auto |
| 3 | `npm run test:unit` passes | Auto |
| 4 | `annotationApi.getByRecordingId` returns array (inspect Network tab) | Manual |
| 5 | AnnotationPanel loads và hiển thị list trong ModerationPage | Manual |
| 6 | Tạo annotation mới (type = scholarly_note, có content) → xuất hiện trong list | Manual |
| 7 | Sửa annotation → nội dung cập nhật | Manual |
| 8 | Xóa annotation → biến mất khỏi list | Manual |
| 9 | Timestamp display đúng (giây → MM:SS) | Manual |
| 10 | Tab "Chú thích học thuật" chỉ hiển thị khi có `selectedId` trong Moderation queue | Manual |
| 11 | RecordingDetailPage hiển thị annotations read-only khi có dữ liệu | Manual |
| 12 | Không có form create/edit/delete ở RecordingDetailPage | Code review |
| 13 | Expert chỉ xóa được annotation của chính mình (`expertId === user.id`) | Code review |
| 14 | Non-expert (Researcher) không thấy [+ Thêm] và [✏️] [🗑️] | Manual |
| 15 | Research citation là URL → render thành link có `target="_blank"` | Manual |

---

## File Delivery Summary

| File | Loại | Phase |
|------|------|-------|
| `src/types/annotation.ts` | **Mới** | Phase 1 |
| `src/services/annotationApi.ts` | **Mới** | Phase 1 |
| `src/components/features/annotation/AnnotationPanel.tsx` | **Mới** | Phase 2 |
| `src/pages/ModerationPage.tsx` | Sửa | Phase 3 |
| `src/pages/RecordingDetailPage.tsx` | Sửa | Phase 4 |

**Ước tính effort:** ~4–5 giờ
**Phụ thuộc backend:** API đầy đủ ✓ — không cần backend thay đổi.
**Phụ thuộc frontend:** `useAuth` / `useAuthStore` (đã có trong ModerationPage).

---

## Phase X — Kết quả xác minh (2026-04-10)

### Automated checks

| Check | Kết quả |
|------|---------|
| `npm run lint` | ✅ PASS |
| `npm run build` | ✅ PASS |
| `npm run test:unit` | ✅ PASS (12 files, 38 tests) |

### Manual / runtime checks còn cần chạy

- [ ] `annotationApi.getByRecordingId` trả về mảng đúng shape trên dữ liệu thật (Network tab)
- [ ] Tab `Chú thích học thuật` ở `ModerationPage` hiển thị đúng theo item được chọn
- [ ] Create / update / delete annotation chạy đúng với quyền Expert/Admin
- [ ] `RecordingDetailPage` hiển thị read-only đúng nhóm type + timestamp
- [ ] Citation URL render thành link `target="_blank"`

### Ghi chú

- Đã fix warning import order phát sinh trong `Phase X` (ESLint `--max-warnings 0`).
- Không phát hiện lỗi TypeScript hoặc unit test regression từ phần `§C`.
