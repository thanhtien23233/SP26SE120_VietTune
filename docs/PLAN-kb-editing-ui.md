# PLAN — Refactor KB Editing UI

**Phạm vi:** `src/components/features/kb/` (6 files) + mount points  
**Ngày lập:** 2026-04-11

---

## Context Check

### Files hiện tại

| File | Dòng | Vai trò |
|---|---|---|
| `KnowledgeBasePanel.tsx` | 292 | Shell: screen router (list/create/edit/view) + CRUD handlers |
| `KBEntryList.tsx` | 274 | Bảng danh sách + filter bar + phân trang |
| `KBEntryForm.tsx` | 206 | Form tạo/sửa: title, category, rich text, citations |
| `KBRichTextEditor.tsx` | 283 | Tiptap WYSIWYG (bold/italic/link/list/heading/quote/code) |
| `KBCitationManager.tsx` | 115 | CRUD citations inline (create mode only) |
| `KBRevisionHistory.tsx` | 156 | Timeline phiên bản + modal xem nội dung |

### Mount points

| Nơi dùng | Prop |
|---|---|
| `/admin/knowledge-base` (KnowledgeBasePage) | `<KnowledgeBasePanel listBackTo="/admin" />` |
| `/researcher` tab "Cơ sở tri thức" | `<KnowledgeBasePanel embedded />` |
| `ModerationPage` tab "Kho tri thức" | `<KnowledgeBasePanel embedded />` ← vừa fix |

### Screenshot hiện tại (từ user)

- Bảng table với cột: Tiêu đề, Danh mục, Trạng thái, Cập nhật, Thao tác
- Filter bar có 3 trường: Danh mục, Trạng thái, Tìm kiếm + nút Lọc/Refresh
- Mỗi hàng có: dropdown đổi status inline, nút Xem/Sửa/Xóa
- Phân trang Trước/Sau

### Vấn đề UX hiện tại

1. **Bảng danh sách**: quá functional/admin-like, thiếu visual hierarchy (tất cả các hàng trông giống nhau, không nhấn mạnh gì)
2. **Filter bar**: select `Danh mục` rộng ngang bằng search, chiếm quá nhiều diện tích
3. **Thao tác trên mỗi hàng**: dropdown đổi status + 3 icon buttons đang chật, select "Đã xuất bản" bị truncated
4. **Form tạo/sửa**: form nhìn khá tốt (có Tiptap rich editor), nhưng thiếu preview side-by-side khi edit
5. **View detail**: grid 2/3 + 1/3 với Revision History bên phải — layout khá tốt nhưng thiếu metadata block (createdBy, updatedBy, createdAt)
6. **Header panel**: icon + title + subtitle + buttons — hợp lý, không cần đổi nhiều
7. **Embedded mode**: khi `embedded=true`, panel padding hơi thiếu ranh giới so với parent tab
8. **Citation manager**: chỉ hiện ở create mode; edit mode không cho chỉnh citations

---

## Yêu cầu refactor (đề xuất 8 cải tiến)

| # | Cải tiến | Mô tả |
|---|---|---|
| 1 | **List → Card rows** | Chuyển table thành danh sách card-row responsive; mỗi card hiện title lớn hơn, category badge, status badge, date, 3 action icons ngang hàng |
| 2 | **Filter bar compact** | Filter bar gọn hơn: Category + Status dùng pill-toggle thay select; search giữ Input; nút Lọc/Refresh đều pill |
| 3 | **Inline status change → badge dropdown** | Thay select dropdown status trên mỗi hàng thành badge clickable → small popover/dropdown 3 option |
| 4 | **View detail: metadata sidebar** | Thêm block metadata (Tạo bởi, Cập nhật bởi, Ngày tạo, Ngày cập nhật, Slug) vào cột phải trên revision history |
| 5 | **Edit: side-by-side preview** | Khi edit, chia 2 cột: form bên trái + live preview (rendered HTML) bên phải trên `lg+` |
| 6 | **Create: step indicator** | Form tạo hiện stepper 2 bước: "Thông tin cơ bản" → "Nội dung & Trích dẫn" |
| 7 | **Empty state polish** | Khi list trống, hiện illustration + CTA "Tạo bài viết đầu tiên" |
| 8 | **Embedded boundary** | Khi `embedded=true`, thêm `rounded-2xl border bg-gradient-to-br` wrapper để tách biệt hơn so với parent tab |

---

## Phase 1 — KBEntryList card rows + filter pills

### 1A — Filter bar

**Trước:** 3 select/input ngang hàng + nút Lọc/Refresh  
**Sau:**
- Category: pill-toggle row (`Tất cả | Nhạc cụ | Nghi lễ | Thuật ngữ | Tổng hợp`)
- Status: pill-toggle row (`Tất cả | Bản nháp | Đã xuất bản | Lưu trữ`)
- Search: giữ `Input` component, nhưng thêm icon `Search` inline
- Refresh: icon-only button tách riêng

### 1B — Card rows thay table

**Trước:** `<table>` với 5 cột  
**Sau:** `<ul>` với mỗi `<li>` là card rounded:
```
┌─────────────────────────────────────────────────┐
│ [Title — bold, line-clamp-2]                    │
│ [Category badge]  [Status badge]  [Date]        │
│                               [👁] [✏️] [🗑️]   │
└─────────────────────────────────────────────────┘
```
- Click toàn card → `onView`
- 3 icon buttons: `Eye` (Xem), `Pencil` (Sửa), `Trash2` (Xóa) — hover effect
- Status badge clickable → popover chọn status mới

### 1C — Empty state

Khi `entries.length === 0 && !loading`:
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <BookOpen className="h-16 w-16 text-primary-200 mb-4" />
  <h3 className="text-lg font-semibold text-neutral-800 mb-1">Chưa có bài viết nào</h3>
  <p className="text-sm text-neutral-500 mb-4">Tạo bài viết đầu tiên cho hệ thống AI.</p>
  <Button variant="primary" size="sm" onClick={onCreateFirst}>Tạo bài viết đầu tiên</Button>
</div>
```

**File thay đổi:** `KBEntryList.tsx`  
**Props mới:** `onCreateFirst?: () => void` (truyền từ Panel)

---

## Phase 2 — View detail metadata + sidebar polish

### 2A — Metadata block

Thêm block metadata phía trên `KBRevisionHistory` trong cột phải:
```tsx
<div className="space-y-2 rounded-xl border border-secondary-100 bg-cream-50/60 p-3 mb-4">
  <DetailRow icon={User} label="Tạo bởi" value={focusEntry.createdBy} />
  <DetailRow icon={Calendar} label="Ngày tạo" value={formatDate(focusEntry.createdAt)} />
  <DetailRow icon={RefreshCw} label="Cập nhật bởi" value={focusEntry.updatedBy} />
  <DetailRow icon={Calendar} label="Cập nhật" value={formatDate(focusEntry.updatedAt)} />
  {focusEntry.slug && <DetailRow icon={Link2} label="Slug" value={focusEntry.slug} />}
</div>
```

### 2B — Revision history section heading

Thêm icon `Clock` + heading style đồng nhất với metadata block.

**File thay đổi:** `KnowledgeBasePanel.tsx` (view screen section)

---

## Phase 3 — Edit side-by-side preview

### Thay đổi trong `KnowledgeBasePanel.tsx` (edit screen)

**Trước:** Single-column form  
**Sau:** Grid `lg:grid-cols-2`:
- **Cột trái:** `KBEntryForm` (giữ nguyên)
- **Cột phải:** Live preview card render `dangerouslySetInnerHTML` của `content` state

Cần lift `content` state lên hoặc dùng callback:
- Approach: thêm `onContentChange` callback vào `KBEntryForm` props để parent nhận live HTML

**File thay đổi:**
- `KBEntryForm.tsx` — thêm `onContentChange?: (html: string) => void` prop
- `KnowledgeBasePanel.tsx` — grid layout + preview card khi `screen === 'edit'`

---

## Phase 4 — Create stepper + embedded boundary

### 4A — Create stepper

**Trước:** Single form with all fields  
**Sau:** 2-step flow:
- **Step 1:** Title + Category (compact)
- **Step 2:** Content (rich editor) + Citations

Stepper indicator: horizontal pill bar giống `ContributionsPage` progress stepper nhưng chỉ 2 bước.

**File thay đổi:** `KBEntryForm.tsx` (khi `mode === 'create'`)

### 4B — Embedded boundary

Khi `embedded=true`, `KnowledgeBasePanel` wraps nội dung trong:
```tsx
<div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] to-cream-50/60 p-4 shadow-sm">
  {/* existing content */}
</div>
```

**File thay đổi:** `KnowledgeBasePanel.tsx`

---

## Phase X — Kiểm tra & Xác minh

### Checklist tự động

```bash
npm run lint          # 0 errors/warnings
npm run build         # 0 TypeScript errors
npm run test:unit     # no regression
```

### Checklist thủ công

- [ ] List: card-row layout hiện đúng trên mobile và desktop
- [ ] List: filter pills hoạt động (Category + Status)
- [ ] List: search Enter → lọc
- [ ] List: empty state với CTA "Tạo bài viết đầu tiên"
- [ ] List: click card → view detail
- [ ] List: click Pencil → edit form
- [ ] List: click Trash → confirm dialog
- [ ] List: status badge click → popover chọn status
- [ ] View: metadata block hiện createdBy, updatedBy, dates, slug
- [ ] View: revision history vẫn hoạt động
- [ ] Edit: side-by-side preview trên `lg+`
- [ ] Edit: preview cập nhật live khi gõ
- [ ] Create: stepper 2 bước
- [ ] Create: Next/Back giữa step 1 và step 2
- [ ] Create: submit chỉ ở step 2
- [ ] Embedded: border wrapper hiển thị đúng trong ModerationPage và ResearcherPortal
- [ ] Admin standalone: `/admin/knowledge-base` vẫn hoạt động bình thường

---

## Tóm tắt file thay đổi

| File | Loại | Phase |
|---|---|---|
| `src/components/features/kb/KBEntryList.tsx` | Modify | Phase 1 |
| `src/components/features/kb/KnowledgeBasePanel.tsx` | Modify | Phase 2, 3, 4B |
| `src/components/features/kb/KBEntryForm.tsx` | Modify | Phase 3, 4A |

## Phụ thuộc mới

| Thứ gì | Nguồn | Ghi chú |
|---|---|---|
| `User, Calendar, RefreshCw, Link2, Clock` | `lucide-react` | Chỉ thêm import |
| Không cần cài package mới | — | — |

## Effort ước tính

| Phase | Ước tính |
|---|---|
| Phase 1 (List cards + filters + empty) | 45 phút |
| Phase 2 (View metadata + sidebar) | 20 phút |
| Phase 3 (Edit preview) | 25 phút |
| Phase 4 (Create stepper + embedded) | 30 phút |
| Phase X (Verify) | 10 phút |
| **Tổng** | **~2 giờ 10 phút** |
