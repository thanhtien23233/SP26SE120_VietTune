# PLAN: §G — QA Message Flagging → AI Retraining Pipeline

**Slug:** `qa-flag-retrain`
**Ngày tạo:** 2026-04-15
**Nguồn:** `PLAN-feature-gaps.md` §G + phân tích code hiện tại
**Phạm vi:** Chỉ kế hoạch — không bao gồm triển khai code.

---

## Phase -1 — Context Check

### Vấn đề cốt lõi

Hiện tại hệ thống flag phản hồi AI hoạt động **3 luồng tách rời**:

| Luồng | Nơi dùng | Cơ chế | Trạng thái |
|-------|----------|--------|------------|
| **API** (`qaMessageService`) | ChatbotPage, AdminDashboard (`FlaggedResponseList`) | `PUT /QAMessage/flagged\|unflagged`, `PUT /QAMessage/{id}` (expertCorrection) | ✅ Đúng — nguồn sự thật duy nhất |
| **localStorage push** | ResearcherPortalPage → `pushAiResponseForExpertReview` | Ghi vào `AI_RESPONSES_REVIEW_KEY` (localStorage) | ❌ Trùng lặp — message **đã được** lưu qua `createQAMessage` API |
| **localStorage read/write** | ModerationPage tab "Giám sát AI" (`ModerationAITab`) | `getItemAsync(AI_RESPONSES_REVIEW_KEY)` → render + flag/unflag ghi lại localStorage | ❌ Hoàn toàn offline — không sync với backend |

### Hậu quả
- Expert flag trên ModerationPage → **chỉ lưu localStorage** → Admin không thấy trên `FlaggedResponseList`
- Researcher push AI response → lưu **cả** API (qua `createQAMessage`) **và** localStorage (qua `pushAiResponseForExpertReview`) → **duplicate**
- Admin thấy flagged count chính xác (từ API), nhưng Expert thấy danh sách khác (từ localStorage)
- Không có correction flow thống nhất giữa Expert và Admin

### Mục tiêu
1. **Một nguồn sự thật duy nhất:** tất cả flag/unflag/correction đều qua API `/QAMessage`
2. **Xóa hoàn toàn localStorage** cho flag flow
3. **Expert có thể flag + sửa** trên ModerationPage (dùng API giống `FlaggedResponseList`)
4. **Researcher không cần push riêng** — message đã có trong DB qua `createQAMessage`
5. **Admin vẫn hoạt động** — `FlaggedResponseList` giữ nguyên (đã dùng API)

---

## Phase 0 — Swagger API Đã Có

### Endpoints QAMessage (đã xác nhận từ `qaMessageService.ts`)

| Method | Endpoint | Mô tả | Dùng ở |
|--------|----------|-------|--------|
| `POST` | `/QAMessage` | Tạo message (user/bot) | ChatbotPage, ResearcherPortalPage |
| `GET` | `/QAMessage?page=&pageSize=` | Lấy tất cả messages (phân trang) | `FlaggedResponseList` (filter flagged client-side) |
| `GET` | `/QAMessage/get-by-conversation?conversationId=` | Lấy messages theo conversation | ChatbotPage |
| `GET` | `/QAMessage/{id}` | Lấy chi tiết 1 message | (chưa dùng) |
| `PUT` | `/QAMessage/{id}` | Cập nhật message (full body, dùng cho `expertCorrection`) | `FlaggedResponseList` |
| `PUT` | `/QAMessage/flagged` | Flag message — body: `{ id }` | ChatbotPage |
| `PUT` | `/QAMessage/unflagged` | Unflag message — body: `{ id }` | ChatbotPage, `FlaggedResponseList` |

### DTO: `QAMessageRequest`

```
{
  id: string;
  conversationId: string;
  role: number;                    // 0=User, 1=Assistant
  content: string;
  sourceRecordingIdsJson?: string;
  sourceKBEntryIdsJson?: string;
  confidenceScore?: number;
  flaggedByExpert?: boolean;
  correctedByExpertId?: string;
  expertCorrection?: string;
  createdAt: string;
}
```

### Kết luận API
- **Đủ endpoint** cho full CRUD + flag/unflag + correction
- **Không cần API mới** — chỉ cần FE dùng đúng các endpoint đã có
- `FlaggedResponseList` đã implement đầy đủ pattern chuẩn → **tái sử dụng** cho ModerationPage

---

## Phase 1 — Xóa localStorage push từ ResearcherPortalPage

### Mô tả
ResearcherPortalPage hiện gọi **cả** `createQAMessage` (API) **và** `pushAiResponseForExpertReview` (localStorage). Vì message đã có trong DB qua `createQAMessage`, luồng localStorage là **thừa**.

### Thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/researcher/ResearcherPortalPage.tsx` | Xóa hàm `pushAiResponseForExpertReview`; xóa lời gọi `void pushAiResponseForExpertReview(...)` sau `createQAMessage`; xóa import `AI_RESPONSES_REVIEW_KEY` từ ModerationPage; xóa import `getItemAsync`, `setItem` nếu không còn dùng |

### Chi tiết kỹ thuật
- Dòng ~253–275: xóa toàn bộ `pushAiResponseForExpertReview` callback
- Dòng ~313: xóa `void pushAiResponseForExpertReview(text, content, citations);`
- Import cleanup: `AI_RESPONSES_REVIEW_KEY`, `getItemAsync`, `setItem`

### Rủi ro: Thấp
- Message vẫn lưu đúng qua `createQAMessage` → dữ liệu không mất
- Expert sẽ thấy messages qua API (sau Phase 2) thay vì localStorage

### Effort: ~15 phút

---

## Phase 2 — Chuyển ModerationPage tab AI sang API

### Mô tả
Tab "Giám sát phản hồi AI" trên ModerationPage hiện đọc/ghi **hoàn toàn từ localStorage**. Cần chuyển sang dùng API (`fetchAllMessages` + filter `role === 1` cho assistant responses, hoặc filter `flaggedByExpert` tùy UX).

### Phương án A — Tái sử dụng `FlaggedResponseList` (khuyến nghị)

Mount `FlaggedResponseList` vào `ModerationAITab` giống cách `AdminDashboard` đã làm. Component này đã có đầy đủ:
- Load flagged messages từ API
- Unflag button
- Expert correction form (edit + save)
- Loading/error/empty states
- Refresh button

**Ưu điểm:** Zero-duplicate code, UX nhất quán Admin ↔ Expert, đã test
**Nhược điểm:** Expert thấy **chỉ flagged messages** (không thấy unflagged để flag mới)

### Phương án B — Mở rộng ModerationAITab load từ API

Load **tất cả** assistant messages (role=1) từ API, cho Expert duyệt và flag/unflag trực tiếp.

**Ưu điểm:** Expert có thể flag message mới (không phải chỉ thấy đã flagged)
**Nhược điểm:** Cần viết thêm code, nhiều messages = cần pagination

### Phương án C (đề xuất) — Kết hợp A + B

ModerationAITab hiển thị **2 section**:
1. **"Đã cắm cờ"** → mount `FlaggedResponseList` (reuse nguyên xi)
2. **"Tất cả phản hồi AI"** → load `fetchAllMessages` + filter role=1 + hiển thị danh sách compact với nút flag

### Thay đổi (theo Phương án C)

| File | Thay đổi |
|------|----------|
| `src/components/features/moderation/ModerationAITab.tsx` | Rewrite: import `FlaggedResponseList`; thêm section load all assistant messages từ API; flag/unflag qua `qaMessageService`; xóa dependency vào localStorage props |
| `src/pages/ModerationPage.tsx` | Xóa state `aiResponses`, `aiResponsesLoaded`, `flagNoteId`, `flagNoteValue`; xóa `handleFlagAiResponse`; xóa useEffect load localStorage (dòng ~211–232); đơn giản hóa props truyền vào `ModerationAITab` |
| `src/pages/ModerationPage.tsx` | Xóa export `AI_RESPONSES_REVIEW_KEY` + interface `AiResponseForReview` (sau khi Phase 1 đã xóa import từ ResearcherPortalPage) |

### Chi tiết ModerationAITab mới

```
ModerationAITab
├── Section 1: "Phản hồi đã cắm cờ"
│   └── <FlaggedResponseList />  (reuse — load flagged từ API, unflag, correction)
│
├── Section 2: "Tất cả phản hồi AI" (collapsible)
│   ├── Load fetchAllMessages(page, pageSize) → filter role === 1
│   ├── Pagination (reuse Pagination component)
│   ├── Mỗi item: content, createdAt, confidenceScore, nút "Cắm cờ"
│   └── Flag → gọi flagMessage(id) → refresh cả 2 sections
```

### Rủi ro: Trung bình
- Cần test cả 2 sections refresh đồng bộ sau flag/unflag
- Pagination cho "Tất cả phản hồi AI" cần test với dataset lớn

### Effort: ~2–3 giờ

---

## Phase 3 — Expert Correction Flow thống nhất

### Mô tả
`FlaggedResponseList` đã có correction flow (edit `expertCorrection` + save via `updateMessage`). Khi Phase 2 mount nó vào ModerationPage, Expert tự động có khả năng:
- Xem danh sách flagged
- Thêm/sửa `expertCorrection`
- Unflag nếu sai cờ

### Cần bổ sung (nếu chưa có)

| Tính năng | Hiện trạng | Cần làm |
|-----------|-----------|---------|
| `correctedByExpertId` tự điền | `FlaggedResponseList` truyền `item.correctedByExpertId ?? null` → **không tự set user hiện tại** | Truyền `currentUserId` từ `useAuthStore`, set `correctedByExpertId` khi save correction |
| Filter theo conversation | Không có | Tùy chọn — thêm dropdown filter `conversationId` nếu UX cần |
| Sort options | Sort theo `createdAt` desc | Tùy chọn — thêm sort toggle |

### Thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/features/ai/FlaggedResponseList.tsx` | Thêm optional prop `currentUserId?: string`; khi save correction, set `correctedByExpertId: currentUserId ?? item.correctedByExpertId` |
| `src/pages/admin/AdminDashboard.tsx` | Truyền `currentUserId={user?.id}` vào `FlaggedResponseList` |
| (ModerationAITab đã truyền qua Phase 2) | — |

### Effort: ~30 phút

---

## Phase 4 — Cleanup localStorage + Dead Code

### Mô tả
Sau Phase 1 + 2, không còn ai đọc/ghi `AI_RESPONSES_REVIEW_KEY`. Xóa sạch.

### Thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/ModerationPage.tsx` | Xóa `export const AI_RESPONSES_REVIEW_KEY`; xóa `export interface AiResponseForReview`; xóa import `getItemAsync`, `setItem` (nếu không dùng cho việc khác); xóa tất cả state/effect/callback liên quan |
| `src/pages/researcher/ResearcherPortalPage.tsx` | (Đã xóa ở Phase 1) — verify import cleanup |
| `src/components/features/moderation/ModerationAITab.tsx` | Xóa interface `AiResponseForReviewItem` cũ (đã thay bằng `QAMessageRequest`) |

### Kiểm tra grep
```bash
rg "AI_RESPONSES_REVIEW_KEY" src/
rg "AiResponseForReview" src/
rg "pushAiResponseForExpertReview" src/
```
→ Tất cả phải trả về **0 kết quả** sau cleanup.

### Effort: ~15 phút

---

## Phase 5 — Retrain Trigger (Tùy chọn — phụ thuộc Backend)

### Mô tả
Hiện `AdminDashboard` đã có section "Cập nhật dữ liệu AI (cơ sở tri thức)" link sang Knowledge Base management. Nhưng **chưa có** nút "Gửi bản sửa cho huấn luyện lại" từ flagged list → trigger retrain.

### Điều kiện
- **Backend cần cung cấp** endpoint trigger retrain (ví dụ: `POST /api/AI/retrain` hoặc `POST /api/KnowledgeBase/retrain`)
- Hiện **không có** endpoint này trong code FE — grep `retrain` trả về 0 kết quả

### Kế hoạch (khi Backend sẵn sàng)

| File | Thay đổi |
|------|----------|
| `src/services/qaMessageService.ts` hoặc `src/services/knowledgeBaseApi.ts` | Thêm `triggerRetrain()` → `POST /api/AI/retrain` (hoặc endpoint tương đương) |
| `src/components/features/ai/FlaggedResponseList.tsx` | Thêm nút "Gửi bản sửa cho huấn luyện" ở cuối danh sách flagged (chỉ hiện khi có ≥1 item có `expertCorrection`); gọi `triggerRetrain`; hiển thị toast kết quả |
| `src/pages/admin/AdminDashboard.tsx` | Tùy chọn: thêm section "Trạng thái huấn luyện gần nhất" nếu backend trả về training status |

### Effort: ~1–2 giờ (khi backend sẵn sàng)
### Trạng thái: ⏳ Chờ backend

---

## Tổng hợp Files Cần Thay Đổi

| File | Phase | Loại thay đổi |
|------|-------|---------------|
| `src/pages/researcher/ResearcherPortalPage.tsx` | 1 | Xóa `pushAiResponseForExpertReview`, xóa import localStorage |
| `src/components/features/moderation/ModerationAITab.tsx` | 2 | **Rewrite** — mount `FlaggedResponseList` + load all assistant messages từ API |
| `src/pages/ModerationPage.tsx` | 2, 4 | Xóa state/effect/callback localStorage; xóa `AI_RESPONSES_REVIEW_KEY`; đơn giản hóa props |
| `src/components/features/ai/FlaggedResponseList.tsx` | 3 | Thêm `currentUserId` prop → set `correctedByExpertId` |
| `src/pages/admin/AdminDashboard.tsx` | 3 | Truyền `currentUserId` vào `FlaggedResponseList` |
| `src/services/qaMessageService.ts` | 5 (tùy chọn) | Thêm `triggerRetrain()` (khi BE sẵn sàng) |

---

## Agent Assignment

| Phase | Agent | Model | Ghi chú |
|-------|-------|-------|---------|
| 1 | Code Agent | Fast | Xóa code đơn giản |
| 2 | Code Agent | Default | Rewrite component phức tạp nhất |
| 3 | Code Agent | Fast | Thêm 1 prop + truyền |
| 4 | Code Agent | Fast | Grep + cleanup |
| 5 | Code Agent + Backend | — | Chờ API |

---

## Phase X — Verification Checklist

| # | Kiểm tra | Type | Phase |
|---|----------|------|-------|
| 1 | `npm run lint` passes | Auto | 1–4 |
| 2 | `npm run build` passes | Auto | 1–4 |
| 3 | `npm run test:unit` passes | Auto | 1–4 |
| 4 | `rg "AI_RESPONSES_REVIEW_KEY" src/` → 0 results | Auto | 4 |
| 5 | `rg "pushAiResponseForExpertReview" src/` → 0 results | Auto | 4 |
| 6 | `rg "AiResponseForReview" src/` → 0 results | Auto | 4 |
| 7 | ChatbotPage: flag/unflag message → status thay đổi trên cả ChatbotPage + ModerationPage + AdminDashboard | Manual | 2 |
| 8 | ModerationPage tab AI: danh sách flagged load từ API (không localStorage) | Manual | 2 |
| 9 | ModerationPage tab AI: section "Tất cả phản hồi AI" hiện assistant messages, flag → chuyển sang section flagged | Manual | 2 |
| 10 | ModerationPage tab AI: expert correction form save → `correctedByExpertId` = current user | Manual | 3 |
| 11 | AdminDashboard `FlaggedResponseList`: correction save → `correctedByExpertId` = current admin | Manual | 3 |
| 12 | ResearcherPortalPage: gửi câu hỏi QA → message lưu DB (qua `createQAMessage`) → hiện trên ModerationPage qua API | Manual | 1 |
| 13 | Không còn ghi/đọc `viettune_ai_responses_review` trong localStorage (DevTools > Application > Local Storage) | Manual | 4 |

---

## Effort Tổng Hợp

| Phase | Effort | Phụ thuộc |
|-------|--------|-----------|
| Phase 1 | ~15 phút | Không |
| Phase 2 | ~2–3 giờ | Phase 1 |
| Phase 3 | ~30 phút | Phase 2 |
| Phase 4 | ~15 phút | Phase 1 + 2 |
| Phase 5 | ~1–2 giờ | Backend API |
| **Tổng (Phase 1–4)** | **~3–4 giờ** | — |

---

## Recommended Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → lint/build/test → Phase X manual
                                                         ↓
                                              Phase 5 (khi BE sẵn sàng)
```

Phase 1 và Phase 4 có thể gộp chung commit nếu làm liên tục. Phase 2 là phase lớn nhất, nên tách commit riêng.
