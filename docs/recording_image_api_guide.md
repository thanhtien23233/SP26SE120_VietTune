# 📸 API Guide — Recording Image Upload & Management

> **Last updated:** 2026-05-08  
> **Base URL:** `https://viettunearchiveapi-fufkgcayeydnhdeq.japanwest-01.azurewebsites.net`  
> **Auth:** Bearer JWT (header `Authorization: Bearer {token}`)

---

## 1. Upload ảnh cho một Recording

Upload file ảnh lên Supabase Storage bucket `recording-images` và lưu metadata vào DB.  
File được lưu tại path: `recordings/{recordingId}/{uuid}.{ext}`

### Request

```
POST /api/recordingimage/{recordingId}/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

#### Path Parameters (bắt buộc — nằm trong URL)

| Parameter    | Kiểu   | Bắt buộc | Mô tả                                     |
|--------------|--------|----------|-------------------------------------------|
| `recordingId`| `Guid` | ✅       | ID của Recording cần gắn ảnh vào. Phải tồn tại trong DB trước. |

> ⚠️ `recordingId` **không** truyền qua form-data. Đặt trực tiếp vào URL.
> Ví dụ: `POST /api/recordingimage/3fa85f64-5717-4562-b3fc-2c963f66afa6/upload`

#### Form Fields (multipart/form-data)

| Form field | Kiểu   | Bắt buộc | Mô tả                                                          |
|------------|--------|----------|----------------------------------------------------------------|
| `file`     | File   | ✅       | File ảnh (JPG, PNG, GIF, WebP, BMP, SVG, TIFF)                |
| `caption`  | string | ❌       | Chú thích ảnh                                                  |

> **Giới hạn:** kích thước tối đa **10 MB**

### Response `201 Created`

```json
{
  "success": true,
  "message": "Image added successfully",
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "recordingId": "aad8f64-1234-4562-b3fc-2c963f66afa6",
    "imageUrl": "https://gvvmrvflustdxrhxpqso.supabase.co/storage/v1/object/public/recording-images/recordings/{recordingId}/{uuid}.jpg",
    "caption": "Ảnh biểu diễn tại lễ hội",
    "sortOrder": 0
  }
}
```

### Ví dụ (JavaScript / Fetch)

```js
const recordingId = '3fa85f64-5717-4562-b3fc-2c963f66afa6'; // ← bắt buộc, lấy từ recording đã tạo

const formData = new FormData();
formData.append('file', imageFile);          // File object từ <input type="file">
formData.append('caption', 'Ảnh bìa');      // tuỳ chọn
// recordingId KHÔNG append vào formData — đặt trong URL

const res = await fetch(`/api/recordingimage/${recordingId}/upload`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
  // KHÔNG set Content-Type — trình duyệt tự set multipart boundary
});
const data = await res.json();
console.log(data.data.imageUrl); // URL công khai Supabase
```

### Lỗi thường gặp

| Status | Lý do |
|--------|-------|
| `400 Bad Request` | File rỗng, sai định dạng, hoặc vượt 10 MB |
| `400 Bad Request` | `recordingId` không hợp lệ |
| `500 Internal Server Error` | Lỗi kết nối Supabase Storage |

---

## 2. Lấy tất cả ảnh của một Recording

```
GET /api/recordingimage/by-recording/{recordingId}
Authorization: Bearer {token}
```

### Response `200 OK`

```json
{
  "success": true,
  "message": "Found 3 images",
  "data": [
    {
      "id": "...",
      "recordingId": "...",
      "imageUrl": "https://...supabase.co/.../recording-images/recordings/{recordingId}/abc.jpg",
      "caption": "Ảnh bìa",
      "sortOrder": 0
    },
    { "sortOrder": 1, ... },
    { "sortOrder": 2, ... }
  ]
}
```

> Danh sách **đã sắp xếp theo `sortOrder` tăng dần**.  
> `sortOrder = 0` là **ảnh đại diện** (primary).

---

## 3. Lấy ảnh đại diện (primary) của một Recording

```
GET /api/recordingimage/primary/{recordingId}
Authorization: Bearer {token}
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "...",
    "imageUrl": "https://...supabase.co/...",
    "sortOrder": 0
  }
}
```

| Status | Lý do |
|--------|-------|
| `404 Not Found` | Recording chưa có ảnh nào |

---

## 4. Đổi thứ tự ảnh

Truyền mảng `imageId` theo **thứ tự mới**. Index trong mảng = `sortOrder` mới.

```
PUT /api/recordingimage/reorder/{recordingId}
Content-Type: application/json
Authorization: Bearer {token}
```

### Request body

```json
[
  "uuid-of-image-3",
  "uuid-of-image-1",
  "uuid-of-image-2"
]
```

> Phần tử đầu tiên sẽ trở thành `sortOrder = 0` (ảnh đại diện mới).

### Response `200 OK`

```json
{ "success": true, "data": true, "message": "Images reordered successfully" }
```

---

## 5. Xoá một ảnh

```
DELETE /api/recordingimage/{imageId}
Authorization: Bearer {token}
```

> **Tự động xoá file khỏi Supabase Storage** — FE không cần xử lý gì thêm.

### Response `200 OK`

```json
{ "success": true, "data": true, "message": "Deleted successfully" }
```

---

## 6. Xoá Recording (kéo theo xoá ảnh và audio trên cloud)

```
DELETE /api/recording/{recordingId}
Authorization: Bearer {token}
```

> Khi xoá một Recording, backend sẽ **tự động**:
> 1. Xoá `AudioFileUrl` khỏi Supabase Storage bucket `VietTuneArchive`
> 2. Xoá `VideoFileUrl` nếu có
> 3. Xoá toàn bộ ảnh (`RecordingImages`) khỏi bucket `recording-images`
> 4. Xoá DB record (cascade)

FE chỉ cần gọi 1 request, **không cần gọi thêm bất kỳ API xoá file nào**.

---

## 7. Xoá file rác trên Cloud bằng URL

Dùng để dọn dẹp các file đã upload lên Supabase nhưng chưa được lưu vào DB (ví dụ: user huỷ form giữa chừng).

```
DELETE /api/recordingimage/cloud-file?url={publicUrl}
Authorization: Bearer {token}
```

| Query Param | Kiểu   | Bắt buộc | Mô tả                                     |
|-------------|--------|----------|-------------------------------------------|
| `url`       | string | ✅       | URL công khai của file trên Supabase       |

> **Lưu ý:** API này chỉ xoá file trên cloud, không đụng tới database. Nó an toàn để gọi: nếu URL không phải của Supabase hoặc file không tồn tại, nó sẽ bỏ qua và vẫn trả về success.

### Response `200 OK`

```json
{ "success": true, "message": "Cloud file deleted successfully (or skipped if invalid URL)." }
```

---

## 8. Bucket & URL pattern

| Loại file | Bucket Supabase | URL format |
|-----------|-----------------|------------|
| Audio/Video | `VietTuneArchive` | `https://{project}.supabase.co/storage/v1/object/public/VietTuneArchive/{path}` |
| Ảnh recording | `recording-images` | `https://{project}.supabase.co/storage/v1/object/public/recording-images/recordings/{recordingId}/{uuid}.{ext}` |

> Cả hai bucket đều **public read** — FE có thể dùng `imageUrl` trực tiếp trong `<img src>` hoặc `<audio src>` mà không cần thêm token.

---

## 9. Workflow đề xuất cho FE (Submission Form)

```
1. User chọn file ảnh → upload từng ảnh qua POST /upload (nhớ truyền recordingId trên URL)
2. Server trả về { imageUrl, id } → hiển thị preview ngay (dùng imageUrl)
3. User drag-drop để sắp xếp → gọi PUT /reorder với thứ tự mới
4. User xoá ảnh → gọi DELETE /recordingimage/{imageId}
5. Submit form: ảnh đã được lưu trong DB, không cần action gì thêm
```
