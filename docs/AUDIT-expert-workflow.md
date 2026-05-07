# Báo cáo Kiểm toán Kỹ thuật Chuyên sâu: Expert Workflow (VietTune)

**Ngày thực hiện:** 05/05/2026
**Phạm vi audit:** Toàn bộ luồng làm việc của Chuyên gia (Expert Workflow) từ tầng giao diện (UI/UX), dịch vụ quản lý trạng thái (Service/State), đến giao tiếp dữ liệu (API Adapter).
**Các tệp được phân tích sâu:**
- `src/pages/ModerationPage.tsx`
- `src/services/expertWorkflowService.ts`
- `src/services/expertModerationApi.ts`
- `docs/PLAN-expert-workflow.md`

---

## 1. Tổng quan Kiến trúc (Architecture Overview)

Hệ thống được thiết kế theo mô hình **Adapter Pattern (2 Giai đoạn)** cực kỳ linh hoạt nhằm đảm bảo phía Frontend không bị phụ thuộc hoặc tê liệt khi Backend API chưa hoàn thiện toàn bộ.
- **Phase 1 (Mock/Local):** Sử dụng Local Storage để giả lập trạng thái nhận bài (Claim), duyệt bài và lưu quy trình xác minh 3 bước (`ModerationVerificationData`).
- **Phase 2 (API-Backed):** Kích hoạt qua biến môi trường `VITE_EXPERT_API_PHASE2`. Gắn kết với các endpoint thực của Server nhưng vẫn giữ lại Local Overlay để duy trì trải nghiệm mượt mà.

---

## 2. Phân tích Tầng Giao tiếp Dữ liệu (API Layer: `expertModerationApi.ts`)

Tầng này đảm nhận việc giao tiếp HTTP và chuẩn hóa dữ liệu từ Swagger DTO sang Domain Model (`LocalRecording`).

### 2.1. Điểm mạnh cốt lõi
- **Fallback Queue Thông minh:** Do sự không đồng nhất mã trạng thái (status code) giữa các môi trường Backend (0 hoặc 1 cho "Pending"), hệ thống tự động quét tuần tự để tìm dữ liệu, đảm bảo danh sách không bao giờ trống do lỗi cấu hình.
  ```typescript
  async function getPendingQueueByStatusWithFallback(lookups: SubmissionLookupMaps): Promise<LocalRecording[]> {
    const primary = await getSubmissionsByStatus({ status: 1, page: 1, pageSize: 200, lookups });
    if (primary.length > 0) return primary;

    const legacyPending = await getSubmissionsByStatus({ status: 0, page: 1, pageSize: 200, lookups });
    if (legacyPending.length > 0) return legacyPending;

    // Quét toàn bộ và tự filter ở client nếu status của Backend bị sai lệch
    const unfiltered = await getSubmissionsByStatus({ page: 1, pageSize: 200, lookups });
    const pendingOnly = unfiltered.filter(row => 
      toModerationUiStatus(mapApiSubmissionStatusToModeration(row.moderation?.status)) === ModerationStatus.PENDING_REVIEW
    );
    return dedupeByRecordingId(pendingOnly);
  }
  ```
- **Reference Data Caching:** Các metadata (Dân tộc, nhạc cụ, địa lý) được cache qua hàm `buildSubmissionLookupMaps` với TTL (Time-To-Live) 15 phút. Thiết kế Singleton nội bộ ngăn chặn bão Request (Request Storm) khi render danh sách.
- **Fail-safe Audit Logging:** Hàm POST AuditLog chủ động "nuốt lỗi" để không cản trở luồng công việc chính của chuyên gia.

### 2.2. Rủi ro & Khuyến nghị
- **Race Condition khi Assign Bài:** Phía Frontend xử lý rất tốt việc hiển thị lỗi, tuy nhiên Backend cần phải trả về chính xác mã `HTTP 409 Conflict` kèm thông báo bị khóa nếu có 2 chuyên gia cùng gọi `/Submission/assign-reviewer-submission` cùng lúc.

---

## 3. Phân tích Tầng Dịch vụ & Trạng thái (Service Layer: `expertWorkflowService.ts`)

Tệp này đóng vai trò như một kho dữ liệu trung gian, trộn (merge) danh sách từ server và trạng thái đang xử lý dang dở ở thiết bị.

### 3.1. Điểm mạnh cốt lõi
- **Overlay Pattern & Patching:** Thiết kế cực kỳ thông minh khi không lưu đè toàn bộ đối tượng Recording, mà chỉ tạo một "Patch" (Bản vá) cho trường `moderation` lưu vào LocalStorage.
  ```typescript
  function mergeBaseWithPatch(base: LocalRecording, patch?: ExpertSubmissionLocalPatch | null): LocalRecording {
    if (!patch) return base;
    const merged: LocalRecording = { ...base };
    const mergedModeration: Record<string, unknown> = { ...(base.moderation ?? {}), ...patch.moderation };
    // Khôi phục form 3 bước hoặc xóa sạch nếu patch gửi null
    if (patch.moderation.verificationData === null) {
      delete mergedModeration.verificationData; 
    } else {
      mergedModeration.verificationData = mergeVerificationData(prevVd, nextVd ?? undefined);
    }
    merged.moderation = mergedModeration as LocalRecording['moderation'];
    return merged;
  }
  ```
- **Cơ chế Snapshot/Restore (Optimistic UI):** Có khả năng sao lưu trạng thái trước khi gọi API (hàm `snapshotSubmissionOverlay`) và khôi phục (rollback) ngay lập tức nếu API báo lỗi.

### 3.2. Rủi ro & Khuyến nghị
- **I/O Bottleneck:** Auto-save ghi chú (Notes) hoặc Form sẽ gọi `readMap()` và `writeMap()` thực thi `JSON.parse` trên toàn bộ đối tượng Overlay. Về lâu dài có thể gây block Main Thread. **Đề xuất:** Thay LocalStorage bằng IndexedDB hoặc dùng Memory Cache kết hợp Debounce lưu xuống đĩa.
- **Rác Dữ liệu (Stale Data):** Hiện tại không có TTL cho Overlay. Cần có hàm dọn rác (Garbage Collector) chạy khi khởi động app để xóa các Submission ID không còn tồn tại trên server.

---

## 4. Phân tích Tầng Giao diện & Trải nghiệm (UI/UX Layer: `ModerationPage.tsx`)

Đây là một trong những trang phức tạp nhất hệ thống, nhưng được module hóa rất tốt.

### 4.1. Điểm mạnh cốt lõi
- **Chống tràn bộ nhớ (Memory Leak & OOM Prevention):** Đây là một thiết kế đẳng cấp. `ModerationPage` duy trì danh sách hàng đợi (`allItems`) CHỈ chứa siêu dữ liệu (Metadata). File âm thanh/video nguyên bản (Media Blobs) chỉ được tải và gán vào biến `dialogCurrentRecording` duy nhất khi mở Modal kiểm duyệt, và bị xóa ngay lập tức khi Modal đóng.
  ```typescript
  // Trong ModerationPage.tsx
  useEffect(() => {
    // Giải phóng bộ nhớ Blob khi đóng dialog
    if (!showVerificationDialog) setDialogCurrentRecording(null);
  }, [showVerificationDialog]);
  ```
- **Trải nghiệm Thân thiện (Accessibility - A11y):** 
  - Khóa Scroll của thẻ `<body>` một cách an toàn để chống lỗi vuốt trên di động khi mở Modal.
  - Sử dụng thẻ `aria-live="polite"` thông báo ngầm cho Screen Reader khi hàng đợi bị thay đổi (VD: duyệt xong 1 bài).
  - Quản lý bắt phím `Escape` phân tầng (đóng Dialog trên cùng trước, không đóng tất cả cùng lúc).
- **Auto-Save Ghi Chú:** `handleExpertReviewNotesChange` sử dụng `useRef` để debounce quá trình nhập liệu, không re-render lại toàn bộ danh sách.

### 4.2. Rủi ro & Khuyến nghị
- **Lưu lượng DOM:** Mặc dù đã dùng kĩ thuật cắt bỏ Blob, nhưng nếu hàng đợi có hơn 500 bài, việc render DOM cho danh sách vẫn sẽ làm chậm UI. **Đề xuất:** Áp dụng Virtualization (ví dụ: `react-window` hoặc `react-virtuoso`) cho `ModerationReviewTab`.

---

## 5. Đối chiếu với Tài liệu Đặc tả (`PLAN-expert-workflow.md`)

- ✅ **T1 (Map API):** Ánh xạ API đã thực hiện đầy đủ.
- ✅ **T2 (Phase 1 Queue UX):** Adapter hoạt động ổn định trên cả local mock và server thật.
- ✅ **T3 (Phase 2 Claim/Assign):** Có cảnh báo 409 Conflict thông qua `uiToast`.
- ✅ **T4 (Metadata Persistence):** Luồng Approve/Reject đồng bộ song song rất chặt chẽ.
- ✅ **T5 (Audit Trail):** Ghi chú nháp (Draft) được bảo toàn và đẩy lên Server khi kết thúc luồng.
- ✅ **T6 (UX Polish):** Đã implement toàn diện các chuẩn a11y và Memory Management cho Video/Audio.
- ✅ **T7 (Tests):** Tương thích tốt để Playwright móc vào Mock data qua Local Storage.

---

## 6. Tổng kết & Hành động (Actionable Checklist)

Mã nguồn của hệ thống Expert Workflow đạt tiêu chuẩn cực kỳ cao về Engineering. Việc ứng dụng linh hoạt Adapter, Optimistic UI, và quản lý bộ nhớ (Memory Management) giúp tính năng này sẵn sàng cho Production.

**Các công việc cần ưu tiên tiếp theo (Cho Đội Dev):**
1. **[P0]** Chốt lại với Đội Backend về cơ chế Lock Record (Tránh 2 người cùng Approve 1 bài).
2. **[P1]** Chuyển đổi `expertWorkflowService` từ dùng `localStorage` sang `IndexedDB` (thông qua `localforage` hoặc thư viện tương đương) để giải quyết triệt để rủi ro nghẽn cổ chai Main Thread khi dữ liệu lớn lên.
3. **[P2]** Thêm 1 hàm Garbage Collector gọi tự động (Background Sync) để quét và xóa các Object Patch cũ trong bộ nhớ trình duyệt sau mỗi 7 ngày.
