# Tài liệu Cập nhật API & Workflow - [Ngày cập nhật: 03/05/2026]

Tài liệu này thông báo về các thay đổi trong hệ thống API liên quan đến Module **Authentication** và **Workflow duyệt bài (Submission)**.

---

## 1. Module Authentication (Auth)

Các API dưới đây đã được thay đổi phương thức (Method) để đảm bảo tính bảo mật và đúng chuẩn RESTful.

### 🔄 Thay đổi Method (GET -> PUT)
Vui lòng cập nhật lại method gọi từ FE cho các endpoint sau:

| Endpoint | Method cũ | Method mới | Ghi chú |
| :--- | :---: | :---: | :--- |
| `/api/Auth/confirm-email` | `GET` | **`PUT`** | Xác nhận email qua code/token |
| `/api/Auth/forgot-password` | `GET` | **`PUT`** | Yêu cầu gửi mail đặt lại mật khẩu |
| `/api/Auth/reset-password` | `GET` | **`PUT`** | Thiết lập mật khẩu mới |

### ✨ API Mới (Bổ sung)
*   **Endpoint:** `/api/Auth/resend-confirmation-email`
*   **Method:** `PUT`
*   **Mô tả:** Gửi lại mã xác nhận email trong trường hợp người dùng chưa nhận được hoặc mã hết hạn.

---

## 2. Workflow Duyệt Bài (Submission Flow)

Quy trình duyệt bài hiện tại được chia thành các Stage cụ thể. FE cần lưu ý logic chuyển đổi trạng thái như sau:

### 📑 Quy trình Stage
1.  **Khởi tạo:** Sau khi hệ thống nhận bài, Submission sẽ mặc định vào **Stage 1** (`CurrentStage = 1`).
2.  **Hoàn thành Stage 1:** 
    *   Sau khi xử lý xong các tác vụ ở Stage 1, FE gọi API: `PUT /api/Submission/done-stage-one`.
3.  **Xử lý Stage 2:** 
    *   Ở bước này, nếu cần lấy danh sách các Submission có chứa **Recording liên quan** để đối chiếu, sử dụng API mới bên dưới.
4.  **Hoàn thành Stage 2:** 
    *   Sau khi xử lý xong Stage 2, FE gọi API: `PUT /api/Submission/done-stage-two`.

> [!NOTE]
> Các trạng thái và API khác không nằm trong danh sách này vẫn giữ nguyên như cũ.

### ✨ API Mới (Bổ sung cho Stage 2)
*   **Endpoint:** `/api/Submission/get-related-submissions`
*   **Method:** `GET`
*   **Mô tả:** Lấy danh sách các Submissions có chứa Recording liên quan đến Submission đang được duyệt.

---

**Người gửi:** [Phú/Backend Team]
**Trạng thái:** Sẵn sàng trên môi trường Staging/Dev.