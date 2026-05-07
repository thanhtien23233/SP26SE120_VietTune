# 🧪 VietTune — Dữ liệu Test Sạch (Manual Testing)

> Được sinh ra từ source code: `src/types/`, `src/api/adapters.ts`, `src/pages/`  
> Cập nhật: 2026-04-18

---

## 📋 MỤC LỤC

1. [Tài khoản người dùng](#1-tài-khoản-người-dùng)
2. [Dân tộc (Ethnicity)](#2-dân-tộc-ethnicity)
3. [Nhạc cụ (Instrument)](#3-nhạc-cụ-instrument)
4. [Nghệ nhân (Performer)](#4-nghệ-nhân-performer)
5. [Bản ghi âm (Recording)](#5-bản-ghi-âm-recording)
6. [Submission (Nộp bài)](#6-submission-nộp-bài)
7. [Knowledge Base (KB)](#7-knowledge-base-kb)
8. [Annotation (Chú thích)](#8-annotation-chú-thích)
9. [Copyright Dispute (Tranh chấp)](#9-copyright-dispute-tranh-chấp)
10. [Embargo (Phong tỏa)](#10-embargo-phong-tỏa)
11. [Ma trận test theo role](#11-ma-trận-test-theo-role)

---

## 1. Tài khoản người dùng

> Roles: `Admin`, `Moderator`, `Researcher`, `Contributor`, `Expert`, `User`

### 1.1 Tài khoản hệ thống (Pre-seeded)

| # | Role | Email | Password | Username | Full Name |
|---|------|-------|----------|----------|-----------|
| U-01 | **Admin** | `admin@viettune.vn` | `Admin@123456` | `admin_vt` | Nguyễn Quản Trị |
| U-02 | **Moderator** | `moderator@viettune.vn` | `Mod@123456` | `mod_vt` | Trần Kiểm Duyệt |
| U-03 | **Expert** | `expert01@viettune.vn` | `Expert@123456` | `expert_vt01` | Lê Chuyên Gia |
| U-04 | **Researcher** | `researcher@viettune.vn` | `Research@123456` | `researcher_vt` | Phạm Nghiên Cứu |
| U-05 | **Contributor** | `contributor@viettune.vn` | `Contrib@123456` | `contrib_vt` | Hoàng Đóng Góp |
| U-06 | **User** (guest) | `user01@viettune.vn` | `User@123456` | `user_vt01` | Mai Người Dùng |

### 1.2 Tài khoản đăng ký mới (dùng cho test luồng Register)

| # | Mục đích | Email | Password | Username | Full Name | Phone |
|---|----------|-------|----------|----------|-----------|-------|
| U-07 | Register thành công | `newuser_test@gmail.com` | `NewUser@123` | `newuser_test` | Kiểm Tra Đăng Ký | `0912345678` |
| U-08 | Register Researcher | `researcher_new@gmail.com` | `Research@456` | `researcher_new` | Nghiên Cứu Mới | `0987654321` |
| U-09 | Email trùng (expect lỗi) | `admin@viettune.vn` | `Admin@123456` | `dup_user` | Dup Email Test | `0900000001` |
| U-10 | Password yếu (expect lỗi) | `weakpass@gmail.com` | `123456` | `weakpass_test` | Weak Pass Test | `0900000002` |

### 1.3 Confirm OTP

| # | Tài khoản | OTP mẫu | Ghi chú |
|---|-----------|---------|---------|
| OTP-01 | U-07 | Nhận từ email | OTP hợp lệ — confirm trong 5 phút |
| OTP-02 | U-07 | `000000` | OTP sai — expect lỗi |

---

## 2. Dân tộc (Ethnicity)

> Source: `src/types/reference.ts` → `Region` enum

### 2.1 Enum Region hợp lệ

| Enum Value | Nhãn tiếng Việt |
|------------|-----------------|
| `NORTHERN_MOUNTAINS` | Vùng núi phía Bắc |
| `RED_RIVER_DELTA` | Đồng bằng sông Hồng |
| `NORTH_CENTRAL` | Bắc Trung Bộ |
| `SOUTH_CENTRAL_COAST` | Duyên hải Nam Trung Bộ |
| `CENTRAL_HIGHLANDS` | Tây Nguyên |
| `SOUTHEAST` | Đông Nam Bộ |
| `MEKONG_DELTA` | Đồng bằng sông Cửu Long |

### 2.2 Dữ liệu Ethnicity mẫu

| ID | name | nameVietnamese | region | population | language |
|----|------|----------------|--------|------------|----------|
| `eth-001` | Kinh | Người Kinh | `RED_RIVER_DELTA` | 77000000 | Tiếng Việt |
| `eth-002` | Tay | Người Tày | `NORTHERN_MOUNTAINS` | 1845000 | Tiếng Tày |
| `eth-003` | Thai | Người Thái | `NORTHERN_MOUNTAINS` | 1820000 | Tiếng Thái |
| `eth-004` | Khmer | Người Khmer | `MEKONG_DELTA` | 1319000 | Tiếng Khmer |
| `eth-005` | Ede | Người Ê-đê | `CENTRAL_HIGHLANDS` | 398000 | Tiếng Ê-đê |

---

## 3. Nhạc cụ (Instrument)

> Source: `src/types/reference.ts` → `InstrumentCategory` enum

### 3.1 Enum InstrumentCategory hợp lệ

| Enum Value | Nhãn |
|------------|------|
| `STRING` | Dây |
| `WIND` | Hơi |
| `PERCUSSION` | Gõ |
| `IDIOPHONE` | Tự vang |
| `VOICE` | Giọng |

### 3.2 Dữ liệu Instrument mẫu

| ID | name | nameVietnamese | category | ethnicity |
|----|------|----------------|----------|-----------|
| `ins-001` | Dan Bau | Đàn Bầu | `STRING` | Kinh |
| `ins-002` | Dan Tranh | Đàn Tranh | `STRING` | Kinh |
| `ins-003` | Trong Dong | Trống Đồng | `PERCUSSION` | Kinh |
| `ins-004` | Khen | Khèn | `WIND` | Tày-Thái |
| `ins-005` | Gong | Cồng | `IDIOPHONE` | Ê-đê |
| `ins-006` | Dan Nguyet | Đàn Nguyệt | `STRING` | Kinh |

---

## 4. Nghệ nhân (Performer)

### 4.1 Dữ liệu Performer mẫu

| ID | name | nameVietnamese | title | specialization | birthYear | isVerified |
|----|------|----------------|-------|----------------|-----------|------------|
| `perf-001` | Nguyen Van A | Nghệ nhân Nguyễn Văn A | NSND | `["dan-bau","hat-cheo"]` | 1945 | `true` |
| `perf-002` | Tran Thi B | Nghệ nhân Trần Thị B | NSƯT | `["dan-tranh"]` | 1962 | `true` |
| `perf-003` | Le Van C | Nghệ sĩ Lê Văn C | — | `["gong","cong-chieng"]` | 1978 | `false` |

---

## 5. Bản ghi âm (Recording)

> Source: `src/types/recording.ts`

### 5.1 Enum hợp lệ

**RecordingType:**
| Enum | Nhãn |
|------|------|
| `INSTRUMENTAL` | Nhạc cụ |
| `VOCAL` | Giọng hát |
| `CEREMONIAL` | Nghi lễ |
| `FOLK_SONG` | Dân ca |
| `EPIC` | Sử thi |
| `LULLABY` | Ru em |
| `WORK_SONG` | Hò lao động |
| `OTHER` | Khác |

**RecordingQuality:**
| Enum | Nhãn |
|------|------|
| `PROFESSIONAL` | Chuyên nghiệp |
| `FIELD_RECORDING` | Ghi âm thực địa |
| `ARCHIVE` | Lưu trữ |
| `DIGITIZED` | Số hóa |

**VerificationStatus:**
| Enum | Nhãn |
|------|------|
| `PENDING` | Chờ duyệt |
| `VERIFIED` | Đã xác minh |
| `REJECTED` | Từ chối |
| `UNDER_REVIEW` | Đang xem xét |

### 5.2 Dữ liệu Recording mẫu

| ID | title | titleVietnamese | recordingType | ethnicity | region | quality | duration(s) | verificationStatus |
|----|-------|-----------------|---------------|-----------|--------|---------|-------------|-------------------|
| `rec-001` | Hat Xoan Phu Tho | Hát Xoan Phú Thọ | `FOLK_SONG` | `eth-001` | `RED_RIVER_DELTA` | `FIELD_RECORDING` | 245 | `VERIFIED` |
| `rec-002` | Quan Ho Bac Ninh | Quan Họ Bắc Ninh | `FOLK_SONG` | `eth-001` | `RED_RIVER_DELTA` | `PROFESSIONAL` | 312 | `VERIFIED` |
| `rec-003` | Then Tai Bac | Then Tây Bắc | `CEREMONIAL` | `eth-002` | `NORTHERN_MOUNTAINS` | `FIELD_RECORDING` | 480 | `PENDING` |
| `rec-004` | Khan Tay Nguyen | Khan Tây Nguyên | `EPIC` | `eth-005` | `CENTRAL_HIGHLANDS` | `ARCHIVE` | 1800 | `UNDER_REVIEW` |
| `rec-005` | Ru Con Nam Bo | Ru Con Nam Bộ | `LULLABY` | `eth-001` | `MEKONG_DELTA` | `DIGITIZED` | 180 | `REJECTED` |

### 5.3 Recording Metadata mẫu (cho rec-001)

```json
{
  "tuningSystem": "Ngũ cung",
  "modalStructure": "Điệu xuân",
  "tempo": 72,
  "ritualContext": "Lễ hội mùa xuân",
  "regionalVariation": "Phú Thọ",
  "lyrics": "Mời lúa về kho, mời hoa về vườn...",
  "lyricsTranslation": "Invite the rice to the barn, invite the flowers to the garden...",
  "culturalSignificance": "Di sản văn hóa phi vật thể UNESCO",
  "historicalContext": "Xuất hiện từ thời Hùng Vương",
  "recordingQuality": "FIELD_RECORDING",
  "originalSource": "Viện Âm nhạc Việt Nam"
}
```

---

## 6. Submission (Nộp bài)

> Source: `src/types/moderation.ts` — SubmissionStatus (Backend enum số 0–5)

### 6.1 Mapping trạng thái Submission

| Backend (số) | FE ModerationStatus | Nhãn UI |
|-------------|---------------------|---------|
| `0` | `PENDING_REVIEW` | Chờ duyệt |
| `1` | `PENDING_REVIEW` | Chờ duyệt |
| `2` | `APPROVED` | Đã duyệt |
| `3` | `REJECTED` | Từ chối |
| `4` | `TEMPORARILY_REJECTED` | Từ chối tạm |
| `5` | `EMBARGOED` | Phong tỏa |

### 6.2 Dữ liệu Submission mẫu

| ID | recording | uploader | status (số) | claimedBy | notes |
|----|-----------|----------|-------------|-----------|-------|
| `sub-001` | `rec-001` | U-05 (Contributor) | `0` | — | Mới nộp |
| `sub-002` | `rec-002` | U-05 | `1` | U-03 (Expert) | Đã claim |
| `sub-003` | `rec-003` | U-05 | `2` | U-03 | Được duyệt |
| `sub-004` | `rec-004` | U-05 | `3` | U-03 | Bị từ chối vĩnh viễn |
| `sub-005` | `rec-005` | U-05 | `4` | U-03 | Yêu cầu chỉnh sửa |
| `sub-006` | — | U-05 | `5` | U-03 | Bị phong tỏa |

### 6.3 Upload payload mẫu (POST Submission)

```json
{
  "title": "Hát Xoan Phú Thọ - Bản mới",
  "description": "Bản ghi âm thực địa tại xã Kim Đức, Phú Thọ năm 2024",
  "durationSeconds": 245,
  "performerName": "Nguyễn Văn A",
  "recordingDate": "2024-03-15",
  "gpsLatitude": 21.3956,
  "gpsLongitude": 105.2348,
  "lyricsOriginal": "Mời lúa về kho...",
  "lyricsVietnamese": "Invite the rice to the barn...",
  "performanceContext": "Lễ hội mùa xuân",
  "tempo": 72,
  "ethnicGroupId": "eth-001",
  "instrumentIds": ["ins-001", "ins-003"]
}
```

---

## 7. Knowledge Base (KB)

> Source: `src/types/knowledgeBase.ts`

### 7.1 KB Status

| Số | Nhãn |
|----|------|
| `0` | Bản nháp |
| `1` | Đã xuất bản |
| `2` | Lưu trữ |

### 7.2 KB Categories

| Category key | Nhãn |
|-------------|------|
| `instrument` | Nhạc cụ |
| `ceremony` | Nghi lễ |
| `term` | Thuật ngữ |
| `general` | Tổng hợp |

### 7.3 Dữ liệu KB Entry mẫu

| ID | title | category | status |
|----|-------|----------|--------|
| `kb-001` | Đàn Bầu — Nhạc cụ dân tộc đặc trưng | `instrument` | `1` (Xuất bản) |
| `kb-002` | Lễ hội Cồng chiêng Tây Nguyên | `ceremony` | `1` (Xuất bản) |
| `kb-003` | Thuật ngữ: Ngũ cung | `term` | `0` (Nháp) |
| `kb-004` | Tổng quan âm nhạc dân gian Việt Nam | `general` | `2` (Lưu trữ) |

### 7.4 Create KB Entry payload mẫu

```json
{
  "title": "Đàn Tranh — Đặc điểm và lịch sử",
  "content": "Đàn tranh là nhạc cụ dây gảy của người Việt, có 16-25 dây, được làm từ gỗ và dây thép hoặc nylon...",
  "category": "instrument",
  "citations": [
    {
      "citation": "Viện Âm nhạc Việt Nam (2020). Nhạc cụ dân tộc Việt Nam.",
      "url": "https://example.com/citation1"
    }
  ]
}
```

---

## 8. Annotation (Chú thích)

> Source: `src/types/annotation.ts`

### 8.1 Annotation Types hợp lệ

| Type key | Nhãn |
|----------|------|
| `scholarly_note` | Ghi chú học thuật |
| `rare_variant` | Dị bản hiếm gặp |
| `research_link` | Tài liệu nghiên cứu |
| `general` | Ghi chú chung |

### 8.2 Dữ liệu Annotation mẫu

| ID | recordingId | type | content |
|----|-------------|------|---------|
| `ann-001` | `rec-001` | `scholarly_note` | "Đây là biến thể cổ nhất của hát Xoan, ghi chép năm 1952 bởi Trần Văn Khê" |
| `ann-002` | `rec-002` | `research_link` | "Xem thêm nghiên cứu: Quan Họ và văn hóa vùng Kinh Bắc, NXB KHXH 2018" |
| `ann-003` | `rec-003` | `rare_variant` | "Biến thể Then chỉ được hát trong lễ cầu mưa, rất hiếm gặp" |
| `ann-004` | `rec-004` | `general` | "Cần xác minh thêm người thực hiện sử thi này" |

---

## 9. Copyright Dispute (Tranh chấp bản quyền)

> Source: `src/types/copyrightDispute.ts`

### 9.1 Dispute Status

| Số | Nhãn |
|----|------|
| `0` | Mở |
| `1` | Đang xem xét |
| `2` | Giữ lại bản ghi |
| `3` | Gỡ bản ghi |
| `4` | Từ chối báo cáo |

### 9.2 Dữ liệu Dispute mẫu

| disputeId | recordingId | reportedByUserId | reasonCode | status |
|-----------|-------------|------------------|------------|--------|
| `disp-001` | `rec-001` | U-06 | `UNAUTHORIZED_USE` | `0` (Mở) |
| `disp-002` | `rec-002` | U-04 | `MISATTRIBUTION` | `1` (Đang xem xét) |
| `disp-003` | `rec-003` | U-06 | `DUPLICATE_CONTENT` | `2` (Giữ lại) |

### 9.3 Create Dispute payload mẫu

```json
{
  "recordingId": "rec-001",
  "reasonCode": "UNAUTHORIZED_USE",
  "description": "Bản ghi âm này được sử dụng mà không có sự cho phép của cộng đồng địa phương",
  "evidenceUrls": [
    "https://example.com/evidence1.pdf"
  ]
}
```

---

## 10. Embargo (Phong tỏa)

> Source: `src/types/embargo.ts`

### 10.1 Embargo Status

| Số | Nhãn |
|----|------|
| `1` | Không có |
| `2` | Đã lên lịch |
| `3` | Đang áp dụng |
| `4` | Đã hết hạn |
| `5` | Đã gỡ bỏ |

### 10.2 Dữ liệu Embargo mẫu

| ID | recordingId | status | startDate | endDate | reason |
|----|-------------|--------|-----------|---------|--------|
| `emb-001` | `rec-004` | `3` (Đang áp dụng) | `2026-01-01` | `2026-12-31` | Đang trong quá trình xin phép cộng đồng |
| `emb-002` | `rec-005` | `2` (Lên lịch) | `2026-05-01` | `2026-06-30` | Theo yêu cầu của nghệ nhân |

---

## 11. Ma trận test theo role

> Dùng để verify phân quyền (Authorization) theo từng chức năng

### 11.1 Quyền truy cập trang

| Trang / Chức năng | Admin | Moderator | Expert | Researcher | Contributor | User (Guest) |
|-------------------|:-----:|:---------:|:------:|:----------:|:-----------:|:------------:|
| Trang chủ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Khám phá (Explore) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chi tiết bản ghi | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload bản ghi | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Contributions (My) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Moderation Queue | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Admin Dashboard | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Expert | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Knowledge Base (edit) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Researcher Dashboard | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Analytics | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Chatbot | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 11.2 Luồng test kiểm duyệt (Submission Lifecycle)

```
[Contributor U-05]
   └─ Upload bản ghi → sub-001 (status=0, PENDING_REVIEW)
        ↓
[Expert U-03]
   └─ Claim submission → sub-001 (status=1, IN_REVIEW)
        ↓
   ├─ Approve → status=2 (APPROVED) → Recording published
   ├─ Reject → status=3 (REJECTED)
   └─ Temp Reject → status=4 (TEMPORARILY_REJECTED)
        ↓ (Contributor chỉnh sửa và resubmit)
   └─ Approve → status=2 (APPROVED)
```

### 11.3 Test cases biên (Edge Cases)

| TC# | Scenario | Input | Expected |
|-----|----------|-------|----------|
| EC-01 | Title rỗng | `title: ""` | 400 / validation error |
| EC-02 | Duration âm | `durationSeconds: -1` | 400 / validation error |
| EC-03 | GPS ngoài Việt Nam | `lat: 90, lng: 200` | 400 hoặc warning |
| EC-04 | File audio > 100MB | File 150MB | 413 / reject |
| EC-05 | OTP hết hạn | OTP > 5 phút | 400 / expired |
| EC-06 | Duplicate email register | Email đã tồn tại | 409 / conflict |
| EC-07 | Truy cập Admin khi là Contributor | URL `/admin` | 403 Forbidden |
| EC-08 | Annotation trên recording chưa verify | rec PENDING | Chỉ Expert/Researcher mới được thêm |
| EC-09 | KB entry status=2 (Lưu trữ) | Xem public | 404 hoặc ẩn |
| EC-10 | Embargo đang áp dụng | Download audio | Blocked / 403 |

---

## 📌 GHI CHÚ SỬ DỤNG

> [!TIP]
> - Các ID dạng `eth-001`, `ins-001`... là **ID mẫu** — thay bằng ID thực từ DB khi test.
> - Password tuân theo policy: **8+ ký tự, có chữ hoa, số, ký tự đặc biệt**.
> - Dùng tài khoản theo đúng role khi test từng flow để kiểm tra phân quyền.

> [!WARNING]
> - **Không dùng dữ liệu này trên môi trường Production.**
> - Các URL audio/video trong test data là placeholder, cần thay bằng file thực.

---

*File được tạo tự động từ source code bởi Antigravity Agent — 2026-04-18*
