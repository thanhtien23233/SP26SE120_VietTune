# PLAN: GPS Tagging — Sửa lỗi & Bổ sung đầy đủ

**Slug:** `gps-tagging`  
**Yêu cầu gốc:** Fix GPS coordinate payload bug + bổ sung hiển thị/chỉnh sửa tọa độ GPS toàn hệ thống  
**Phạm vi:** Chỉ kế hoạch — không bao gồm triển khai code trong tài liệu này.

---

## Phase -1 — Context Check

| Mục | Trạng thái |
|-----|------------|
| **Backend geocode** | ✅ `GeocodeController.cs` — reverse geocode qua Nominatim, đã hoàn chỉnh |
| **Frontend geocode service** | ✅ `geocodeService.ts` — gọi `GET Geocode/reverse?lat=&lon=`, fallback khi lỗi |
| **DTO** | ✅ `RecordingDto` có `gpsLatitude?: number`, `gpsLongitude?: number` |
| **Submission mapping** | ✅ `submissionService.ts` map `gpsLatitude`/`gpsLongitude` từ API response |
| **Upload UI nút GPS** | ✅ `MetadataStepSection.tsx` — nút "Lấy vị trí hiện tại", loading/error states |
| **GPS handler** | ⚠️ `handleGetGpsLocation` trong `UploadMusic.tsx` — lấy tọa độ OK nhưng **chỉ ghi vào `recordingLocation` dạng text**, không lưu lat/lon riêng |
| **Payload bug** | 🔴 Line 3166-3167: `gpsLatitude: 0, gpsLongitude: 0` — hardcode = 0 thay vì dùng giá trị thực |
| **RecordingDetailPage** | ❌ Không hiển thị GPS/tọa độ |
| **EditRecordingPage** | ❌ Không có section GPS |
| **ContributionsPage** | ✅ Hiển thị tọa độ khi ≠ 0 |
| **buildRecordingUploadPayload** | ❌ Không map `gpsLatitude`/`gpsLongitude` từ `LocalRecording` |
| **LocalRecording type** | ❌ Thiếu field `gpsLatitude`/`gpsLongitude` |

---

## Phase 0 — Socratic Gate (Đã phân tích, không cần hỏi thêm)

**Các câu hỏi đã tự trả lời:**

1. **Tại sao GPS gửi 0,0?** → Vì `handleGetGpsLocation` lấy tọa độ thành công nhưng chỉ append text vào `recordingLocation`, không lưu vào state riêng. Payload construct dùng hardcode `0`.
2. **Backend có nhận gpsLatitude/gpsLongitude?** → Có, `RecordingDto` backend có 2 field này (type `double?`).
3. **Có cần mini-map?** → Optional enhancement, không blocking. Ưu tiên fix core trước.

---

## Phase 1 — Bug Fixes (Critical)

### Task 1.1: Thêm state `gpsLatitude` / `gpsLongitude` trong `UploadMusic.tsx`

**File:** `src/components/features/UploadMusic.tsx`

**Thay đổi:**
- Thêm 2 state mới sau dòng `gpsError`:
  ```ts
  const [capturedGpsLat, setCapturedGpsLat] = useState<number | null>(null);
  const [capturedGpsLon, setCapturedGpsLon] = useState<number | null>(null);
  ```
- Trong `handleGetGpsLocation`, sau khi lấy `pos.coords` thành công:
  ```ts
  setCapturedGpsLat(latitude);
  setCapturedGpsLon(longitude);
  ```

**Verify:** Đặt `console.log` tạm → bấm nút GPS → xác nhận state có giá trị thực.

---

### Task 1.2: Fix payload gửi tọa độ thực lên API

**File:** `src/components/features/UploadMusic.tsx` (~line 3166-3167)

**Trước:**
```ts
gpsLatitude: 0,
gpsLongitude: 0,
```

**Sau:**
```ts
gpsLatitude: capturedGpsLat ?? 0,
gpsLongitude: capturedGpsLon ?? 0,
```

**Verify:** Submit bản ghi → kiểm tra Network tab → payload phải chứa tọa độ thực.

---

### Task 1.3: Load GPS coordinates khi edit mode

**File:** `src/components/features/UploadMusic.tsx` (~line 2676, 2792)

Khi load recording để edit, phải restore lại tọa độ từ data:
```ts
setCapturedGpsLat(recording.gpsLatitude ?? null);
setCapturedGpsLon(recording.gpsLongitude ?? null);
```

**Lưu ý:** Cần kiểm tra shape của `recording` trong edit flow (có chứa `gpsLatitude` hay nằm trong nested field).

---

## Phase 2 — Type Safety

### Task 2.1: Bổ sung GPS fields vào `LocalRecording` type

**File:** `src/types/recording.ts` (hoặc file chứa `LocalRecording`)

Thêm:
```ts
gpsLatitude?: number | null;
gpsLongitude?: number | null;
```

---

### Task 2.2: Update `buildRecordingUploadPayload` trong `recordingDto.ts`

**File:** `src/services/recordingDto.ts`

Trong function `buildRecordingUploadPayload`, thêm mapping:
```ts
gpsLatitude: recording.gpsLatitude ?? null,
gpsLongitude: recording.gpsLongitude ?? null,
```

---

## Phase 3 — UI Display & Enhancement

### Task 3.1: Hiển thị tọa độ GPS trên `RecordingDetailPage`

**File:** `src/pages/RecordingDetailPage.tsx`

- Thêm section "Vị trí ghi âm" hiển thị:
  - `recordingLocation` (text)
  - `gpsLatitude, gpsLongitude` nếu ≠ 0 (hiển thị dạng link Google Maps)
- Format: `📍 10.966070, 106.492149` → click mở Google Maps URL:
  ```
  https://www.google.com/maps?q={lat},{lon}
  ```

---

### Task 3.2: GPS section trong `EditRecordingPage`

**File:** `src/pages/EditRecordingPage.tsx`

- Hiển thị tọa độ hiện tại (read-only hoặc editable)
- Nút "Cập nhật vị trí GPS" tái sử dụng logic `handleGetGpsLocation`
- Khi save, include `gpsLatitude`/`gpsLongitude` trong payload

---

### Task 3.3: Hiển thị GPS trên MetadataStepSection (visual feedback)

**File:** `src/components/features/upload/steps/MetadataStepSection.tsx`

- Sau khi bấm GPS thành công, hiển thị badge/chip:
  ```
  ✅ Đã gắn GPS: 10.966070, 106.492149
  ```
- Truyền `capturedGpsLat`, `capturedGpsLon` từ parent qua props

**Props mới cần thêm:**
```ts
capturedGpsLat: number | null;
capturedGpsLon: number | null;
```

---

## Phase 4 — Optional Enhancements (thấp ưu tiên hơn)

### Task 4.1: Mini-map preview (OpenStreetMap embed)

Khi GPS coordinates có sẵn, hiển thị iframe mini-map:
```html
<iframe
  src="https://www.openstreetmap.org/export/embed.html?bbox={lon-0.01},{lat-0.01},{lon+0.01},{lat+0.01}&marker={lat},{lon}"
  width="300" height="200"
/>
```

**Nơi hiển thị:**
- Upload wizard (sau khi gắn GPS)
- RecordingDetailPage
- ContributionsPage detail overlay

### Task 4.2: GPS accuracy indicator

Hiển thị `pos.coords.accuracy` (mét) để user biết độ chính xác:
- `< 50m` → "Chính xác cao"
- `50-200m` → "Trung bình"  
- `> 200m` → "Thấp — nên kiểm tra lại"

---

## Phase X — Verification Checklist

| # | Kiểm tra | Pass? |
|---|----------|-------|
| 1 | Bấm nút "Lấy vị trí hiện tại" → tọa độ thực được lưu vào state | ☐ |
| 2 | Submit bản ghi → Network tab: payload có `gpsLatitude ≠ 0`, `gpsLongitude ≠ 0` | ☐ |
| 3 | Xem chi tiết bản ghi vừa submit → hiển thị tọa độ GPS | ☐ |
| 4 | ContributionsPage detail → hiển thị tọa độ đúng (đã OK trước đó) | ☐ |
| 5 | Edit mode → load lại tọa độ GPS đã lưu | ☐ |
| 6 | Từ chối quyền GPS → hiển thị lỗi friendly, không crash | ☐ |
| 7 | Trình duyệt không hỗ trợ GPS → hiển thị lỗi | ☐ |
| 8 | Không có GPS (desktop) → `recordingLocation` vẫn hoạt động bình thường | ☐ |
| 9 | GPS badge/chip hiển thị sau khi gắn thành công | ☐ |
| 10 | TypeScript compile không lỗi | ☐ |

---

## Task Priority & Effort Estimate

| Task | Ưu tiên | Effort | Files affected |
|------|---------|--------|----------------|
| 1.1 Thêm GPS state | 🔴 Critical | 5 min | `UploadMusic.tsx` |
| 1.2 Fix payload | 🔴 Critical | 2 min | `UploadMusic.tsx` |
| 1.3 Load GPS edit mode | 🔴 Critical | 10 min | `UploadMusic.tsx` |
| 2.1 Update LocalRecording type | 🟡 High | 5 min | `types/recording.ts` |
| 2.2 Update buildRecordingUploadPayload | 🟡 High | 5 min | `recordingDto.ts` |
| 3.1 RecordingDetailPage display | 🟡 High | 15 min | `RecordingDetailPage.tsx` |
| 3.2 EditRecordingPage GPS | 🟢 Medium | 20 min | `EditRecordingPage.tsx` |
| 3.3 MetadataStepSection feedback | 🟢 Medium | 10 min | `MetadataStepSection.tsx` |
| 4.1 Mini-map preview | ⚪ Low | 20 min | Multiple |
| 4.2 GPS accuracy indicator | ⚪ Low | 10 min | `UploadMusic.tsx`, `MetadataStepSection.tsx` |

**Tổng effort ước tính:** ~1.5–2 giờ (Phase 1-3), ~30 phút thêm (Phase 4)

---

## Agent Assignment

| Phase | Agent | Ghi chú |
|-------|-------|---------|
| Phase 1 (Bug fixes) | Code Agent | Sửa trực tiếp, verify bằng TypeScript compile |
| Phase 2 (Types) | Code Agent | Chỉnh type definitions |
| Phase 3 (UI) | Code Agent | Thêm display components, props drilling |
| Phase 4 (Enhancement) | Code Agent | Optional, sau khi Phase 1-3 pass |
| Phase X (Verify) | Manual QA | Test trên browser thật với GPS permission |
