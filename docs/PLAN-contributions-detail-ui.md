# PLAN — Contributions Detail Modal UI/UX Refactor

**File mục tiêu duy nhất:** `src/pages/ContributionsPage.tsx`  
**Phiên bản hiện tại:** 1 147 dòng  
**Ngày lập:** 2026-04-10

---

## Context Check

### Trạng thái hiện tại của modal `detailSubmission`

| Vùng | Dòng | Hiện trạng |
|---|---|---|
| Header bar | 882–900 | Text cứng `"Chi tiết đóng góp"` + nút ✕ |
| Status banner | 912–920 | `renderStatusBadge` + `renderStageBadge` inline |
| Media Player | 922–964 | `<div className="mb-2">` không có nhãn/border |
| Thông tin đóng góp | 966–974 | 3 trường flat, không icon |
| Metadata bản thu | 976–1037 | ~14 trường flat, 1 nhóm duy nhất |
| Instrument tags | 988–1007 | Span đơn giản, không icon |
| Footer buttons | 1049–1127 | Text thuần, kích thước không đồng nhất |
| `renderDetailField` | 587–603 | Nhận `(label, value)` – không hỗ trợ icon |

### Icons hiện đã import (dòng 2–15)
`LogIn, ChevronLeft, ChevronRight, Clock, FileAudio, AlertCircle, X, Music, User, Loader2, Trash2, ListFilter`

### Icons cần thêm mới
`Calendar, RefreshCw, StickyNote, Edit3, Send, Headphones, CheckCircle2, CircleDot, MapPin, Mic2, FileText, Settings2`

---

## Yêu cầu từ người dùng (8 cải tiến)

| # | Cải tiến | Mô tả |
|---|---|---|
| 1 | **Hero Header** | Title bản thu + performer + badges nổi bật thay vì text "Chi tiết đóng góp" |
| 2 | **Progress Stepper** | Visual timeline 4 bước kiểm duyệt khi `status === 1` |
| 3 | **Media Player** | Section riêng với gradient border, label + icon |
| 4 | **Thông tin đóng góp** | Grid 2 cột + icon cho mỗi field (`Calendar`, `RefreshCw`, `StickyNote`) |
| 5 | **Metadata bản thu** | Phân 3 nhóm (Cơ bản / Kỹ thuật / Nội dung) + icons + grid 2 cột |
| 6 | **Instrument Tags** | Icon `Music`, hover effect |
| 7 | **Footer Actions** | Buttons có icons (`Edit3`, `Send`, `X`), kích thước đồng nhất |
| 8 | **renderDetailField** | Hỗ trợ `icon` prop tuỳ chọn |

---

## Phase 1 — Nâng cấp `renderDetailField` với icon prop

**Mục tiêu:** Là nền tảng cho tất cả phase còn lại — thêm `icon?: React.ReactNode` vào signature.

### Thay đổi

**`renderDetailField` mới:**
```tsx
const renderDetailField = (
  label: string,
  value: string | number | null | undefined,
  icon?: React.ReactNode,
) => {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (value === 0 && label.toLowerCase().includes('tempo'))
  )
    return null;
  return (
    <div className="flex flex-col py-2.5 border-b border-secondary-100 last:border-0">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        {icon && <span className="text-neutral-400">{icon}</span>}
        {label}
      </span>
      <p className="mt-0.5 text-sm font-medium text-neutral-900 break-words">{String(value)}</p>
    </div>
  );
};
```

**Icons mới cần thêm vào import block:**
```
Calendar, RefreshCw, StickyNote, Edit3, Send, Headphones,
CheckCircle2, CircleDot, MapPin, Mic2, FileText, Settings2
```

**Các call site hiện có:** Tất cả `renderDetailField(label, value)` giữ nguyên — `icon` là optional nên không breaking.

---

## Phase 2 — Hero Header

**Mục tiêu:** Thay header bar tĩnh bằng hero block hiển thị tên bản thu, nghệ sĩ và badges.

### Thay đổi trong header bar (dòng 882–900)

**Trước:**
```tsx
<div className="flex items-center justify-between border-b ... p-4 sm:p-5">
  <h2 ...>Chi tiết đóng góp</h2>
  <button ... aria-label="Đóng chi tiết"><X .../></button>
</div>
```

**Sau** — toàn bộ header bar thay thành hero section 2 phần:
```tsx
<div className="border-b border-secondary-200/60 bg-gradient-to-br from-[#FFFCF5] via-cream-50/80 to-secondary-50/45">
  {/* Top bar: close button */}
  <div className="flex justify-end px-4 pt-3 sm:px-5">
    <button type="button" onClick={closeDetail} aria-label="Đóng chi tiết"
      className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 ...">
      <X className="h-5 w-5" />
    </button>
  </div>

  {/* Hero content */}
  <div className="px-5 pb-4 sm:px-6 sm:pb-5">
    {detailSubmission ? (
      <>
        <h2 id="contributions-detail-title"
          className="text-xl font-bold text-neutral-900 sm:text-2xl leading-snug truncate">
          {detailSubmission.recording?.title || 'Chưa có tiêu đề'}
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-neutral-600">
          <User className="h-4 w-4 shrink-0" />
          {detailSubmission.recording?.performerName || 'Chưa rõ nghệ sĩ'}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {renderStatusBadge(detailSubmission.status)}
          {/* Stage badge chỉ khi status !== 1 (stepper đảm nhận khi = 1) */}
          {detailSubmission.status !== 1 && renderStageBadge(detailSubmission.currentStage)}
        </div>
      </>
    ) : (
      <h2 id="contributions-detail-title" className="text-xl font-bold text-neutral-900">
        Chi tiết đóng góp
      </h2>
    )}
  </div>
</div>
```

**Lưu ý:** Tạo hàm `closeDetail` nhỏ để tránh lặp logic:
```tsx
const closeDetail = () => {
  setDetailSubmission(null);
  setDetailLoading(false);
};
```

---

## Phase 3 — Progress Stepper (khi `status === 1`)

**Mục tiêu:** Thay `renderStageBadge` inline trong status banner bằng stepper 4 bước ngang.

### Vị trí: ngay dưới hero content, trên media player — chỉ render khi `detailSubmission.status === 1`

**Design:**
```
○──●──○──○
Khởi tạo  Sơ bộ  Chuyên sâu  Hoàn thành
```
- Bước đã qua (< currentStage): `CheckCircle2` màu `emerald`
- Bước hiện tại (= currentStage): `CircleDot` màu `primary` + pulse ring
- Bước chưa đến (> currentStage): `Circle` màu `neutral-300`
- Đường kết nối (`<div className="h-0.5 flex-1">`) màu thay đổi theo trạng thái

**Dữ liệu dùng lại:** `MODERATION_LEGEND_STEPS` (đã có ở dòng 127–132) và `STAGE_INFO` (dòng 70–75).

**Implementation:**
```tsx
{detailSubmission.status === 1 && (
  <div className="mb-4 rounded-xl border border-sky-200/60 bg-sky-50/50 p-4">
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sky-700">
      Quy trình kiểm duyệt
    </p>
    <div className="flex items-center">
      {MODERATION_LEGEND_STEPS.map((step, i) => {
        const done = i < detailSubmission.currentStage;
        const active = i === detailSubmission.currentStage;
        return (
          <Fragment key={step}>
            {i > 0 && (
              <div className={cn('h-0.5 flex-1 mx-1 rounded-full',
                done ? 'bg-emerald-400' : 'bg-neutral-200')} />
            )}
            <div className="flex flex-col items-center gap-1 shrink-0">
              {done ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : active ? (
                <div className="relative">
                  <CircleDot className="h-6 w-6 text-primary-600" />
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary-300/60" />
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-neutral-300 bg-white" />
              )}
              <span className={cn(
                'max-w-[68px] text-center text-[10px] font-medium leading-tight',
                active ? 'text-primary-700 font-semibold' : done ? 'text-emerald-700' : 'text-neutral-400'
              )}>
                {step}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  </div>
)}
```

**Import cần thêm:** `Fragment` từ `react`.

---

## Phase 4 — Media Player Section

**Mục tiêu:** Bọc media player trong card có gradient border, label rõ ràng.

### Thay đổi (dòng 922–964)

**Trước:**
```tsx
{detailSubmission.recording && (
  <div className="mb-2">
    {(() => { /* player logic */ })()}
  </div>
)}
```

**Sau:**
```tsx
{detailSubmission.recording && (() => {
  const playerNode = /* toàn bộ logic hiện có giữ nguyên */;
  if (!playerNode) return null;
  return (
    <div className="rounded-xl border border-secondary-300/60 bg-gradient-to-br from-secondary-50/60 to-cream-50/80 p-1 shadow-sm ring-1 ring-secondary-200/40">
      <div className="flex items-center gap-2 px-3 py-2">
        <Headphones className="h-4 w-4 text-secondary-600 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary-700">
          Nghe / Xem bản thu
        </span>
      </div>
      <div className="px-1 pb-1">
        {playerNode}
      </div>
    </div>
  );
})()}
```

---

## Phase 5 — Thông tin đóng góp (grid) + Metadata bản thu (3 nhóm)

### 5A — "Thông tin đóng góp" card

**Mục tiêu:** Grid 2 cột + icon cho mỗi field.

**Trước** (dòng 966–974):
```tsx
<div className="space-y-1 rounded-xl ...">
  <h3>Thông tin đóng góp</h3>
  {renderDetailField('Ngày gửi', ...)}
  {renderDetailField('Cập nhật lần cuối', ...)}
  {renderDetailField('Ghi chú', ...)}
</div>
```

**Sau:**
```tsx
<div className="rounded-xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] to-cream-50/60 p-4">
  <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-900">
    <FileText className="h-4 w-4 text-neutral-500" />
    Thông tin đóng góp
  </h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
    {renderDetailField('Ngày gửi', formatDate(detailSubmission.submittedAt),
      <Calendar className="h-3.5 w-3.5" />)}
    {renderDetailField('Cập nhật lần cuối', formatDate(detailSubmission.updatedAt),
      <RefreshCw className="h-3.5 w-3.5" />)}
    {renderDetailField('Ghi chú', detailSubmission.notes,
      <StickyNote className="h-3.5 w-3.5" />)}
  </div>
</div>
```

### 5B — "Metadata bản thu" card — 3 nhóm

**Mục tiêu:** Phân 3 sub-section với heading phụ, icon, grid 2 cột.

**3 nhóm và trường:**

| Nhóm | Icon group | Trường |
|---|---|---|
| **Cơ bản** | `Music` | Tiêu đề, Nghệ sĩ, Mô tả, Bối cảnh biểu diễn |
| **Kỹ thuật** | `Settings2` | Định dạng, Thời lượng, Kích thước, Ngày ghi âm, Tempo, Khóa nhạc, Tọa độ GPS |
| **Nội dung** | `FileText` | Nhạc cụ (tags), Lời gốc, Lời tiếng Việt |

**Icons cho từng field:**
- Tiêu đề: `Tag` (hoặc `FileText`)
- Nghệ sĩ: `Mic2`
- Mô tả: `AlignLeft` (dùng `StickyNote`)
- Bối cảnh: `Music`
- Định dạng: `Settings2`
- Thời lượng: `Clock` (đã có)
- Kích thước: `FileAudio`
- Ngày ghi âm: `Calendar`
- Tempo, Khóa nhạc: `Settings2`
- Tọa độ GPS: `MapPin`
- Nhạc cụ: `Music`
- Lời gốc/Việt: `FileText`

**Structure:**
```tsx
<div className="rounded-xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] to-cream-50/60 p-4 space-y-5">
  <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
    <FileAudio className="h-4 w-4 text-neutral-500" />
    Metadata bản thu
  </h3>

  {/* Nhóm Cơ bản */}
  <div>
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
      <Music className="h-3 w-3" /> Cơ bản
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
      {renderDetailField('Tiêu đề', rec.title, <Tag className="h-3.5 w-3.5"/>)}
      {renderDetailField('Nghệ sĩ', rec.performerName, <Mic2 className="h-3.5 w-3.5"/>)}
      {renderDetailField('Mô tả', rec.description, <StickyNote className="h-3.5 w-3.5"/>)}
      {renderDetailField('Bối cảnh biểu diễn', formatPerformanceType(rec.performanceContext),
        <Music className="h-3.5 w-3.5"/>)}
    </div>
  </div>

  {/* Nhóm Kỹ thuật */}
  <div>
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
      <Settings2 className="h-3 w-3" /> Kỹ thuật
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
      {renderDetailField('Định dạng', rec.audioFormat, <Settings2 className="h-3.5 w-3.5"/>)}
      {renderDetailField('Thời lượng', formatDuration(rec.durationSeconds), <Clock className="h-3.5 w-3.5"/>)}
      {renderDetailField('Kích thước', formatSize(rec.fileSizeBytes), <FileAudio className="h-3.5 w-3.5"/>)}
      {renderDetailField('Ngày ghi âm', formatDate(rec.recordingDate || null), <Calendar className="h-3.5 w-3.5"/>)}
      {renderDetailField('Tempo', rec.tempo, <Settings2 className="h-3.5 w-3.5"/>)}
      {renderDetailField('Khóa nhạc', rec.keySignature, <Settings2 className="h-3.5 w-3.5"/>)}
      {rec.gpsLatitude != null && rec.gpsLongitude != null &&
        (rec.gpsLatitude !== 0 || rec.gpsLongitude !== 0) &&
        renderDetailField('Tọa độ GPS',
          `${rec.gpsLatitude}, ${rec.gpsLongitude}`, <MapPin className="h-3.5 w-3.5"/>)}
    </div>
  </div>

  {/* Nhóm Nội dung */}
  <div>
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
      <FileText className="h-3 w-3" /> Nội dung
    </p>
    {/* Instrument Tags — Phase 6 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
      {renderDetailField('Lời gốc', rec.lyricsOriginal, <FileText className="h-3.5 w-3.5"/>)}
      {renderDetailField('Lời tiếng Việt', rec.lyricsVietnamese, <FileText className="h-3.5 w-3.5"/>)}
    </div>
  </div>
</div>
```

---

## Phase 6 — Instrument Tags + Footer Buttons

### 6A — Instrument Tags

**Vị trí:** Trong nhóm "Nội dung" của Phase 5B.

**Trước:**
```tsx
<span className="inline-flex items-center rounded-md border border-secondary-200/80 bg-secondary-50/80 px-2.5 py-1 text-xs font-medium text-neutral-800">
  {name}
</span>
```

**Sau:**
```tsx
<span className="group inline-flex items-center gap-1.5 rounded-lg border border-secondary-200/80 bg-secondary-50/80 px-2.5 py-1.5 text-xs font-medium text-neutral-800 transition-all hover:border-secondary-300 hover:bg-secondary-100/90 hover:shadow-sm cursor-default">
  <Music className="h-3 w-3 text-secondary-500 group-hover:text-secondary-700 transition-colors shrink-0" />
  {name}
</span>
```

Section wrapper nhạc cụ cũng thêm icon label:
```tsx
<div className="flex flex-col py-2.5 border-b border-secondary-100 last:border-0">
  <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
    <Music className="h-3.5 w-3.5 text-neutral-400" />
    Nhạc cụ
  </span>
  <div className="mt-2 flex flex-wrap gap-2">...</div>
</div>
```

### 6B — Footer Buttons

**Trước** (dòng 1049–1127):
- `Sửa` — text thuần
- `Yêu cầu chỉnh sửa` — text thuần  
- `Đóng` — text thuần

**Sau** — thêm icons, kích thước đồng nhất `min-w-[120px]`:
```tsx
{/* Sửa — status=0 */}
<button ... onClick={() => handleQuickEdit(detailSubmission)}
  className="... min-w-[120px] inline-flex items-center justify-center gap-2 ...">
  <Edit3 className="h-4 w-4" />
  Sửa bản nháp
</button>

{/* Yêu cầu chỉnh sửa — status=1 */}
<button ... className="... min-w-[140px] inline-flex items-center justify-center gap-2 ...">
  {isRequestingEdit
    ? <><Loader2 className="h-4 w-4 animate-spin" />Đang gửi...</>
    : <><Send className="h-4 w-4" />Yêu cầu chỉnh sửa</>
  }
</button>

{/* Đóng — luôn hiển thị */}
<button ... className="... min-w-[100px] inline-flex items-center justify-center gap-2 ...">
  <X className="h-4 w-4" />
  Đóng
</button>
```

---

## Phase X — Kiểm tra & Xác minh

### Kết quả automated (2026-04-11)

| Lệnh | Kết quả |
|------|---------|
| `npm run lint` | **PASS** (0 errors, 0 warnings) |
| `npm run build` | **PASS** (`tsc` + `vite build`) |
| `npm run test:unit` | **PASS** (12 files, 38 tests) |

**Ghi chú:** Đã sắp lại thứ tự import trong `ExplorePage.tsx` (`@/config/constants` trước `@/constants/exploreFilterOptions`) để ESLint `import/order` pass.

### Checklist tự động

```bash
npm run lint          # PASS
npm run build         # PASS
npm run test:unit     # PASS
```

### Checklist thủ công

- [ ] Hero header hiển thị đúng `title` và `performerName`
- [ ] Badges đúng vị trí (hero, không còn trong body banner)
- [ ] Stepper chỉ xuất hiện khi `status === 1`
- [ ] Stepper highlight đúng `currentStage` (test với stage 0, 1, 2, 3)
- [ ] Media Player card có border gradient, label "Nghe / Xem bản thu"
- [ ] Thông tin đóng góp: grid 2 cột trên màn sm+, icons hiện đúng
- [ ] Metadata 3 nhóm riêng biệt có heading phụ
- [ ] Nhạc cụ tags có icon Music, hover effect hoạt động
- [ ] Footer: 3 button có icons, `min-w` đồng nhất
- [ ] `renderDetailField` với icon hiển thị icon nhỏ trước label
- [ ] Khi `detailLoading`, hero chỉ hiện "Chi tiết đóng góp"
- [ ] Khi không có recording, không crash
- [ ] `closeDetail` gọi đúng ở header close, footer close, backdrop click
- [ ] Modal animation vẫn mượt (`fadeIn`, `slideUp`)

**Trạng thái:** Phases 1–6 đã implement trong code; các mục trên còn lại cho QA trên trình duyệt thật.

---

## Tóm tắt file thay đổi

| File | Loại |
|---|---|
| `src/pages/ContributionsPage.tsx` | Modify (chính — UI modal chi tiết) |
| `src/pages/ExplorePage.tsx` | Modify (Phase X: sắp import cho ESLint `import/order`) |

## Tóm tắt phụ thuộc mới

| Thứ gì | Nguồn | Ghi chú |
|---|---|---|
| `Calendar, RefreshCw, StickyNote, Edit3, Send, Headphones, CheckCircle2, CircleDot, MapPin, Mic2, Settings2, Tag` | `lucide-react` | Chỉ thêm import, không install gói mới (bản implement không dùng `AlignLeft`) |
| `Fragment` | `react` | Dùng cho stepper — thêm vào destructure `import { ..., Fragment }` |

## Effort ước tính

| Phase | Ước tính |
|---|---|
| Phase 1 (renderDetailField) | 10 phút |
| Phase 2 (Hero Header) | 20 phút |
| Phase 3 (Progress Stepper) | 25 phút |
| Phase 4 (Media Player card) | 15 phút |
| Phase 5 (Info cards redesign) | 30 phút |
| Phase 6 (Tags + Footer) | 15 phút |
| Phase X (Verify) | 10 phút |
| **Tổng** | **~2 giờ** |

**Đồng bộ Phase X (2026-04-11):** `npm run lint`, `npm run build`, `npm run test:unit` đều PASS; `docs/PLAN-contributions-detail-ui.md` đã cập nhật kết quả và checklist.
