# PLAN: Contributor nhấn nút "Chi tiết" → hiển thị chi tiết bài hát

> **Trạng thái:** Draft  
> **Ngày tạo:** 2026-04-20  
> **Yêu cầu gốc:** Contributor nhấn vào button chi tiết và hiện ra chi tiết bài hát

---

## 1. Hiện trạng (As-Is)

| Thành phần | Mô tả |
|---|---|
| `ContributionsPage.tsx` | Trang danh sách đóng góp của contributor. Không có nút "Chi tiết" riêng — click vào **toàn bộ card** → mở modal. |
| `ContributionCard.tsx` | Card hiển thị 1 submission. `onClick → onOpen(sub.id)`. Không có button "Chi tiết" rõ ràng. |
| `ContributionsDetailModal.tsx` | Modal 473 dòng, hiển thị: trạng thái kiểm duyệt, audio/video player, metadata kỹ thuật, instruments, lyrics, version timeline. **Chỉ hiện submission metadata, KHÔNG hiện full recording detail** (vùng miền, dân tộc, mô tả chi tiết, nghệ nhân, nhạc cụ đầy đủ, bản đồ GPS…). |
| `RecordingDetailPage.tsx` | Trang chi tiết bản thu hoàn chỉnh (`/recordings/:id`). Không chặn contributor. Tuy nhiên **không có link/nút nào dẫn contributor từ ContributionsPage sang**. |
| Route | `/contributions` (chỉ list, không có `/contributions/:id`). `/recordings/:id` tồn tại nhưng không được tham chiếu từ flow contributor. |

### Vấn đề chính

1. **Không có nút "Chi tiết" rõ ràng** trên `ContributionCard` — UX không trực quan, click cả card dễ nhầm.
2. **Modal chỉ hiện submission metadata** — thiếu thông tin bài hát chi tiết (vùng miền, dân tộc, mô tả, performers, instruments đầy đủ, GPS, cover image…).
3. **Không kết nối sang RecordingDetailPage** — contributor không có cách xem trang chi tiết đầy đủ cho bản thu đã duyệt.

---

## 2. Giải pháp đề xuất (To-Be)

### Phương án A: Thêm nút "Chi tiết" → Navigate sang `/recordings/:id` (**Khuyến nghị**)

Contributor nhấn nút "Chi tiết" trên card hoặc trong modal → navigate đến `RecordingDetailPage` đã có sẵn, hiển thị đầy đủ thông tin bài hát.

**Ưu điểm:**
- Tái sử dụng `RecordingDetailPage` — không viết lại UI
- `RecordingDetailPage` đã có đầy đủ: audio/video, metadata, instruments, performers, GPS map, annotations, embargo, disputes
- `useRecordingDetail` đã hỗ trợ fallback từ submission nếu recording chưa verify

**Nhược điểm:**
- Contributor rời trang `/contributions` (giải quyết bằng nút Back có sẵn)
- Cần đảm bảo `recordingId` hoặc `submissionId` có thể resolve thành recording

### Phương án B: Mở rộng `ContributionsDetailModal` hiện thêm thông tin bài hát

Giữ modal, thêm section mới hiển thị vùng miền, dân tộc, performers, instruments, GPS…

**Nhược điểm:**
- Trùng lặp logic với `RecordingDetailPage`
- Modal đã 473 dòng, sẽ phình to
- Khó show hết thông tin trong modal nhỏ

### Phương án C: Hybrid — Modal + nút "Xem chi tiết đầy đủ" navigate

Modal hiện tại giữ nguyên + thêm 1 nút ở footer → navigate sang `/recordings/:id`.

---

## 3. Kế hoạch triển khai (Phương án A — Khuyến nghị)

### Phase 1: Thêm nút "Chi tiết" trên `ContributionCard`

**File:** `src/components/features/contributions/ContributionCard.tsx`

| Task | Chi tiết |
|---|---|
| 1.1 | Thêm nút `Chi tiết` riêng biệt (icon `Eye` hoặc `ExternalLink`) bên cạnh nút "Xóa" |
| 1.2 | `onClick` → `navigate(`/recordings/${sub.recordingId || sub.id}`)` |
| 1.3 | `stopPropagation()` để không trigger modal |
| 1.4 | Style giống button outline, variant primary |

### Phase 2: Thêm nút "Xem chi tiết" trong `ContributionsDetailModal` footer

**File:** `src/components/features/contributions/ContributionsDetailModal.tsx`

| Task | Chi tiết |
|---|---|
| 2.1 | Thêm nút "Xem chi tiết bài hát" ở footer modal (bên cạnh Sửa/Đóng) |
| 2.2 | Navigate tới `/recordings/${detailSubmission.recordingId || detailSubmission.id}` |
| 2.3 | Icon `ExternalLink` + text "Xem chi tiết bài hát" |
| 2.4 | Đóng modal trước khi navigate |

### Phase 3: Đảm bảo `RecordingDetailPage` resolve từ submission ID

**File:** `src/hooks/useRecordingDetail.ts`

| Task | Chi tiết |
|---|---|
| 3.1 | Verify fallback `submissionService.getSubmissionById(id)` hoạt động (đã có ở dòng 99-107) |
| 3.2 | Kiểm tra `recordingId` vs `submissionId` — nếu card gửi submissionId thì hook phải resolve |
| 3.3 | Test: mở `/recordings/<submissionId>` → phải hiện được bài hát (dù chưa verify) |

### Phase 4: Truyền `recordingId` đúng từ Submission data

**File:** `src/services/submissionService.ts`, `src/pages/ContributionsPage.tsx`

| Task | Chi tiết |
|---|---|
| 4.1 | Kiểm tra `Submission` type có field `recordingId` không |
| 4.2 | Đảm bảo `mapSubmissionListRowToSubmission` map đúng `recordingId` từ API response |
| 4.3 | Card/modal sử dụng `sub.recordingId || sub.id` để navigate |

---

## 4. Danh sách file liên quan

| File | Thay đổi |
|---|---|
| `src/components/features/contributions/ContributionCard.tsx` | Thêm nút "Chi tiết" |
| `src/components/features/contributions/ContributionsDetailModal.tsx` | Thêm nút "Xem chi tiết bài hát" ở footer |
| `src/components/features/contributions/ContributionsListSection.tsx` | Pass `navigate` hoặc callback mới nếu cần |
| `src/pages/ContributionsPage.tsx` | Thêm handler navigate nếu dùng callback pattern |
| `src/hooks/useRecordingDetail.ts` | Verify submission fallback (có sẵn) |
| `src/services/submissionService.ts` | Kiểm tra `recordingId` field mapping |

---

## 5. UI/UX Mockup (Text)

### ContributionCard (sau khi sửa)
```
┌─────────────────────────────────────────┐
│  🎵 Tên bài hát                        │
│  Nghệ sĩ: Nguyễn Văn A                │
│  Trạng thái: ✅ Đã duyệt               │
│                                         │
│  [👁 Chi tiết]          [🗑 Xóa]       │
└─────────────────────────────────────────┘
```

### ContributionsDetailModal footer (sau khi sửa)
```
┌─────────────────────────────────────────┐
│  [🔗 Xem chi tiết bài hát]  [✏ Sửa]  [✕ Đóng]  │
└─────────────────────────────────────────┘
```

---

## 6. Verification Checklist (Phase X)

- [ ] Contributor click "Chi tiết" trên card → navigate sang `/recordings/:id`
- [ ] Trang RecordingDetailPage hiển thị đúng bài hát (audio, metadata, vùng miền, dân tộc, instruments…)
- [ ] Nút Back trên RecordingDetailPage → quay về `/contributions`
- [ ] Contributor click "Xem chi tiết bài hát" trong modal → navigate đúng
- [ ] Submission chưa verify → `useRecordingDetail` fallback đúng, hiện được dữ liệu
- [ ] Nút "Xóa" trên card vẫn hoạt động bình thường (stopPropagation)
- [ ] Click card vẫn mở modal như cũ
- [ ] Không ảnh hưởng flow Sửa/Cập nhật trong modal
- [ ] TypeScript `tsc --noEmit` pass
- [ ] Không có linter errors
