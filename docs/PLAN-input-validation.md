# PLAN: Input Validation từ người dùng

**Slug:** `input-validation`
**Ngày tạo:** 2026-04-19
**Phạm vi:** Frontend only — chuẩn hóa validation toàn bộ form, textarea và file input.

---

## Context Check (Phase -1)

### Hiện trạng

| Công cụ | Nơi dùng |
|---------|----------|
| `react-hook-form` | Auth forms (login, register, OTP) |
| Validator thuần (pure fn) | `validateUploadFormState`, `validateAnnotationForm`, `KBEntryForm.validate()`, `ProfilePage.validate()` |
| Toast-only (no inline) | Moderation reject, dispute, chat, KB rich editor |
| Không có gì | Forgot password, approve/review notes, dispute evidence file |

**Không dùng Zod/Yup.** Các hàm validate trong `src/utils/validation.ts` (`validateAudioFile`, `validateImageFile`, `validateEmail`, `validatePassword`) **tồn tại nhưng không được import bởi bất kỳ UI nào**.

---

## Audit: Gaps theo severity

### 🔴 Critical

| # | Form | Gap | Lý do nguy hiểm |
|---|------|-----|----------------|
| C-1 | **Upload file size** | `uploadConstants.ts` tắt hẳn size check; `validateAudioFile` 100MB không được dùng | DoS / chi phí bandwidth nếu backend không block |
| C-2 | **Dispute evidence upload** | Bất kỳ file type/size nào được chấp nhận client-side | Chỉ phụ thuộc API; user nhầm format |

### 🟠 Major

| # | Form | Gap | File |
|---|------|-----|------|
| M-1 | **Login — phone vs email** | Placeholder "Email hoặc số điện thoại" nhưng `pattern` chỉ chấp nhận email — người dùng có số điện thoại không thể đăng nhập qua form | `LoginFormContent.tsx:166` |
| M-2 | **Moderation reject notes** | Không có `maxLength`, không có inline error — chỉ dùng toast khi rỗng | `ModerationRejectReasonForm.tsx` |
| M-3 | **Approve / Expert review notes** | Textarea unbounded; không có max, không validate | `ModerationModals.tsx`, `ModerationSubmissionDetailPanels.tsx`, `ModerationVerificationWizardDialog.tsx` |
| M-4 | **Dispute admin resolution notes** | Reviewer ID chỉ check non-empty (không validate UUID format); resolution notes unbounded | `DisputeListPanel.tsx` |
| M-5 | **Chat input** | Không có `maxLength` — tin nhắn dài vô hạn gửi lên API | `ChatbotPage.tsx`, `ResearcherPortalQATab.tsx` |
| M-6 | **Forgot password** | Button tồn tại nhưng không có handler / route | `LoginFormContent.tsx` |

### 🟡 Minor

| # | Form | Gap | File |
|---|------|-----|------|
| N-1 | **OTP field** | `maxLength={6}` nhưng không check digits-only (có thể nhập chữ) | `LoginFormContent.tsx`, `ConfirmAccountPage.tsx` |
| N-2 | **Password register / create-expert** | Min 6 chars nhưng `validatePassword` (uppercase + lowercase + digit) tồn tại không dùng | `RegisterPage.tsx`, `CreateExpertPage.tsx` |
| N-3 | **KB / Annotation URL citation** | `maxLength` có, nhưng không check format URL khi nhập (chỉ check khi hiển thị qua `isLikelyHttpUrl`) | `KBCitationManager.tsx`, `AnnotationForm.tsx` |
| N-4 | **Embargo** | Không check `end >= start` ở client | `EmbargoSection.tsx` |
| N-5 | **Dispute report description** | `maxLength={2000}` có; placeholder thiếu dấu tiếng Việt | `DisputeReportForm.tsx:105` |
| N-6 | **`validation.ts` utils** | `validateAudioFile`, `validateImageFile`, `validateEmail` tồn tại nhưng không được import bởi UI | `validation.ts` |

---

## Phase 0 — Chốt thiết kế

| Câu hỏi | Quyết định |
|---------|-----------|
| Dùng Zod? | **Không thêm Zod** — ổn định code hiện tại. Dùng pure validators thuần theo pattern annotation/upload đã có. |
| Inline error vs toast? | **Inline error** cho field lỗi (pattern annotation: `<span className="text-red-700">`). Toast chỉ cho lỗi API/server. |
| Validation email vs phone ở login? | **Hỗ trợ cả hai**: regex `email OR phone (10-11 digits)` trong `pattern` của RHF |
| Max length constants | Tập trung ở file constant hoặc khai báo cạnh validator tương ứng |
| Password policy | Đồng bộ `validatePassword` đã có vào Register + CreateExpert |

---

## Phases

### Phase 1 — Critical fixes (file upload + dispute evidence)

| # | Task | File(s) |
|---|------|---------|
| 1.1 | Thêm lại file size guard cho audio/video upload: báo lỗi ngay khi chọn file vượt ngưỡng (ví dụ: audio 200MB, video 2GB) | `src/features/upload/uploadConstants.ts`, `src/features/upload/hooks/useMediaUpload.ts` |
| 1.2 | Thêm type + size validation cho dispute evidence upload: chỉ chấp nhận image/pdf, max 10MB, hiển thị lỗi inline | `src/components/features/moderation/DisputeEvidenceUpload.tsx` |

### Phase 2 — Auth & identity gaps

| # | Task | File(s) |
|---|------|---------|
| 2.1 | Fix login identifier: pattern cho phép email **hoặc** số điện thoại 10-11 chữ số | `src/components/auth/LoginFormContent.tsx` |
| 2.2 | Fix OTP field: thêm `pattern="[0-9]*"` + `inputMode="numeric"` + kiểm tra digits-only trước submit | `src/components/auth/LoginFormContent.tsx`, `src/pages/auth/ConfirmAccountPage.tsx` |
| 2.3 | Đồng bộ password policy: wire `validatePassword` từ `validation.ts` vào Register + CreateExpert | `src/pages/auth/RegisterPage.tsx`, `src/pages/admin/CreateExpertPage.tsx` |
| 2.4 | Forgot password: thêm handler → navigate `/forgot-password` hoặc hiện modal (nếu route đã có) | `src/components/auth/LoginFormContent.tsx` |

### Phase 3 — Moderation textarea bounds

| # | Task | File(s) |
|---|------|---------|
| 3.1 | Reject reason: thêm `maxLength={2000}`, counter ký tự, inline error khi rỗng (thay toast-only) | `src/components/features/moderation/ModerationRejectReasonForm.tsx` |
| 3.2 | Approve notes: thêm `maxLength={1000}`, trim trước submit | `src/components/features/moderation/ModerationModals.tsx` |
| 3.3 | Expert review / verification notes: thêm `maxLength={2000}` | `src/components/features/moderation/ModerationSubmissionDetailPanels.tsx`, `ModerationVerificationWizardDialog.tsx` |

### Phase 4 — Dispute & embargo

| # | Task | File(s) |
|---|------|---------|
| 4.1 | Dispute admin resolution notes: `maxLength={1000}`, reviewer ID check format UUID (reuse `isUuid()`) | `src/components/features/moderation/DisputeListPanel.tsx` |
| 4.2 | Dispute report description: fix placeholder tiếng Việt có dấu | `src/components/features/moderation/DisputeReportForm.tsx` |
| 4.3 | Embargo: check client-side `endDate >= startDate` trước khi gọi API | `src/components/features/moderation/EmbargoSection.tsx` |

### Phase 5 — Chat + KB + URL validation

| # | Task | File(s) |
|---|------|---------|
| 5.1 | Chat input: `maxLength={2000}`, show char counter khi gần ngưỡng (≥1800) | `src/pages/ChatbotPage.tsx`, `src/components/researcher/ResearcherPortalQATab.tsx` |
| 5.2 | KB citation URL: kiểm tra `isLikelyHttpUrl` nếu user nhập (optional — khi điền thì phải hợp lệ) | `src/components/features/kb/KBCitationManager.tsx` |
| 5.3 | Annotation citation URL: tương tự KB — validate format nếu không rỗng | `src/features/annotation/utils/annotationFormValidation.ts`, `src/components/features/annotation/AnnotationForm.tsx` |

### Phase 6 — Housekeeping utils

| # | Task | File(s) |
|---|------|---------|
| 6.1 | `validateAudioFile` / `validateImageFile` trong `validation.ts`: import và dùng thực sự (hoặc xóa nếu Phase 1.1 tự xử lý) | `src/utils/validation.ts` |
| 6.2 | Gom `MAX_*_LENGTH` constants vào 1 file `src/config/validationConstants.ts` để tránh magic numbers rải rác | Mới |

---

## Phase X — Verification Checklist

| # | Kiểm tra | Type |
|---|----------|------|
| 1 | `npx tsc --noEmit` passes | Auto |
| 2 | `npx eslint src/` passes | Auto |
| 3 | `npx vitest run` — unit tests không regression | Auto |
| 4 | Upload file > ngưỡng → báo lỗi ngay khi chọn (không cần submit) | Manual |
| 5 | Dispute evidence: file ảnh hợp lệ → pass; `.exe` hoặc >10MB → block với thông báo | Manual |
| 6 | Login với email hợp lệ → OK; với "0901234567" → OK; với "notAnEmail" → lỗi inline | Manual |
| 7 | OTP input: nhập chữ → bị chặn; nhập số đúng 6 ký tự → pass | Manual |
| 8 | Register password "abc" → lỗi; "Abc1" (đủ policy) → pass | Manual |
| 9 | Reject reason: submit khi trống → inline error trên textarea (không chỉ toast) | Manual |
| 10 | Chat: nhập >2000 ký tự → bị chặn / cảnh báo | Manual |
| 11 | Embargo: `end < start` → lỗi client trước khi gọi API | Manual |
| 12 | KB citation: nhập `not-a-url` vào URL field → lỗi format; để trống → OK (optional) | Manual |
| 13 | Không có regression trên annotation, upload, profile (forms đã hoạt động đúng) | Manual |

---

## File Delivery Summary

| File | Loại | Phase |
|------|------|-------|
| `src/features/upload/hooks/useMediaUpload.ts` | Sửa | Phase 1 |
| `src/components/features/moderation/DisputeEvidenceUpload.tsx` | Sửa | Phase 1 |
| `src/components/auth/LoginFormContent.tsx` | Sửa | Phase 2 |
| `src/pages/auth/RegisterPage.tsx` | Sửa | Phase 2 |
| `src/pages/admin/CreateExpertPage.tsx` | Sửa | Phase 2 |
| `src/pages/auth/ConfirmAccountPage.tsx` | Sửa | Phase 2 |
| `src/components/features/moderation/ModerationRejectReasonForm.tsx` | Sửa | Phase 3 |
| `src/components/features/moderation/ModerationModals.tsx` | Sửa | Phase 3 |
| `src/components/features/moderation/ModerationSubmissionDetailPanels.tsx` | Sửa | Phase 3 |
| `src/components/features/moderation/ModerationVerificationWizardDialog.tsx` | Sửa | Phase 3 |
| `src/components/features/moderation/DisputeListPanel.tsx` | Sửa | Phase 4 |
| `src/components/features/moderation/DisputeReportForm.tsx` | Sửa | Phase 4 |
| `src/components/features/moderation/EmbargoSection.tsx` | Sửa | Phase 4 |
| `src/pages/ChatbotPage.tsx` | Sửa | Phase 5 |
| `src/components/researcher/ResearcherPortalQATab.tsx` | Sửa | Phase 5 |
| `src/components/features/kb/KBCitationManager.tsx` | Sửa | Phase 5 |
| `src/features/annotation/utils/annotationFormValidation.ts` | Sửa | Phase 5 |
| `src/config/validationConstants.ts` | Mới | Phase 6 |
| `src/utils/validation.ts` | Sửa | Phase 6 |

**Ước tính effort:** ~8–10 giờ (Phase 1: 1h, Phase 2: 2h, Phase 3: 1.5h, Phase 4: 1h, Phase 5: 1.5h, Phase 6: 0.5h)
**Phụ thuộc backend:** Không — chỉ sửa frontend.
**Risk:** Thấp — các thay đổi là additive (thêm giới hạn), không xóa logic hiện tại.
