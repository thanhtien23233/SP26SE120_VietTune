# Đánh giá và Phân tích UI/UX hiện tại của Luồng Chuyên gia (Expert Workflow)

**Ngày thực hiện:** 05/05/2026
**Phạm vi:** Tầng giao diện và trải nghiệm người dùng của tính năng Expert Moderation (Kiểm duyệt & Chuyên gia).
**Tệp chính:** `src/pages/ModerationPage.tsx` và các component con trong `src/features/moderation`.

---

## 1. Cấu trúc Giao diện Tổng thể (Layout & Navigation)

Giao diện Chuyên gia hiện tại được thiết kế dạng Single Page Application (SPA) thu nhỏ trong màn hình `ModerationPage`, sử dụng cơ chế **Tabs Navigation** chia thành 4 chức năng cốt lõi:

1. **Xem duyệt bản thu (Review Tab):** Màn hình chính chứa hàng đợi các bản thu cần kiểm duyệt, phân bổ công việc và cho phép duyệt (Approve/Reject).
2. **Giám sát AI (AI Monitoring Tab):** Cung cấp giao diện để chuyên gia kiểm tra chéo các phân tích từ AI, báo cáo lỗi hoặc xác nhận kết quả AI.
3. **Kho tri thức (Knowledge Base Tab):** Tích hợp `KnowledgeBasePanel` ngay trong màn hình làm việc để chuyên gia có thể tra cứu nhanh thông tin học thuật về nhạc cụ, dân tộc mà không cần chuyển trang.
4. **Chú thích học thuật (Annotation Tab):** Hỗ trợ chuyên gia đóng góp thêm các siêu dữ liệu học thuật, đánh dấu các mốc thời gian quan trọng trong bản thu.

---

## 2. Các Điểm Sáng về UX và Hiệu năng (UX & Performance Highlights)

Đội ngũ kỹ thuật đã triển khai một loạt các tối ưu hóa UI/UX cực kỳ tinh vi:

### A. Quản lý Bộ nhớ (OOM Prevention) cực tốt
Đây là một giải pháp thiết kế xuất sắc. Khi hàng đợi (Queue) tải về, hệ thống **CHỈ lưu trữ siêu dữ liệu (Metadata)** vào State (`allItems`). 
Các tệp Media nặng (Audio/Video Blob) chỉ được tải và gắn vào biến `dialogCurrentRecording` khi Chuyên gia mở Modal chi tiết để kiểm duyệt. Ngay khi đóng Modal, bộ nhớ chứa Media này sẽ lập tức được giải phóng. Điều này giúp giao diện không bị giật lag hay tràn RAM (Out-of-Memory) kể cả khi hàng đợi có hàng trăm bản thu.

### B. Trải nghiệm Tương tác (A11y & Interactions) an toàn
- **Khóa Scroll Body:** Khi bất kỳ Modal nào (Verification, Reject, Confirm) mở lên, `ModerationPage` sẽ tính toán và khóa thanh cuộn (scroll) của thẻ `<body>`, giữ nguyên vị trí Y hiện tại. Điều này ngăn lỗi cuộn "trượt" cực kỳ khó chịu trên các thiết bị di động (Mobile).
- **Phím Escape phân tầng:** Bắt sự kiện phím `Escape` để đóng Dialog nhưng được thiết kế thông minh (ưu tiên đóng Pop-up nhỏ gọn nhất/trên cùng trước, thay vì đóng sập toàn bộ các luồng công việc đang mở).
- **Thông báo ẩn (Screen Reader):** Sử dụng thẻ `<div className="sr-only" aria-live="polite">` để tự động đọc cho hệ thống hỗ trợ người khuyết tật (A11y) mỗi khi hàng đợi có bản thu mới hoặc vừa duyệt xong một bài.

### C. Trải nghiệm Nhập liệu không gián đoạn (Optimistic UI)
- Trạng thái các bước duyệt và Ghi chú chuyên gia (Expert Notes) được **Debounce (450ms)**. Chuyên gia gõ đến đâu, dữ liệu tự động lưu xuống LocalStorage/Service đến đó mà không làm re-render toàn bộ danh sách bản thu ngoài màn hình chính.

---

## 3. Quy trình làm việc (Task Flow)

Luồng kiểm duyệt (Review) tuân thủ chặt chẽ nguyên tắc **"Khóa và Xử lý" (Claim & Review)**:
1. **Assign Only (Nhận bài):** Chuyên gia phải nhấn "Nhận bài" (Claim). Nếu có chuyên gia khác đã nhận, hệ thống báo lỗi 409 Conflict và thông báo qua Toast để tránh làm trùng việc.
2. **Kiểm duyệt 3 bước (Wizard):** Sau khi nhận bài, mở Modal kiểm duyệt sẽ hiển thị luồng làm việc theo dạng Wizard từng bước, đảm bảo chuyên gia không bỏ sót các tiêu chí.
3. **Rollback linh hoạt:** Hỗ trợ nút "Hủy nhận bài" (Unclaim) kèm xác nhận, đưa bản thu trở về hàng đợi chung PENDING_REVIEW một cách mượt mà.

---

## 4. Những Điểm Cần Cải Thiện (Khuyến nghị UI/UX)

1. **Virtualization cho Hàng Đợi:** Dù đã tối ưu OOM cho Blobs, việc render danh sách dài (VD: 500 bản thu) trên DOM vẫn có thể gây nặng máy. Nên áp dụng Virtual List (như `react-window` hoặc `react-virtuoso`) cho `ModerationReviewTab`.
2. **Cơ chế Skeleton/Loading:** Cải thiện UI trạng thái loading khi đang fetch danh sách bằng Skeleton thay vì Spinner để tránh layout shift.
3. **UX Trạng thái Mất mạng:** Do kết hợp LocalStorage rất nhiều, cần có một UI Indicator (như dấu chấm xanh/đỏ) để báo cho chuyên gia biết hệ thống đang kết nối trực tuyến hay đang lưu tạm ngoại tuyến (Offline Mode).
