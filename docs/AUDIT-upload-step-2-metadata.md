# Audit — Bước 2 Upload: Metadata & AI

> **Phạm vi:** Wizard đóng góp (`UploadMusic`), bước 2 nhãn **“Metadata & AI”** — form metadata, gợi ý từ phát hiện nhạc cụ, GPS, nút “Lấy gợi ý AI”, và điều kiện chuyển bước.
>
> **Không nằm trong phạm vi:** Bước 1 (tải file / phân tích âm thanh chi tiết), Bước 3 (xem lại & gửi), wizard kiểm duyệt chuyên gia (Moderation “Bước 2” khác hẳn).

---

## 1. Bản đồ thành phần

| Thành phần | Vai trò |
|------------|---------|
| `UploadMusic.tsx` | Ghép wizard, `uploadWizardStep === 2`, truyền state vào `UploadFormFields` / `UploadMediaPreview`. |
| `UploadWizardStepper.tsx` | Nhãn bước 2: **“Metadata & AI”**. |
| `UploadFormFields.tsx` | Proxy sang `MetadataStepSection`. |
| `MetadataStepSection.tsx` | Toàn bộ UI metadata: cơ bản, nhạc cụ, panel gợi ý, bối cảnh văn hóa, GPS, nút gợi ý AI. |
| `MetadataSuggestionPanel.tsx` | “Gợi ý metadata từ AI nhạc cụ” — hiển thị + advisory badges + Áp dụng. |
| `useUploadWizard.ts` | `canNavigateToStep`: vào bước 2 cần media + `createdRecordingId` (chế độ tạo mới). |
| `uploadFormValidation.ts` / `isUploadFormComplete` | Kiểm tra tối thiểu trước khi sang bước 3 (không bắt buộc địa lý chi tiết / dân tộc). |
| `useUploadForm.ts` | `handleAiSuggestMetadata` → `suggestMetadata` + fallback `GENRE_ETHNICITY_MAP`. |
| `metadataSuggestService.ts` | `POST` legacy `MetadataSuggest` (genre, title, description). |
| `instrumentMetadataMapper.ts` | `mapInstrumentsToMetadataSuggestions`: suy ra ethnicity / region / vocalStyle / eventType từ nhạc cụ đã phát hiện + catalog + `INSTRUMENT_METADATA_FALLBACK`. |
| `instrumentDetectionService.ts` | `VITE_INSTRUMENT_DETECTION_MOCK`, `VITE_INSTRUMENT_CONFIDENCE`. |

---

## 2. Điều kiện hiển thị & luồng người dùng

- **Wizard chỉ khi tạo mới** (`showWizard = !isEditMode`). Chỉnh sửa bản ghi: form metadata hiện cùng lúc với bước media (không chia 3 bước).
- **Bước 2** hiển thị `UploadMediaPreview` (audio đã upload) + `MetadataStepSection`.
- **Chuyển tới bước 3** (`canNavigateToStep(3)`): cần tiêu đề, nghệ sĩ (hoặc “Không rõ”), tác giả (hoặc dân gian), loại hình biểu diễn; nếu `vocal_accompaniment` / `acappella` thì bắt buộc **lối hát**; nếu `requiresInstruments` thì bắt buộc **ít nhất một nhạc cụ**.
- **Cảnh báo rời trang** (`beforeunload` + `useBlocker`): kích hoạt từ bước ≥ 2 nếu đã nhập một số trường; comment trong code ghi *“Step 2-4”* trong khi wizard chỉ có **3** bước — lệch tài liệu nội bộ.

---

## 3. Nguồn dữ liệu & ranh giới “AI”

### 3.1 Gợi ý metadata từ nhạc cụ (`MetadataSuggestionPanel`)

- Dữ liệu đến từ `aiMetadataSuggestions`, được tính sau upload bước 1 trong `useUploadSubmission` qua `mapInstrumentsToMetadataSuggestions` (khi `instrumentDetectionFlags.confidenceEnabled` và có nhạc cụ hợp lệ).
- **Không** phải kết quả một model riêng cho từng trường metadata: là **ánh xạ** từ catalog nhạc cụ (`originEthnicGroupId`, `vocalStylesData` theo `ethnicGroupId`) và file tĩnh `instrumentMetadataFallback.ts`.
- **Độ tin cậy** trên mỗi dòng gợi ý = confidence của **nhạc cụ phát hiện** (chuẩn hóa 0–1), không phải score độc lập theo “dân tộc” hay “khu vực”. Dễ gây cảm giác “mock” hoặc “AI ảo” khi mọi thanh đều cùng %.
- **Phát hiện nhạc cụ** có thể là mock nếu `VITE_INSTRUMENT_DETECTION_MOCK=true` (`instrumentDetectionService.ts`).

### 3.2 Nút “Lấy gợi ý AI” (`handleAiSuggestMetadata`)

- Gọi API `MetadataSuggest` (legacy) với `genre` = lối hát hiện tại, `title`, `description` (có thể ghép thêm gợi ý GPS văn bản).
- Nút **disabled** khi chưa chọn `vocalStyle` → người dùng **instrumental** (không có lối hát) không dùng được luồng này, dù subtitle chỉ nhấn mạnh “Dân tộc & Nhạc cụ”.
- Khi request lỗi: hiển thị lỗi đồng thời có thể **gán tĩnh** `ethnicity` từ `GENRE_ETHNICITY_MAP` nếu khớp — hành vi kép (vừa báo lỗi vừa đổi form) cần người dùng/chuyên gia hiểu rõ.

### 3.3 Dữ liệu tham chiếu địa lý

- Tỉnh lọc theo macro-region đã chọn; quận/huyện và xã phường nạp theo API khi đã chọn tỉnh/huyện (`useUploadReferenceData.ts`) — hợp lý cho luồng tạo mới.
- Chế độ chỉnh sửa: có thể prefetch toàn bộ quận/xã rồi effect theo tỉnh ghi đè — cần kiểm tra hồi quy khi mở bản ghi cũ.

---

## 4. Vấn đề đã xác minh trong code

### A. UX / trình bày gợi ý (ưu tiên sửa nếu demo với chuyên gia)

| ID | Mô tả | Vị trí / cơ chế |
|----|--------|------------------|
| **U1** | **Hai khối “Lối hát / Thể loại” và “Loại sự kiện” dùng chung nhóm advisory `genre`.** Cùng top value, cùng “Các gợi ý khác”, cùng badge xung đột — dễ hiểu nhầm là dữ liệu mock hoặc copy-paste. | `MetadataSuggestionPanel.tsx`: `advisoryByLegacyField.set('vocalStyle', group)` và `set('eventType', group)` khi `group.field === 'genre'`. `instrumentMetadataMapper.ts`: `mapLegacyFieldToAdvisoryField` gom `vocalStyle` + `eventType` → `'genre'`. |
| **U2** | **Nhãn “AI nhạc cụ”** với thanh % trùng nhau trên mọi trường: không giải thích rằng % là từ **model nhạc cụ**, không phải từng metadata. | `instrumentMetadataMapper.ts` (`pushSuggestion` dùng chung `conf` từ `d.confidence`). |

### B. Hành vi & nhất quán

| ID | Mô tả | Ghi chú |
|----|--------|---------|
| **B1** | `handleAiSuggestMetadata` catch: vừa `setAiSuggestError` vừa có thể `setEthnicity` từ map tĩnh. | Có thể gây “đã lỗi nhưng form vẫn đổi”. |
| **B2** | `MetadataSuggestionPanel`: `resolveTopValue` ưu tiên `advisory.candidates[0]`; với `eventType`, giá trị top có thể **không** khớp bất kỳ hàng `eventType` thực trong `suggestions` nếu bucket genre chỉ chứa vocal — `pickBestRowForValue` trả `null`, mất dòng “Nguồn” / thanh confidence cho block đó. | Trường hợp biên cần test thủ công. |

### C. Chất lượng chữ / i18n nhỏ

| ID | Mô tả |
|----|--------|
| **C1** | Chuỗi độ chính xác GPS: `Chinh xac`, `Trung binh`, `Thap` — không dấu, không nhất quán với phần còn của UI tiếng Việt. `MetadataStepSection.tsx` (`gpsAccuracyLabel`, `Do chinh xac`). |

### D. Tài liệu nội bộ

| ID | Mô tả |
|----|--------|
| **D1** | Comment “Step 2-4” trong guard rời trang `UploadMusic.tsx` — wizard thực tế 3 bước. |

---

## 5. Bảng mức độ (đề xuất)

| ID | Tóm tắt | Mức | Lý do |
|----|---------|-----|--------|
| **U1** | vocalStyle & eventType dùng chung advisory genre | **P1** | Hiểu sai nghiệp vụ / tin cậy demo |
| **U2** | % confidence không phân biệt nguồn giải thích | **P2** | Minh bạch sản phẩm |
| **B1** | Lỗi API + vẫn set ethnicity từ map | **P2** | Hành vi khó đoán |
| **B2** | Top advisory không khớp hàng eventType | **P2** | UI thiếu nguồn / thanh |
| **C1** | Chuỗi GPS không dấu | **P3** | Polish |
| **D1** | Comment sai số bước | **P3** | Bảo trì |

---

## 6. Hướng xử lý gợi ý (ngắn)

1. **Tách advisory cho `eventType`** (hoặc không dùng bucket `genre` cho eventType; hiển thị riêng danh sách ứng viên từ `rows` của từng field) để tránh trùng hoàn toàn với lối hát.
2. **Tooltip / dòng chú thích** dưới panel: “Độ tin cậy hiển thị theo mức tin cậy phát hiện nhạc cụ; gợi ý dân tộc/vùng/lối hát được suy ra từ danh mục.”
3. **Tách rõ** hai luồng trong UI: (a) “Gợi ý từ nhạc cụ đã phát hiện” vs (b) “Gợi ý từ API MetadataSuggest theo lối hát”, tránh gộp nhầm thành một “AI”.
4. Rà soát **B2** với bộ dữ liệu thật (ít nhất một nhạc cụ chỉ có `eventType` từ fallback, `vocalStyle` từ DB) và điều chỉnh `resolveTopValue` / `pickBestRowForValue` nếu cần.
5. Sửa copy GPS sang tiếng Việt có dấu; cập nhật comment bước wizard.

---

## 7. Checklist kiểm thử thủ công (Bước 2)

- [ ] Tạo mới: sau bước 1, vào bước 2 khi đã có `createdRecordingId`.
- [ ] Bật/tắt `VITE_INSTRUMENT_DETECTION_MOCK` — panel gợi ý có/không khớp kỳ vọng.
- [ ] `vocal_accompaniment`: thiếu lối hát → không sang bước 3; có lối hát → “Lấy gợi ý AI” hoạt động.
- [ ] `instrumental`: không có trường lối hát → nút AI suggest disabled; vẫn điền metadata tay và gửi.
- [ ] Áp dụng từng nút “Áp dụng” trên `MetadataSuggestionPanel` — form cập nhật đúng field.
- [ ] Chọn tỉnh → quận → xã; đổi tỉnh xóa cấp dưới.
- [ ] GPS: từ chối quyền / thành công / reverse geocode thất bại.

---

*Tài liệu được rút ra từ đọc mã nguồn frontend (React/Vite) tại nhánh làm việc hiện tại; hành vi backend `MetadataSuggest` và model phân tích nhạc cụ cần đối chiếu thêm với tài liệu API / môi trường triển khai.*
