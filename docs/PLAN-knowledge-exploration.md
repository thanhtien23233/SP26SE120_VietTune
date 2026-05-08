# PLAN: Khám phá Kho Tri thức — Public Knowledge Base Browsing

> **Bổ sung trang duyệt + tìm kiếm Knowledge Base cho người dùng public**
>
> Date: 2026-05-07 · Status: DRAFT

---

## 1. Hiện trạng

### Đã có (KHÔNG đụng vào)

| Chức năng | Vị trí | Trạng thái |
|---|---|---|
| Chatbot AI (Hỏi đáp) | `/chatbot` — `ChatbotPage.tsx` | ✅ Production |
| Chat sidebar lịch sử | `ChatSidebar.tsx` | ✅ Production |
| Chat message + citations | `ChatMessageItem.tsx` | ✅ Production |
| Expert correction + flag | QAMessage API + UI | ✅ Production |
| Knowledge Graph (researcher) | `ResearcherPortalGraphTab.tsx` | ✅ Production |
| KB Admin CRUD | `/admin/knowledge-base` — `KnowledgeBasePanel.tsx` | ✅ Production |
| KB Entry public view (1 bài) | `/kb/entry/:id` — `KbEntryPublicViewPage.tsx` | ✅ Production |
| KB API đầy đủ | `knowledgeBaseApi.ts` — list, search, getById, getBySlug, citations, revisions | ✅ Production |
| KB Search API | `GET /api/Search/knowledge-base` — full-text + category + paging | ✅ Production |

### Thiếu (CẦN XÂY)

**Không có trang public nào để người dùng duyệt và tìm kiếm toàn bộ KB.**

Hiện tại:
- Admin vào `/admin/knowledge-base` → thấy danh sách, CRUD đầy đủ
- User thường **không có entry point** để browse KB
- Chỉ khi chatbot AI trả về `sourceKBEntryIdsJson` → user click link → nhảy sang `/kb/entry/:id` (xem 1 bài rồi quay lại)
- Trên `HomePage.tsx`, card "Tra cứu tri thức" → `/chatbot` — chỉ vào chatbot, không vào kho tri thức

**Kết quả:** User không biết kho tri thức có gì, không thể chủ động duyệt, tìm kiếm, khám phá.

---

## 2. Mục tiêu

Xây **1 trang mới**: `/knowledge-base` — Khám phá Kho Tri thức

Cho phép mọi người dùng (kể cả guest):
1. Duyệt danh sách bài viết KB (chỉ status = Published)
2. Lọc theo danh mục (Nhạc cụ, Nghi lễ, Thuật ngữ, Tổng hợp)
3. Tìm kiếm full-text (sử dụng `GET /api/Search/knowledge-base`)
4. Xem chi tiết bài viết (inline hoặc navigate)
5. Xem citations của bài viết
6. Quay lại chatbot với context ("Hỏi AI về bài này")

---

## 3. Thiết kế trang

### Route

```
/knowledge-base                    → Trang danh sách + tìm kiếm
/knowledge-base/:slug              → (Optional) Deep-link bài viết bằng slug
/kb/entry/:id                      → Giữ nguyên (đã có)
```

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  📖 Khám phá Kho Tri thức                        [← Quay lại] │
│  Tìm hiểu về âm nhạc truyền thống Việt Nam                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🔍 [_____________Tìm kiếm bài viết..._____________] [Tìm]  │
│                                                              │
│  Danh mục: [Tất cả] [Nhạc cụ] [Nghi lễ] [Thuật ngữ] [Tổng hợp] │
│                                                              │
│  Kết quả: 24 bài viết                                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📖 Đàn Bầu — Nhạc cụ dây đơn huyền                    │  │
│  │ Nhạc cụ · Đã xuất bản · 12/04/2026                     │  │
│  │ "Đàn Bầu là nhạc cụ truyền thống đặc trưng của        │  │
│  │  người Kinh, thuộc họ dây gảy, có một dây duy nhất..." │  │
│  │                          [📖 Đọc tiếp] [🤖 Hỏi AI]    │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📖 Hát Then — Nghi lễ dân tộc Tày                      │  │
│  │ Nghi lễ · Đã xuất bản · 08/04/2026                     │  │
│  │ "Hát Then là hình thức diễn xướng tổng hợp, kết hợp   │  │
│  │  hát, đàn, múa trong nghi lễ cúng Then của người Tày." │  │
│  │                          [📖 Đọc tiếp] [🤖 Hỏi AI]    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [← Trước]  Trang 1  [Sau →]                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Trang chi tiết (có 2 lựa chọn)

**Option A — Navigate sang `/kb/entry/:id` (đã có)**
- Ưu: Không cần code mới cho view
- Nhược: Navigates away, phải quay lại

**Option B — Inline detail trong cùng trang (recommended)**
- Click "Đọc tiếp" → hiển thị bài viết + citations bên dưới hoặc thay thế danh sách
- Nút "Quay lại danh sách" để trở về
- Nút "Hỏi AI về bài này" navigate sang `/chatbot` với pre-filled question

**Đề xuất: Option B** — tái sử dụng logic view từ `KnowledgeBasePanel` (screen = 'view') + `KbEntryPublicViewPage`.

---

## 4. Kiến trúc Component

### File mới cần tạo

```
src/
├── pages/
│   └── KnowledgeExplorePage.tsx          # Trang mới: /knowledge-base
│
└── components/features/kb/
    └── KBPublicSearchBar.tsx             # (Optional) Search bar riêng nếu cần
```

### Tái sử dụng component có sẵn

| Component có sẵn | Cách dùng |
|---|---|
| `KBEntryList.tsx` | Dùng với `readOnly={true}`, `fixedStatus={1}` (Published only) |
| `KnowledgeBasePanel.tsx` | Dùng với `readOnly={true}`, `fixedStatus={1}`, `embedded={true}` |
| `KbEntryPublicViewPage.tsx` | Logic view bài viết — tái sử dụng hoặc link đến |
| `knowledgeBaseApi.getEntries()` | Fetch danh sách với filter |
| `knowledgeBaseApi.searchKnowledgeBase()` | Full-text search |
| `knowledgeBaseApi.getEntryById()` | Chi tiết bài viết |
| `knowledgeBaseApi.getCitations()` | Citations của bài viết |

### Chiến lược tái sử dụng

**`KnowledgeBasePanel` đã hỗ trợ `readOnly` + `fixedStatus` props.**

Cách nhanh nhất:

```tsx
// src/pages/KnowledgeExplorePage.tsx
export default function KnowledgeExplorePage() {
  return (
    <KnowledgeBasePanel
      readOnly={true}
      fixedStatus={1}        // Chỉ hiển thị bài "Đã xuất bản"
      embedded={false}
    />
  );
}
```

Tuy nhiên `KnowledgeBasePanel` hiện thiếu:
1. Header phù hợp cho public (đang ghi "Cơ sở tri thức (KB)" + "Tạo, xem, sửa và quản lý...")
2. Excerpt/snippet cho mỗi bài trong danh sách
3. Nút "Hỏi AI về bài này"
4. Search dùng `searchKnowledgeBase()` (semantic search) thay vì filter thường
5. Responsive grid cards thay vì list dọc

→ Cần **enhance** `KnowledgeBasePanel` + `KBEntryList` hoặc **tạo page riêng** reuse logic từ chúng.

---

## 5. Task Breakdown

### Task 1: Tạo trang `KnowledgeExplorePage.tsx` + Route (P0)

**File:** `src/pages/KnowledgeExplorePage.tsx`

**Nội dung:**
- Header: "Khám phá Kho Tri thức" + subtitle
- BackButton
- Search bar (gọi `knowledgeBaseApi.searchKnowledgeBase()`)
- Category filter pills (Tất cả / Nhạc cụ / Nghi lễ / Thuật ngữ / Tổng hợp)
- Danh sách kết quả dạng card
- Pagination
- State: `list` | `view` — khi click bài → hiện chi tiết inline

**Route:** Thêm vào `App.tsx`:
```tsx
const KnowledgeExplorePage = lazy(() => import('./pages/KnowledgeExplorePage'));
// ...
<Route path="knowledge-base" element={<Suspense ...><KnowledgeExplorePage /></Suspense>} />
```

**Effort:** L (Large)

### Task 2: Card bài viết có excerpt + actions (P0)

**Nơi:** Trong `KnowledgeExplorePage.tsx` hoặc component con `KBArticleCard.tsx`

Mỗi card hiển thị:
- Title
- Category badge + date
- Excerpt (cắt 150 ký tự từ `content` — strip HTML)
- Nút "Đọc tiếp" → chuyển sang view detail
- Nút "Hỏi AI" → navigate `/chatbot` với query param `?q=Tìm hiểu về {title}`

**Effort:** M (Medium)

### Task 3: View chi tiết inline + Citations (P1)

**Nơi:** Trong `KnowledgeExplorePage.tsx`

Khi click "Đọc tiếp":
- Hiển thị full content (HTML rendered) — reuse logic từ `KbEntryPublicViewPage`
- Fetch + hiển thị citations (`knowledgeBaseApi.getCitations(entryId)`)
- Nút "Quay lại danh sách"
- Nút "Hỏi AI về bài này"

**Effort:** M (Medium)

### Task 4: Cập nhật HomePage card (P1)

**File:** `src/pages/HomePage.tsx`

Thay đổi card "Tra cứu tri thức":
- **Hiện tại:** `{ icon: BookOpen, title: 'Tra cứu tri thức', subtitle: 'Khám phá kho tri thức', to: '/chatbot' }`
- **Mới:** `{ icon: BookOpen, title: 'Kho Tri thức', subtitle: 'Duyệt và khám phá tri thức', to: '/knowledge-base' }`

Giữ nguyên card "Khám phá bản thu" → `/explore` và chatbot vẫn accessible từ menu/header.

**Effort:** S (Small)

### Task 5: Link "Hỏi AI về bài này" (P2)

Navigate sang `/chatbot?q={encodeURIComponent(title)}`.

Trong `ChatbotPage.tsx`, đọc `searchParams.get('q')` → nếu có, tự động pre-fill input (hoặc auto-send).

**Effort:** S (Small)

### Task 6: Tích hợp semantic search (P2)

Khi user nhập search term:
- Gọi `knowledgeBaseApi.searchKnowledgeBase(q, category, page, pageSize)`
- Trả về `ArticleSearchResult[]` với `{ id, title, excerpt, score }`
- Hiển thị kết quả ranked by score
- Khi không có search term → fallback về `knowledgeBaseApi.getEntries()` (list thường)

**Effort:** M (Medium)

---

## 6. API sử dụng (đã có sẵn, KHÔNG cần backend mới)

| API | Dùng cho | Có sẵn |
|---|---|---|
| `GET /api/kb-entries?Category=&Status=1&Page=&PageSize=` | Danh sách published | ✅ `knowledgeBaseApi.getEntries()` |
| `GET /api/Search/knowledge-base?q=&category=&page=&pageSize=` | Full-text search | ✅ `knowledgeBaseApi.searchKnowledgeBase()` |
| `GET /api/kb-entries/{id}` | Chi tiết bài viết | ✅ `knowledgeBaseApi.getEntryById()` |
| `GET /api/kb-entries/by-slug/{slug}` | Deep-link by slug | ✅ `knowledgeBaseApi.getEntryBySlug()` |
| `GET /api/kb-entries/{entryId}/citations` | Citations | ✅ `knowledgeBaseApi.getCitations()` |

**Không cần thêm endpoint backend nào.**

---

## 7. Luồng người dùng (User Journey)

### Journey 1: Duyệt tri thức

```
HomePage → Click "Kho Tri thức"
  → /knowledge-base
  → Thấy danh sách 20 bài viết published
  → Click "Nhạc cụ" filter → thấy 8 bài về nhạc cụ
  → Click "Đàn Bầu" → xem chi tiết + 3 citations
  → Click "Hỏi AI về bài này" → /chatbot?q=Tìm hiểu về Đàn Bầu
  → Chatbot trả lời với AI context
```

### Journey 2: Tìm kiếm

```
/knowledge-base → Nhập "cồng chiêng tây nguyên"
  → Search API trả về 5 bài ranked by relevance
  → Mỗi bài hiện excerpt + score
  → Click bài đầu → đọc chi tiết
```

### Journey 3: Từ chatbot → KB

```
/chatbot → Hỏi "Hát Then là gì?"
  → AI trả lời + sourceKBEntryIdsJson = ["abc-123"]
  → ChatMessageItem hiện "1 Tài liệu tham khảo" + link
  → Click → /kb/entry/abc-123 (đã có)
  → KbEntryPublicViewPage hiện bài viết + breadcrumb "← VietTune Intelligence"
```

---

## 8. Ưu tiên thực hiện

| # | Task | Priority | Effort | Dependencies |
|---|---|---|---|---|
| 1 | `KnowledgeExplorePage.tsx` + route | P0 | L | Không |
| 2 | Card bài viết với excerpt | P0 | M | Task 1 |
| 3 | View chi tiết inline + citations | P1 | M | Task 1 |
| 4 | Cập nhật HomePage card | P1 | S | Task 1 |
| 5 | Link "Hỏi AI về bài này" | P2 | S | Task 1, 3 |
| 6 | Semantic search integration | P2 | M | Task 1 |

**Tổng effort ước tính:** 1-2 tuần

---

## 9. Constraints

- ✅ KHÔNG đụng backend
- ✅ KHÔNG thay đổi API
- ✅ KHÔNG ảnh hưởng chatbot hiện tại
- ✅ KHÔNG ảnh hưởng admin KB
- ✅ Tái sử dụng `knowledgeBaseApi` 100%
- ✅ Tái sử dụng type `KBEntry`, `ArticleSearchResult`, `KB_CATEGORY_LABELS`
- ✅ Chỉ hiển thị bài status = 1 (Published)
- ✅ ReadOnly — user thường không có quyền CRUD

---

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| KB chưa có bài published nào | Empty state | Hiển thị UI "Chưa có bài viết nào" + gợi ý dùng chatbot |
| Search API chậm | UX lag | Loading state + debounce input 300ms |
| Content HTML injection | Security | `dangerouslySetInnerHTML` đã dùng trong `KbEntryPublicViewPage` — giữ nguyên, sanitize nếu cần |
| Excerpt cắt giữa HTML tag | Broken rendering | Strip HTML trước khi cắt text |

---

## Phase X: Verification

- [ ] Route `/knowledge-base` accessible cho mọi user (kể cả guest)
- [ ] Chỉ hiển thị bài status = Published
- [ ] Filter theo category hoạt động
- [ ] Search trả về kết quả đúng
- [ ] Click bài → xem chi tiết + citations
- [ ] "Hỏi AI" navigate sang chatbot đúng
- [ ] HomePage card trỏ đúng route mới
- [ ] Mobile responsive
- [ ] Lint: `npx eslint "src/**/*.{ts,tsx}" --max-warnings=0`
- [ ] Types: `npx tsc --noEmit`
- [ ] Build: `npm run build`
