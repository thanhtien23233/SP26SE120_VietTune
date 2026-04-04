# PLAN: ExplorePage guest dùng recordingGuest API

## Phase -1: Context Check

### User Request
- ExplorePage của guest sử dụng API `recordingGuest`.

### Scope chốt từ Socratic Gate
- API: dùng endpoint mới riêng cho guest.
- Auth behavior: guest gọi API **không gửi token**.
- Delivery: 3 phase.
- Fallback: user chọn `Other` (chưa chốt cụ thể, sẽ để phương án + điểm quyết định).

### Mục tiêu
- Guest vào `ExplorePage` luôn lấy dữ liệu từ luồng public `recordingGuest`.
- Không bị redirect login khi gọi API guest.
- Hành vi ổn định khi API lỗi/rỗng.

### Constraints
- Planning only, không chỉnh code trong tài liệu này.
- Không làm ảnh hưởng luồng user đã login.

---

## Phase 0: Socratic Gate Summary

### Quyết định đã rõ
1. Tạo/áp dụng endpoint mới dành cho guest.
2. Request guest không mang access token.
3. Triển khai theo 3 phase.

### Điểm cần chốt thêm trước khi implement
- Fallback behavior cụ thể khi `recordingGuest`:
  - timeout
  - trả lỗi 4xx/5xx
  - trả 200 nhưng `items = []`

### Đề xuất fallback options (để chọn khi bắt đầu `/create`)
- Option A: Không fallback, hiển thị empty state rõ lý do.
- Option B: Fallback sang endpoint recording public hiện tại.
- Option C: Fallback nhiều tầng (endpoint public -> local/submission cache).

---

## Phase 1: API Contract & Guest Data Path Design

### Goal
- Định nghĩa đường đi dữ liệu riêng cho guest trên ExplorePage.

### Tasks
1. Chốt endpoint contract `recordingGuest`:
   - URL, params, paging, sort.
   - response envelope (`items/data/records`) và field mapping.
2. Chốt service layer:
   - tạo service function riêng cho guest fetch.
   - explicit mode “no-token request”.
3. Chốt mapping sang `Recording` model UI:
   - normalize key casing.
   - chuẩn hóa verification/public status để chỉ hiện dữ liệu hợp lệ.
4. Chốt error model:
   - network error
   - API error
   - empty data

### Deliverables
- Tài liệu contract + mapping checklist.
- Danh sách test cases dữ liệu đầu vào.

---

## Phase 2: ExplorePage Integration (Guest-first)

### Goal
- ExplorePage ưu tiên gọi `recordingGuest` khi user là guest.

### Tasks
1. Gắn luồng fetch guest vào lifecycle ExplorePage.
2. Đảm bảo branch theo role/state:
   - guest -> `recordingGuest`
   - logged-in -> giữ luồng hiện có (hoặc strategy thống nhất nếu muốn).
3. Tách trạng thái UI rõ ràng:
   - loading
   - success with data
   - empty state
   - error state
4. Cắm điểm fallback theo option đã chốt ở Phase 0.
5. Telemetry nhẹ cho dev:
   - source API, status, result count, fallback used.

### Deliverables
- ExplorePage chạy đúng luồng guest API.
- Không phát sinh redirect login ngoài ý muốn.

---

## Phase 3: Verification & Hardening

### Goal
- Đảm bảo tính đúng đắn, không regression.

### Tasks
1. Verification checklist theo scenario:
   - guest no-token success
   - guest API timeout
   - guest API empty data
   - logged-in unaffected
2. E2E/update test plan:
   - bổ sung case guest ExplorePage dùng nguồn `recordingGuest`.
3. UX polishing:
   - thông điệp empty/error thân thiện.
   - badge “nguồn dữ liệu” (dev-only hoặc optional production).
4. Regression pass:
   - HomePage guest
   - RecordingDetail guest playback
   - Explore filters/search behavior

### Deliverables
- Danh sách test pass/fail và tiêu chí chấp nhận.
- Ghi chú rollback plan nếu endpoint mới lỗi production.

---

## Agent Assignments

### Agent A - API/Service
- Chốt contract `recordingGuest`.
- Thiết kế service call không token + normalize response.

### Agent B - Frontend Integration
- Tích hợp ExplorePage guest-first flow.
- Quản lý state loading/empty/error/fallback.

### Agent C - QA/Verification
- Thiết kế test matrix guest scenarios.
- Kiểm tra regression các trang public liên quan.

---

## Verification Checklist (Phase X)

### Functional
- [ ] Guest vào `ExplorePage` gọi đúng `recordingGuest`.
- [ ] Request guest không gửi `Authorization`.
- [ ] Data render đúng card/list hiện tại.
- [ ] Filter/search vẫn hoạt động trên dataset guest.

### Reliability
- [ ] API lỗi có hành vi fallback/empty đúng như phương án chốt.
- [ ] Không redirect login khi guest ở route public.

### Regression
- [ ] Luồng logged-in không bị ảnh hưởng.
- [ ] Home/Explore/Detail public không lỗi.

### Observability
- [ ] Có log dev để thấy source data + result count.

