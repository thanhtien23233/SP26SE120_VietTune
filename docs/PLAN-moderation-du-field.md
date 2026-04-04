# PLAN: Tối ưu kiểm duyệt dư field

## Phase -1: Context Check

### User Request
- Tối ưu lại chức năng kiểm duyệt vì đang hiển thị dư field.

### Scope chốt từ Socratic Gate
- Khu vực cần xử lý: **cả 3 khu vực**
  1. Player/metadata
  2. Khối Thông tin bản thu
  3. Hàng đợi bên trái
- Rule field rỗng: **giữ hiển thị**, nhưng style nhẹ hơn.
- Đối tượng áp dụng: **Expert/Moderator**.
- Delivery: **3 phase**.

### Mục tiêu
- Giảm trùng lặp thông tin, tăng khả năng scan nhanh khi kiểm duyệt.
- Không làm mất thông tin cần thiết cho quyết định duyệt/từ chối.
- Giữ nhất quán UI/UX với palette hiện có của VietTune.

### Constraints
- Planning only (không viết code trong bước này).
- Không đổi logic nghiệp vụ duyệt/từ chối, chỉ tối ưu hiển thị.

---

## Phase 0: Socratic Gate Summary

### Quyết định đã rõ
1. Refactor toàn bộ layout moderation (3 khu vực).
2. Field rỗng vẫn hiện nhưng giảm độ ưu tiên thị giác.
3. Chỉ nhắm vào luồng Expert/Moderator.
4. Chia 3 phase để giảm rủi ro regression.

### Assumptions
- “Dư field” gồm cả trùng nội dung và field giá trị mặc định (`—`, `Không xác định`).
- Cần giữ đủ dữ liệu để expert đối chiếu ngữ cảnh trước khi duyệt.

---

## Phase 1: Inventory & De-dup Rules

### Goal
- Xác định chính xác field nào trùng/lặp/ít giá trị trong từng khu vực.

### Tasks
1. Lập bảng field inventory cho:
   - Queue card
   - Header detail + player section
   - Thông tin bản thu
2. Định nghĩa rule “Single Source of Truth”:
   - Field chỉ xuất hiện ở 1 vị trí chính.
   - Field phụ chỉ hiển thị khi có giá trị ý nghĩa.
3. Nhóm field theo mức ưu tiên:
   - Critical: title, trạng thái kiểm duyệt, media, lý do/ghi chú.
   - Secondary: uploader, dân tộc, vùng, nhạc cụ, loại sự kiện.
   - Tertiary: field rỗng/mặc định (giữ nhưng giảm prominence).
4. Chốt mapping hiển thị rỗng:
   - style muted, icon/label nhỏ, không chiếm nhiều vertical space.

### Deliverables
- Ma trận field: `field -> vị trí hiển thị chính -> điều kiện hiển thị`.
- Bộ quy tắc chống trùng lặp.

---

## Phase 2: UI Refactor (Expert-only)

### Goal
- Tái cấu trúc giao diện moderation gọn, rõ, không lặp.

### Tasks
1. Queue bên trái:
   - rút gọn chip/status, bỏ dữ liệu lặp với panel detail.
2. Detail + Player:
   - giữ 1 tiêu đề chính duy nhất.
   - loại metadata trùng với khối thông tin phía dưới.
3. Khối Thông tin bản thu:
   - chỉ hiển thị thông tin bổ trợ, không lặp player header.
   - field rỗng dùng style giảm nhấn (text-muted/label nhỏ).
4. Chuẩn hóa spacing/typography:
   - giảm vertical noise, tăng readability.
5. A11y:
   - label rõ ràng, region/aria hợp lý cho khối quan trọng.

### Deliverables
- Màn moderation sạch hơn, không dư field.
- Flow thao tác duyệt nhanh hơn (ít scroll, ít lặp đọc).

---

## Phase 3: Hardening & Verification

### Goal
- Đảm bảo refactor không gây regression chức năng kiểm duyệt.

### Tasks
1. Test matrix theo trạng thái:
   - pending, in-review, temporarily rejected, rejected, verified.
2. Validate data visibility:
   - đủ dữ liệu để quyết định duyệt/từ chối.
3. Kiểm tra edge cases:
   - bản thu thiếu metadata
   - bản thu không có media
   - API trả partial/null fields
4. Regression pass:
   - claim/start moderation
   - delete recording
   - expert notes / rejection notes
   - AI moderation tab unaffected

### Deliverables
- Checklist test pass/fail.
- Danh sách residual risks + follow-up.

---

## Agent Assignments

### Agent A - UX Inventory
- Thống kê field hiện tại, xác định trùng lặp và ưu tiên hiển thị.

### Agent B - UI Refactor
- Triển khai layout mới theo rule de-dup + style cho field rỗng.

### Agent C - QA/Regression
- Chạy checklist nghiệp vụ moderation và xác nhận không regression.

---

## Verification Checklist (Phase X)

### Functional
- [ ] Không còn field trùng giữa queue/detail/info.
- [ ] Trạng thái kiểm duyệt và hành động chính luôn hiển thị rõ.
- [ ] Field rỗng vẫn hiển thị nhưng không gây rối.

### UX
- [ ] Scan 5 giây có thể nắm tiêu đề + trạng thái + hành động.
- [ ] Giảm số dòng/khối lặp so với trước.
- [ ] Mobile/desktop đều không bị vỡ layout.

### Regression
- [ ] Claim, approve/reject, delete, notes hoạt động bình thường.
- [ ] Tab giám sát AI không bị ảnh hưởng.

