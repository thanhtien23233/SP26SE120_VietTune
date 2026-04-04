# PLAN: Tối ưu Search nâng cao

## Phase -1: Context Check

### User Request
- Tối ưu lại chức năng search nâng cao.

### Scope Chosen (Socratic Gate)
- Phạm vi: chỉ `ResearcherPortalPage` (Cổng nghiên cứu).
- Ưu tiên: độ chính xác, hiệu năng, UX, độ ổn định dữ liệu.
- Chiến lược: client-first (lọc phía FE là chính, có fallback).
- Lộ trình: 3 phases.

### Current State Snapshot
- `SearchableDropdown` đang dùng cho bộ lọc nâng cao (Dân tộc, Nhạc cụ, Nghi lễ, Vùng miền, Xã/Phường).
- Dữ liệu options lấy từ `referenceDataService`.
- Dữ liệu kết quả lấy từ `fetchRecordingsSearchByFilter`, fallback `fetchVerifiedSubmissionsAsRecordings`.
- Search và filter đang bị drift về hành vi giữa các input, và trải nghiệm chưa ổn định khi người dùng gõ nhanh.

### Constraints
- Planning only, không viết code trong phase này.
- Tương thích UI hiện có, không phá API contract.
- Không ảnh hưởng các module ngoài researcher portal.

---

## Phase 0: Socratic Gate (Q&A Summary)

### Quyết định đã chốt với user
1. Chỉ tối ưu ở researcher portal trước.
2. Ưu tiên đồng thời 4 yếu tố: accuracy + performance + UX + reliability.
3. Chạy theo client-first strategy.
4. Chia triển khai thành 3 phase để giảm rủi ro.

### Assumptions
- Dữ liệu reference có thể chứa tiếng Việt có dấu và biến thể nhập không dấu.
- API có thể trả rỗng/không ổn định theo filter combo; FE cần fallback minh bạch.
- Người dùng mong đợi lọc realtime khi gõ trong dropdown.

---

## Phase 1: Stabilize Matching Core (Quick Win)

### Goal
- Search trong từng dropdown hoạt động chính xác và nhất quán.

### Tasks
1. Chuẩn hóa module matching dùng chung:
   - `normalize(text)` bỏ dấu, chuẩn hóa `đ`, trim, collapse spaces.
   - token-based matching (`AND` logic) + prefix support.
2. Tách logic lọc khỏi component render nặng:
   - util pure functions để dễ test.
3. Đồng bộ hành vi input:
   - realtime filtering khi gõ.
   - reset trạng thái tìm kiếm khi đóng dropdown.
4. Chuẩn hóa thứ tự hiển thị:
   - option match exact/prefix lên trước, sau đó alphabet.

### Deliverables
- Search dropdown trả đúng kết quả theo keyword không dấu/có dấu.
- Không còn hiện tượng gõ mà danh sách không đổi.

### Risks
- Mismatch dữ liệu option (null/empty/duplicate).

### Mitigation
- Chuẩn hóa dữ liệu options trước khi lọc (sanitize).

---

## Phase 2: UX + Performance Hardening

### Goal
- Trải nghiệm mượt khi data lớn, dễ hiểu khi lọc nhiều điều kiện.

### Tasks
1. Áp dụng debounce nhỏ cho input dropdown (120-180ms).
2. Pre-index options:
   - lưu `normalizedLabel` để tránh normalize lặp lại.
3. UX improvements:
   - highlight phần match trong option.
   - hiển thị trạng thái `N kết quả`.
   - thêm `Xóa bộ lọc` + `Xóa tất cả`.
4. Accessibility pass:
   - keyboard navigation cho dropdown (up/down/enter/esc).

### Deliverables
- Dropdown mượt, không lag khi gõ nhanh.
- Trạng thái lọc rõ ràng hơn cho người dùng.

### Risks
- Debounce gây cảm giác trễ nếu cấu hình quá lớn.

### Mitigation
- A/B 120ms vs 180ms trong local để chọn mốc phù hợp.

---

## Phase 3: Reliability & Data Fallback Alignment

### Goal
- Kết quả lọc ổn định ngay cả khi API search-by-filter không như kỳ vọng.

### Tasks
1. Chuẩn hóa chiến lược client-first:
   - ưu tiên dữ liệu đã load từ catalog local state.
   - fallback rõ ràng khi API không có data.
2. Đồng bộ mapping filter key -> payload query.
3. Bổ sung telemetry nhẹ ở dev:
   - log payload filter, source data path, result count.
4. Thêm guard cho edge cases:
   - options rỗng, ids mismatch, status chưa VERIFIED.

### Deliverables
- Luồng filter ổn định, dễ debug khi backend thay đổi.

### Risks
- Sai khác dữ liệu giữa local cache và API response.

### Mitigation
- Rule ưu tiên nguồn dữ liệu và fallback order được tài liệu hóa rõ.

---

## Agent Assignments

### Agent A - Search Core
- Thiết kế và chuẩn hóa normalization + token matching.
- Viết test cases cho tiếng Việt có dấu/không dấu.

### Agent B - UI/UX
- Cải thiện dropdown UX (highlight, count, clear actions, keyboard nav).
- Đảm bảo không phá style hiện tại.

### Agent C - Data Reliability
- Chuẩn hóa filter payload mapping và fallback strategy.
- Bổ sung telemetry dev và checklist debug.

---

## Verification Checklist (Phase X)

### Functional
- [ ] Gõ `tay` tìm ra `Tày`.
- [ ] Gõ `hre` tìm ra `Khre/Hre` nếu tồn tại.
- [ ] Gõ nhiều token vẫn match đúng.
- [ ] Clear từng filter và clear all hoạt động đúng.
- [ ] Các filter kết hợp trả kết quả nhất quán.

### UX
- [ ] Dropdown mở/đóng mượt, không nhảy focus bất thường.
- [ ] Có phản hồi rõ khi không tìm thấy kết quả.
- [ ] Keyboard navigation hoạt động chuẩn.

### Performance
- [ ] Không lag khi gõ liên tục trên danh sách options lớn.
- [ ] Không re-render thừa gây giật UI.

### Reliability
- [ ] API lỗi/rỗng vẫn có fallback hợp lệ.
- [ ] Không crash khi dữ liệu reference thiếu trường.

### Regression
- [ ] E2E researcher filters pass.
- [ ] Không ảnh hưởng tab QA/Graph/Compare.

---

## Rollout Strategy
- Phase 1 -> verify nhanh trên local.
- Phase 2 -> kiểm thử UX/perf trên dữ liệu lớn.
- Phase 3 -> hardening và chốt tài liệu vận hành.

