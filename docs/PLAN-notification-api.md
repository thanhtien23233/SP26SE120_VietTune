# PLAN: Tận dụng API Notification (inbox hệ thống)

**Mục tiêu:** Làm rõ **nên làm gì** với các endpoint `/Notification` và luồng thông báo persistent trong VietTune, **tách biệt** với `uiToast` (toast tạm).

**Phạm vi tài liệu:** Chỉ kế hoạch — không chứa patch code.

---

## Phase −1: Context check (trạng thái repo hiện tại)

| Hạng mục | Ghi chú |
|----------|---------|
| Service | `recordingRequestService`: `POST /Notification` (`addNotification`), `GET /Notification`, `PUT /Notification/{id}/read`, `PUT /Notification/{id}` (unread), `PUT /Notification/read-all`. |
| Kiểu dữ liệu | `AppNotification` trong `src/types/index.ts` — `type`, `title`, `body`, `forRoles`, `recordingId?`, `read`, v.v. |
| UI inbox | `NotificationPage.tsx` — poll **5s**; `Header.tsx` dropdown — poll **30s**. |
| Nơi **tạo** thông báo (FE gọi API) | `ModerationPage`, `AdminDashboard`, `ApprovedRecordingsPage` (gọi `addNotification`). |
| Toast | `docs/uiToast.md` quy ước: **inbox ≠ toast** — không dùng `uiToast` thay cho danh sách thông báo lưu server. |
| Gaps đã lộ | `markAllNotificationsUnreadForRole`: FE log “không hỗ trợ backend”; nút trên `NotificationPage` có thể **không có hiệu lực thật** cho “đánh dấu chưa đọc tất cả”. |

---

## Phase 0: Socratic gate — cần thống nhất với backend / sản phẩm

Trước khi mở rộng tính năng, làm rõ:

1. **Nguồn sự thật:** Thông báo có được **chủ yếu tạo ở backend** (sự kiện domain) hay **FE vẫn được phép** `POST /Notification` cho một số loại? Ảnh hưởng tới tin cậy và audit.
2. **Phạm vi role:** `GET /Notification` đã lọc theo JWT/role chưa? `forRoles` trong payload có còn cần thiết trên client không?
3. **Realtime:** Chấp nhận **polling** hay cần **SSE/WebSocket** cho “có thông báo mới” (badge, toast nhẹ *một lần* khi có item mới)?
4. **Đồng bộ UI:** Khi có sự kiện quan trọng (xóa bản thu, phê duyệt…), product muốn: **chỉ inbox**, **inbox + toast ngắn**, hay **chỉ toast**?
5. **Xóa / hết hạn:** Backend có API **xóa** notification hoặc TTL chưa? FE hiện chủ yếu đọc/đánh dấu đọc.

*Trả lời ngắn trong ticket hoặc cập nhật lại mục này trong plan.*

---

## Phase 1: Căn chỉnh hợp đồng API (contract)

| Bước | Việc | Output |
|------|------|--------|
| 1.1 | Đối chiếu OpenAPI/Swagger backend với các path đang gọi trong `recordingRequestService`. | Bảng: endpoint → method FE → method BE → khớp/không. |
| 1.2 | Xác minh shape JSON (đặc biệt `read`, `id`, `createdAt`) và mã lỗi (401/403/404). | Ghi chú cho mapper/`safeArray`. |
| 1.3 | Quyết định endpoint **mark-all-unread** (implement BE hoặc **ẩn nút** trên FE cho đến khi có API). | Tránh nút “dối” người dùng. |

**Gán:** Dev backend + Dev frontend cùng xác nhận.

---

## Phase 2: Trải nghiệm người dùng (không trộn với toast)

| Bước | Việc | Ghi chú |
|------|------|---------|
| 2.1 | **Badge** số chưa đọc trên Header — đảm bảo đồng bộ sau mark read/unread (invalidate hoặc refetch). | Tránh lệch dropdown với trang `/notifications`. |
| 2.2 | **Deep link:** Click một dòng thông báo → điều hướng tới `recordingId` / route phù hợp (nếu product cần). | Cần map `type` → route. |
| 2.3 | **Tùy chọn toast phụ:** Nếu product đồng ý, *một* toast ngắn khi polling phát hiện **item mới** so với snapshot trước — không thay thế inbox. | Tránh spam: chỉ toast cho số lượng mới hoặc chỉ bật theo setting. |
| 2.4 | **Lỗi mạng/API:** Hiển thị trạng thái lỗi trên `NotificationPage` / dropdown (có thể dùng `uiToast.error` *một lần* hoặc inline banner). | Hiện một số `catch` chỉ `console.error`. |

**Gán:** Product + Frontend.

---

## Phase 3: Kiểm thử & vận hành

| Kiểm tra | Tiêu chí Pass |
|----------|----------------|
| CRUD/luồng đọc | GET trả đúng theo tài khoản; mark read/unread/read-all phản ánh trên Header và trang. |
| Tạo thông báo | Sau hành động moderation/admin/approved recording, user đích thấy entry mới (hoặc backend tạo tương đương). |
| Polling | Không gọi API quá dày khi tab ẩn (tùy chọn: `document.visibilityState`). |
| Legacy | Không nhầm `notificationStore` (modal cũ) với inbox API — `docs/uiToast.md` vẫn đúng hướng. |

---

## Agent / vai trò (tham chiếu)

| Vai trò | Việc |
|---------|------|
| Backend | Hợp đồng API, lọc theo user, endpoint thiếu (mark-all-unread?), TTL/delete. |
| Frontend | Align service + UI, badge, lỗi hiển thị, tùy deep link / toast phụ. |
| QA | Ma trận role (Admin/Expert/Contributor) + tái hiện từng `AppNotification.type`. |

---

## Tài liệu liên quan

- `src/services/recordingRequestService.ts` (khối `// --- Notifications`)
- `src/pages/NotificationPage.tsx`, `src/components/layout/Header.tsx`
- `docs/uiToast.md` (phân tách toast vs inbox)

---

*Slug:* `notification-api` · *Tạo theo `/plan`: có API notification — cần làm gì.*
