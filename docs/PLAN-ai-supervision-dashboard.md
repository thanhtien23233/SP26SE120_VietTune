# PLAN: §D — AI Supervision Dashboard (Real Data)

**Slug:** `ai-supervision-dashboard`
**Ngày tạo:** 2026-04-10
**Tham chiếu:** `PLAN-feature-gaps.md §D`
**Phạm vi:** Frontend only — thay thế placeholder bằng dữ liệu thật từ API.

---

## Context Check (Phase -1)

### Vấn đề cốt lõi

Tab "Giám sát hệ thống AI" trong `AdminDashboard.tsx` gần như **100% placeholder**:

| Thành phần | Trạng thái hiện tại |
|-----------|-------------------|
| Độ chính xác | **Hardcoded `—`** + ghi chú "khi sẵn sàng" |
| Câu trả lời bị cắm cờ (count) | Đọc `localStorage('ai_flagged_responses')` — **key này không bao giờ được ghi** → luôn = 0 |
| Danh sách flagged | **"Chưa có dữ liệu hiển thị"** — static text |
| Cơ sở tri thức (count) | ✅ **Real** — `knowledgeBaseApi.countKnowledgeBaseItems()` |

### 3 hệ thống flag tách rời (không nhất quán)

| Hệ thống | Data source | Ghi |
|----------|------------|-----|
| **ChatbotPage** | API (`qaMessageService.flagMessage`) | ✅ Real API |
| **ModerationPage tab AI** | `localStorage('viettune_ai_responses_review')` | ❌ Local only |
| **AdminDashboard** | `localStorage('ai_flagged_responses')` | ❌ Key khác, không ai ghi |

### Swagger API có sẵn nhưng chưa dùng

**QAMessage endpoints:**

| Method | Path | Params | Mô tả |
|--------|------|--------|-------|
| `GET` | `/api/QAMessage` | `page`, `pageSize` | Danh sách tất cả messages (paged) |
| `GET` | `/api/QAMessage/{id}` | path: `id` | Chi tiết 1 message |
| `PUT` | `/api/QAMessage/{id}` | path: `id`, body: `QAMessageDto` | Update message (full DTO) |
| `PUT` | `/api/QAMessage/flagged` | query: `id` | Flag message |
| `PUT` | `/api/QAMessage/unflagged` | query: `id` | Unflag message |
| `DELETE` | `/api/QAMessage/{id}` | path: `id` | Xóa message |
| `GET` | `/api/QAMessage/get-by-conversation` | query: `conversationId` | Messages theo conversation |

**`QAMessageDto` fields (chính xác từ Swagger):**
```
id: uuid
conversationId: uuid
role: int32               ← 0 = user, 1 = assistant (ước đoán)
content: string | null
sourceRecordingIdsJson: string | null
sourceKBEntryIdsJson: string | null
confidenceScore: number | null
flaggedByExpert: boolean
correctedByExpertId: string | null
expertCorrection: string | null
createdAt: datetime
```

**Analytics endpoints:**

| Method | Path | Params | Response DTO |
|--------|------|--------|-------------|
| `GET` | `/api/Analytics/experts` | query: `period` (default `"30d"`) | `ExpertPerformanceDto[]` |
| `GET` | `/api/Analytics/content` | query: `type` (default `"songs"`) | `ContentAnalyticsDto` |

**`ExpertPerformanceDto`:**
```
expertId: string | null
name: string | null
reviews: int32
accuracy: double        ← ĐÂY LÀ NGUỒN CHO "Độ chính xác"
avgTime: string | null
```

**`ContentAnalyticsDto`:**
```
totalSongs: int32
byEthnicity: Record<string, int32> | null
byRegion: Record<string, int32> | null
mostViewedSongs: string[] | null
```

### Hiện trạng `qaMessageService.ts`

```typescript
// Có:
createQAMessage(data)
fetchConversationMessages(conversationId)
flagMessage(messageId)      → PUT /QAMessage/flagged body { id }
unflagMessage(messageId)    → PUT /QAMessage/unflagged body { id }

// THIẾU:
fetchAllMessages(page, pageSize)   → GET /api/QAMessage
getMessageById(id)                 → GET /api/QAMessage/{id}
updateMessage(id, data)            → PUT /api/QAMessage/{id}
```

**Lưu ý contract mismatch:** Swagger ghi `PUT /QAMessage/flagged` nhận `id` qua **query param**, nhưng frontend gửi qua **body**. Cần test thực tế xem backend chấp nhận kiểu nào.

---

## Phase 0 — Socratic Gate (Chốt thiết kế)

| Câu hỏi | Chốt |
|---------|------|
| Flagged count lấy từ đâu? | **API `GET /api/QAMessage` + client-side filter `flaggedByExpert === true`** (vì API không có filter param) |
| Accuracy hiển thị gì? | **Average `accuracy` từ `ExpertPerformanceDto[]`** (đã có endpoint) |
| Expert correction flow? | **Inline form** trong flagged list → `PUT /api/QAMessage/{id}` với `expertCorrection` + `correctedByExpertId` |
| Flagged list UI? | **FlaggedResponseList component** — hiển thị question/answer/flag status/correction |
| Có thay ModerationPage tab AI không? | **Không** — ngoài phạm vi §D. Nhưng sẽ export hàm để tái sử dụng sau (§G) |
| Admin vs Expert? | Admin thấy tất cả flagged messages; Expert thấy flagged messages (từ Chatbot flow) |

---

## Thiết kế tổng thể

```
AdminDashboard → tab "Giám sát hệ thống AI"
┌─────────────────────────────────────────────────────────────────┐
│  Stat cards (3):                                                 │
│  ┌───────────┐ ┌──────────────────┐ ┌──────────────────┐       │
│  │ Độ chính   │ │ Flagged messages  │ │ Cơ sở tri thức   │       │
│  │ xác: 87.5% │ │ count: 12         │ │ count: 45        │       │
│  │ (avg from  │ │ (from API)        │ │ (already real)   │       │
│  │  experts)  │ │                    │ │                   │       │
│  └───────────┘ └──────────────────┘ └──────────────────┘       │
│                                                                   │
│  Expert Performance Table (NEW):                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Expert       │ Reviews │ Accuracy │ Avg Time              │  │
│  │ Nguyễn Văn A │ 24      │ 92.1%    │ 2h 15m                │  │
│  │ Trần Thị B   │ 18      │ 85.3%    │ 3h 30m                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Flagged Responses (NEW):                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ [flagged badge] 2026-04-09 14:30                           │  │
│  │ Q: "Đàn bầu có bao nhiêu dây?"                            │  │
│  │ A: "Đàn bầu thường có 2 dây." (SAI — thực tế 1 dây)      │  │
│  │ [Thêm bản sửa chuyên gia] [Bỏ cờ]                        │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Bản sửa: "Đàn bầu chỉ có 1 dây."         [Lưu]    │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  KB management buttons (already exist — keep as is)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Types + Service Layer

### 1.1 Thêm vào `src/services/qaMessageService.ts`

```typescript
// Thêm các hàm mới (không thay đổi hàm cũ):

fetchAllMessages(page, pageSize):
  → api.get('/QAMessage', { params: { page, pageSize } })
  → return { data: QAMessageRequest[], total, page, pageSize }

getMessageById(id):
  → api.get(`/QAMessage/${id}`)

updateMessage(id, data: Partial<QAMessageRequest>):
  → api.put(`/QAMessage/${id}`, data)
```

### 1.2 Thêm vào `src/services/analyticsApi.ts`

```typescript
// Thêm hàm mới:

getExperts(period = '30d'):
  → api.get('/Analytics/experts', { params: { period } })
  → return ExpertPerformanceDto[]

getContent(type = 'songs'):
  → api.get('/Analytics/content', { params: { type } })
  → return ContentAnalyticsDto
```

### 1.3 Thêm types vào `src/types/`

Có thể thêm vào `analyticsApi.ts` (đã có `AnalyticsOverview`, `CoverageRow`, `ContributorRow`):

```typescript
export type ExpertPerformanceDto = {
  expertId?: string | null;
  name?: string | null;
  reviews: number;
  accuracy: number;          // 0..100 hoặc 0..1 — cần kiểm tra backend
  avgTime?: string | null;
};

export type ContentAnalyticsDto = {
  totalSongs: number;
  byEthnicity?: Record<string, number> | null;
  byRegion?: Record<string, number> | null;
  mostViewedSongs?: string[] | null;
};
```

### Files thay đổi Phase 1:
| File | Thay đổi |
|------|----------|
| `src/services/qaMessageService.ts` | Thêm `fetchAllMessages`, `getMessageById`, `updateMessage` |
| `src/services/analyticsApi.ts` | Thêm `getExperts()`, `getContent()`; thêm DTOs |

---

## Phase 2 — FlaggedResponseList Component

### 2.1 Tạo `src/components/features/ai/FlaggedResponseList.tsx`

**Props:**
```typescript
interface FlaggedResponseListProps {
  className?: string;
}
```

**Internal state & logic:**
- Load all messages: `fetchAllMessages(1, 500)` → client-side filter `flaggedByExpert === true`
- `loading`, `error`, `flaggedMessages`
- Sort by `createdAt` descending (newest first)
- Per item:
  - Display: `content` (Q+A split by `role`), `createdAt`, flag badge
  - Actions:
    - **Bỏ cờ** → `unflagMessage(id)` → reload
    - **Thêm bản sửa** → inline textarea → `updateMessage(id, { expertCorrection, correctedByExpertId })` → reload
  - If `expertCorrection` exists → show it with green highlight

**Layout per item:**
```
┌────────────────────────────────────────────────────────┐
│ [flagged badge] [datetime]                              │
│ Role: assistant                                         │
│ Nội dung: "Đàn bầu thường có 2 dây..."                │
│ Confidence: 0.72                                        │
│ [Bản sửa: "..."] ← nếu có expertCorrection             │
│                                                         │
│ [Thêm/Sửa bản sửa chuyên gia] [Bỏ cờ]                │
│ ┌──────────────────────────────────────────────┐       │
│ │ textarea: nhập bản sửa         [Lưu] [Hủy] │       │
│ └──────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────┘
```

### Files thay đổi Phase 2:
| File | Thay đổi |
|------|----------|
| `src/components/features/ai/FlaggedResponseList.tsx` | **Mới** |

---

## Phase 3 — Tích hợp AdminDashboard

### 3.1 Thay placeholder → real data

**Stat card "Độ chính xác":**
- Gọi `analyticsApi.getExperts()` trong `load()`
- Tính average accuracy: `experts.reduce((s,e) => s + e.accuracy, 0) / experts.length`
- Hiển thị `XX.X%` thay vì `—`
- Nếu API trả lỗi / mảng rỗng → fallback `—`

**Stat card "Câu trả lời bị cắm cờ":**
- Gọi `fetchAllMessages(1, 500)` trong `load()` hoặc khi tab `aiMonitoring` active
- Client-side filter `flaggedByExpert === true`
- Hiển thị `.length` thay vì localStorage count
- Bỏ hoàn toàn đọc `getItem('ai_flagged_responses')`

**Section "Xử lý cảnh báo AI":**
- Thay static text → mount `<FlaggedResponseList />`

**Expert Performance Table (mới):**
- Render bảng từ `getExperts()` data
- Cột: Expert name, Reviews, Accuracy (%), Avg Time
- Sort mặc định theo `reviews` descending

### 3.2 Giữ nguyên

- KB count (`remoteKbCount`) — đã real ✓
- KB management buttons — đã có ✓

### Files thay đổi Phase 3:
| File | Thay đổi |
|------|----------|
| `src/pages/admin/AdminDashboard.tsx` | Thay placeholder stat cards + mount FlaggedResponseList + expert table |

---

## Phase X — Verification Checklist

| # | Kiểm tra | Type |
|---|----------|------|
| 1 | `npm run lint` passes | Auto |
| 2 | `npm run build` passes | Auto |
| 3 | `npm run test:unit` passes | Auto |
| 4 | `fetchAllMessages` trả về danh sách đúng shape (Network tab) | Manual |
| 5 | Flagged count hiển thị số thực từ API (không phải 0 cố định) | Manual |
| 6 | Accuracy hiển thị average từ `getExperts()` | Manual |
| 7 | Expert performance table render đúng cột | Manual |
| 8 | FlaggedResponseList hiển thị danh sách flagged messages | Manual |
| 9 | Bỏ cờ (unflag) → message biến mất khỏi list | Manual |
| 10 | Thêm expert correction → lưu qua API → hiển thị trong list | Manual |
| 11 | Không còn đọc `getItem('ai_flagged_responses')` trong AdminDashboard | Code review |
| 12 | KB count vẫn hoạt động (regression) | Manual |

### Kết quả Phase X (2026-04-10)

**Automated checks**
- ✅ `npm run lint` — PASS
- ✅ `npm run build` — PASS
- ✅ `npm run test:unit` — PASS (`12/12` files, `38/38` tests)

**Code review checks**
- ✅ Item #11 PASS: `AdminDashboard.tsx` không còn tham chiếu `ai_flagged_responses`.
- ✅ Stat card và bảng AI đã nối dữ liệu thật qua `getExperts()` và `fetchAllMessages()`.
- ✅ Section "Xử lý cảnh báo AI" đã mount `FlaggedResponseList`.

**Pending manual runtime checks**
- ⏳ Item #4: xác nhận shape dữ liệu `fetchAllMessages` trên môi trường backend thật (Network tab).
- ⏳ Item #5: xác nhận flagged count phản ánh dữ liệu thật (không cố định).
- ⏳ Item #6: xác nhận accuracy hiển thị đúng theo dữ liệu `getExperts()`.
- ⏳ Item #7: xác nhận bảng expert performance render đúng trên nhiều bộ dữ liệu.
- ⏳ Item #8: xác nhận `FlaggedResponseList` hiển thị đúng danh sách flagged.
- ⏳ Item #9: xác nhận thao tác unflag làm item biến mất khỏi list.
- ⏳ Item #10: xác nhận lưu expert correction qua API và hiển thị lại sau reload.
- ⏳ Item #12: regression check KB count ở tab AI.

---

## File Delivery Summary

| File | Loại | Phase |
|------|------|-------|
| `src/services/qaMessageService.ts` | Sửa | Phase 1 |
| `src/services/analyticsApi.ts` | Sửa | Phase 1 |
| `src/components/features/ai/FlaggedResponseList.tsx` | **Mới** | Phase 2 |
| `src/pages/admin/AdminDashboard.tsx` | Sửa | Phase 3 |

**Ước tính effort:** ~3–4 giờ
**Phụ thuộc backend:** API có sẵn ✓ — `GET /api/QAMessage`, `PUT /api/QAMessage/{id}`, `GET /api/Analytics/experts`.
**Lưu ý:** Swagger ghi flag endpoint nhận `id` qua query param, nhưng frontend hiện gửi body — cần test thực tế. Nếu không khớp, sửa `flagMessage`/`unflagMessage` trong Phase 1.
