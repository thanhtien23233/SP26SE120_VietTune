# PLAN: Feature Gaps — Bổ sung chức năng còn thiếu

**Slug:** `feature-gaps`
**Ngày tạo:** 2026-04-10  
**Cập nhật lần cuối:** 2026-04-15
**Nguồn:** Bảng đối chiếu yêu cầu vs hiện trạng code + Swagger API
**Phạm vi:** Kế hoạch + **trạng thái triển khai** (được cập nhật khi có thay đổi lớn).

> **Đã hoàn thành trước đó:**
> - GPS tagging → `PLAN-gps-tagging.md` (Phase 1–4 done)
> - Knowledge Base editing UI + Rich-text editor → `PLAN-kb-editing-ui.md` (Phase 1–5+X done)
> - §A Synchronized dual audio player → implemented (Phase create done, lint/build pass)
> - §B Export academic datasets (JSON/CSV/XLSX + dialog) → `PLAN-export-academic-dataset.md` (Phase 1–3 + X done)
> - §L Notification web flow (polling + SignalR + API alignment) → `PLAN-notification-web-flow.md` (Phase 1–8 + X code done; một số mục runtime/manual còn trong plan đó)

---

## Mục lục

| # | Feature | Loại | Priority | Plan section |
|---|---------|------|----------|-------------|
| A | Synchronized dual audio player (comparative analysis) | ✅ Hoàn thành | Cao | §A |
| B | Export academic datasets (CSV/XLSX + filters) | ✅ Hoàn thành | Cao | §B |
| C | Expert annotation tools (scholarly) | ✅ Hoàn thành (code) | Trung bình | §C |
| D | AI supervision dashboard (real data) | ✅ Hoàn thành (code) | Trung bình | §D |
| E | Embargo / Copyright moderation workflow | ✅ Hoàn thành (code) | Trung bình | §E |
| F | Collection analytics — coverage gap charts | ✅ Hoàn thành (code) | Cao | §F |
| G | QA message flagging → AI retraining pipeline | ⚠️ Bổ sung | Trung bình | §G |
| H | Content moderation — copyright dispute UI | ✅ Hoàn thành (code) | Trung bình | §H |
| I | Interview recording tools (MediaRecorder) | ❌ Mới | Cao | §I |
| J | Whisper-based audio transcription UI | ❌ Mới | Trung bình | §J |
| K | Submission version history UI | ✅ Hoàn thành (code) | Trung bình | §K |
| L | Notification web (toast, badge, navigate, hub, unread-count, delete) | ✅ Hoàn thành (code) | Cao | §L |

---

## §A — Synchronized Dual Audio Player

### Trạng thái hiện tại: ✅ Đã triển khai
- **File chính:** `src/components/researcher/DualAudioComparePlayer.tsx` (**mới**)
- **Tích hợp:** `src/pages/researcher/ResearcherPortalPage.tsx` (tab `compare`)
- **Đã có:** Play/Pause đồng bộ, seek timeline đồng bộ, A/B focus (`A+B`, `A only`, `B only`), reset, drift correction
- **Lưu ý:** Nếu một bên là nguồn video/YouTube, UI hiển thị cảnh báo fallback (dual waveform áp dụng cho audio)

### Kết quả
1. **Dual player panel** — đã có
2. **Lockstep play/pause + seek** — đã có
3. **A/B toggle** — đã có
4. **Visual diff highlight on waveform** — chưa làm (optional, ngoài phạm vi)

### Swagger API
- Không yêu cầu API mới — audio URL đã có trong Recording object

### Files đã thay đổi
| File | Thay đổi |
|------|----------|
| `src/components/researcher/DualAudioComparePlayer.tsx` | **Mới** — 2 WaveSurfer instances, sync controls |
| `src/pages/researcher/ResearcherPortalPage.tsx` | Tích hợp dual player vào tab compare; bỏ play modal trong compare card |

### Verification
- `eslint`/`build` đã pass trong lần triển khai §A.

---

## §B — Export Academic Datasets (CSV/XLSX)

### Trạng thái hiện tại: ✅ Đã triển khai (Phase 1–3 + X)
- **Dialog mới:** `src/components/features/research/ExportDatasetDialog.tsx`
- **Utils mới:** `src/utils/datasetExport.ts`
- **Tích hợp:** `src/pages/researcher/ResearcherPortalPage.tsx` + `src/pages/SearchPage.tsx`
- **Đã có:** JSON/CSV/XLSX export, column selector theo nhóm, preset Academic, select all/clear all, filename chuẩn học thuật

### Kết quả
1. **Export format picker:** đã có
2. **Column selector:** đã có
3. **Academic metadata wrapper/sheet:** đã có
4. **Filename chuẩn:** đã có
5. **Gỡ duplicate logic JSON cũ (2 pages):** đã xong

### Files đã thay đổi
| File | Thay đổi |
|------|----------|
| `package.json` | `xlsx` đã tồn tại từ trước |
| `src/utils/datasetExport.ts` | **Mới** — logic convert Recording[] → CSV/XLSX/JSON |
| `src/components/features/research/ExportDatasetDialog.tsx` | **Mới** — modal chọn format + fields |
| `src/pages/researcher/ResearcherPortalPage.tsx` | Thay `handleExportDataset` → mở dialog |
| `src/pages/SearchPage.tsx` | Thay inline JSON export → mở dialog |

### Verification (Phase X)
- `npm run lint` → PASS
- `npm run build` → PASS
- `npm run test:unit` (38 tests) → PASS
- Manual runtime rows (#4–#12 trong plan export chi tiết) còn chờ click-through.

---

## §C — Expert Annotation Tools (Scholarly)

### Trạng thái hiện tại: ✅ Đã triển khai (Phase 1–4 + X auto)

### Swagger API đã tích hợp
| Endpoint | Mô tả |
|----------|-------|
| `GET /api/Annotation/get-by-recording-id?recordingId=` | Lấy annotations theo recording |
| `POST /api/Annotation/create` | Tạo annotation (DTO: `CreateAnnotationDto`) |
| `PUT /api/Annotation/update` | Cập nhật annotation |
| `DELETE /api/Annotation/delete?id=` | Xóa annotation |
| `GET /api/Song/{songId}/annotations` | Lấy annotations theo song |

### Kết quả
1. **Annotation service + types:** đã có (`annotationApi.ts`, `annotation.ts`)
2. **AnnotationPanel CRUD:** đã có (create/update/delete + validation + permission check)
3. **Structured fields:** đã có (`type`, `content`, `researchCitation`, `timestampStart`, `timestampEnd`)
4. **ModerationPage integration:** đã có tab `Chú thích học thuật`
5. **RecordingDetailPage read-only:** đã có, group theo type + render timestamp/citation URL

### Files đã thay đổi
| File | Thay đổi |
|------|----------|
| `src/services/annotationApi.ts` | **Mới** — CRUD `/api/Annotation` |
| `src/types/annotation.ts` | **Mới** — types cho annotation |
| `src/components/features/annotation/AnnotationPanel.tsx` | **Mới** |
| `src/pages/ModerationPage.tsx` | Thêm tab/panel annotation |
| `src/pages/RecordingDetailPage.tsx` | Hiển thị annotations read-only |

### Verification (Phase X)
- `npm run lint` → PASS
- `npm run build` → PASS
- `npm run test:unit` (38 tests) → PASS
- Manual runtime checks cho create/update/delete + browser click-through còn chờ chạy.

### Effort còn lại: ~0.5–1 giờ (manual runtime + polish)

---

## §D — AI Supervision Dashboard (Real Data)

### Trạng thái hiện tại: ✅ Đã triển khai (Phase 1–3 + X auto)
- **Service layer:** mở rộng `qaMessageService` với `fetchAllMessages`, `getMessageById`, `updateMessage`.
- **Analytics layer:** mở rộng `analyticsApi` với `getExperts`, `getContent`.
- **UI mới:** `FlaggedResponseList` (load flagged messages từ API, unflag, expert correction).
- **AdminDashboard tab `aiMonitoring`:**
  - Accuracy card dùng dữ liệu thật từ `getExperts()`.
  - Flagged count card dùng dữ liệu thật từ `fetchAllMessages(...).filter(flaggedByExpert)`.
  - Bỏ hoàn toàn dependency vào localStorage key `ai_flagged_responses`.
  - Thêm bảng `Expert Performance` (name/reviews/accuracy/avgTime).
  - Section "Xử lý cảnh báo AI" mount `FlaggedResponseList`.

### Kết quả
1. **Placeholder AI metrics** → đã thay bằng API thật.
2. **Flagged responses panel** → đã có CRUD hành vi cần thiết (unflag + correction save).
3. **Expert performance table** → đã render từ API, sort theo `reviews` giảm dần.
4. **KB actions** → giữ nguyên link `/admin/knowledge-base` (không regression).

### Files đã thay đổi
| File | Thay đổi |
|------|----------|
| `src/services/qaMessageService.ts` | Thêm methods cho paged list/detail/update message |
| `src/services/analyticsApi.ts` | Thêm DTOs + methods `getExperts`/`getContent` |
| `src/components/features/ai/FlaggedResponseList.tsx` | **Mới** — list flagged + unflag + correction form |
| `src/pages/admin/AdminDashboard.tsx` | Thay placeholder bằng real metrics + mount panel + expert table |

### Verification (Phase X)
- `npm run lint` → PASS
- `npm run build` → PASS
- `npm run test:unit` (38 tests) → PASS
- Manual runtime checks cho flagged flow (#8/#9) + accuracy/count validation trên backend thật còn chờ chạy.

### Effort còn lại: ~0.5–1 giờ (manual runtime + polish)

---

## §E — Embargo / Copyright Moderation Workflow

### Trạng thái hiện tại: ✅ Đã triển khai (Phase 1–4 + X auto)

### Swagger API đã tích hợp
| Endpoint | Mô tả |
|----------|-------|
| `GET /api/Embargo/recording/{recordingId}` | Lấy embargo theo recording |
| `PUT /api/Embargo/recording/{recordingId}` | Tạo/cập nhật embargo |
| `POST /api/Embargo/recording/{recordingId}/lift` | Gỡ embargo |
| `GET /api/Embargo` | Danh sách embargo có filter/paging |
| `POST /api/CopyrightDispute` | Tạo tranh chấp bản quyền |
| `GET /api/CopyrightDispute` | Danh sách tranh chấp |
| `GET /api/CopyrightDispute/{disputeId}` | Chi tiết tranh chấp |
| `POST /api/CopyrightDispute/{disputeId}/assign` | Gán reviewer |
| `POST /api/CopyrightDispute/{disputeId}/resolve` | Kết luận tranh chấp |
| `POST /api/CopyrightDispute/{disputeId}/evidence` | Upload bằng chứng (multipart) |

### Kết quả
1. **Types + service layer:** đã có (`embargo.ts`, `copyrightDispute.ts`, `embargoApi.ts`, `copyrightDisputeApi.ts`)
2. **Embargo UI:** đã có (`EmbargoSection`, `EmbargoListPanel`)
3. **RecordingDetailPage:** đã có embargo badge + dispute badge + report dispute modal
4. **Dispute UI:** đã có (`DisputeReportForm`, `DisputeListPanel`, `DisputeEvidenceUpload`)
5. **Moderation wizard:** đã thêm checkbox `sensitiveContent` ở step 3
6. **AdminDashboard moderation tab:** đã mount panel Embargo + Dispute

### Files đã thay đổi
| File | Thay đổi |
|------|----------|
| `src/types/embargo.ts` | **Mới** |
| `src/types/copyrightDispute.ts` | **Mới** |
| `src/services/embargoApi.ts` | **Mới** |
| `src/services/copyrightDisputeApi.ts` | **Mới** |
| `src/components/features/moderation/EmbargoSection.tsx` | **Mới** |
| `src/components/features/moderation/EmbargoListPanel.tsx` | **Mới** |
| `src/components/features/moderation/DisputeReportForm.tsx` | **Mới** |
| `src/components/features/moderation/DisputeListPanel.tsx` | **Mới** |
| `src/components/features/moderation/DisputeEvidenceUpload.tsx` | **Mới** |
| `src/pages/RecordingDetailPage.tsx` | Tích hợp embargo/dispute UI |
| `src/pages/ModerationPage.tsx` | Tích hợp `EmbargoSection` |
| `src/components/features/moderation/ModerationVerificationWizardDialog.tsx` | Thêm `sensitiveContent` |
| `src/services/expertWorkflowService.ts` | Mở rộng type `ModerationVerificationData` |
| `src/pages/admin/AdminDashboard.tsx` | Tích hợp panel Embargo + Dispute |

### Verification (Phase X)
- `npm run lint` → PASS
- `npm run build` → PASS
- `npm run test:unit` (38 tests) → PASS
- Manual runtime checks cho flow API thật (#12/#13 trong checklist tổng) còn chờ chạy.

### Effort còn lại: ~0.5–1 giờ (manual runtime + polish)

---

## §F — Collection Analytics — Coverage Gap Charts

### Trạng thái hiện tại: ✅ Đã triển khai (Phase 1–5 + X auto)
- **Service/Types:** Đã tách analytics types sang `src/types/analytics.ts`, `analyticsApi.ts` dùng types chung.
- **Chart stack:** Đã cài `recharts` và triển khai chart components riêng.
- **AdminDashboard analytics:** Đã thay thế block chips/list thủ công bằng các component analytics dùng API thật.
- **Swagger/API:** Đã xác nhận có endpoints `/api/Analytics/coverage`, `/content`, `/experts`, `/contributors`.

### Đã hoàn thành
1. **Coverage chart + gap badges** — `CoverageGapChart.tsx` gọi `getCoverage()` và render BarChart.
2. **Content analytics panel** — `ContentAnalyticsPanel.tsx` gọi `getContent('songs')`, render chart theo dân tộc/vùng.
3. **Monthly trend chart** — `MonthlyTrendChart.tsx` thay chips theo tháng bằng biểu đồ.
4. **Contributor leaderboard** — `ContributorLeaderboard.tsx` gọi `getContributors()`, sort và hiển thị bảng xếp hạng.
5. **AdminDashboard integration** — tab analytics đã mount đầy đủ các component trên.

### Files đã thay đổi
| File | Thay đổi |
|------|----------|
| `package.json` / `package-lock.json` | Thêm dependency `recharts` |
| `src/types/analytics.ts` | **Mới** — analytics DTO/types |
| `src/services/analyticsApi.ts` | Dùng types từ `src/types/analytics.ts` |
| `src/types/index.ts` | Export analytics types |
| `src/components/features/analytics/CoverageGapChart.tsx` | **Mới** — coverage bar chart + gap badges |
| `src/components/features/analytics/ContentAnalyticsPanel.tsx` | **Mới** — content analytics charts |
| `src/components/features/analytics/MonthlyTrendChart.tsx` | **Mới** — monthly trend chart |
| `src/components/features/analytics/ContributorLeaderboard.tsx` | **Mới** — leaderboard table |
| `src/pages/admin/AdminDashboard.tsx` | Tích hợp analytics components; bỏ logic gap/prolific thủ công |

### Verification (Phase X)
- `npm run lint` → PASS
- `npm run build` → PASS
- `npm run test:unit` (38 tests) → PASS
- Manual runtime checks cho chart rendering/fallback/responsive (#4 trong checklist tổng) còn chờ chạy.

### Effort còn lại: ~0.5–1 giờ (manual runtime verification)

---

## §G — QA Message Flagging → AI Retraining Pipeline

### Hiện trạng (cập nhật 2026-04-15)
- **Service:** `qaMessageService.ts` — `flagMessage` / `unflagMessage` → API `PUT /QAMessage/flagged|unflagged`
- **ChatbotPage:** Flag toggle hoạt động ✓
- **ResearcherPortalPage QA tab:** Vẫn **chưa** flag qua API; vẫn có luồng đẩy bản sao vào `AI_RESPONSES_REVIEW_KEY` (localStorage) — **còn gap**
- **ModerationPage:** Tab “Giám sát phản hồi AI” vẫn đọc/ghi **`AI_RESPONSES_REVIEW_KEY`** (localStorage), **chưa** dùng API như `FlaggedResponseList` — **còn gap**
- **AdminDashboard `aiMonitoring`:** Đã mount **`FlaggedResponseList`** — load flagged từ API + cập nhật count thật (không còn phụ thuộc `ai_flagged_responses` như mô tả cũ)
- **Vấn đề còn lại:** Researcher QA + Moderation AI review vẫn tách khỏi nguồn API thống nhất; cần hợp nhất như checklist bên dưới

### Cần bổ sung
1. **Thống nhất flag flow** — tất cả dùng API `QAMessage/flagged`, bỏ localStorage
2. **Expert correction form** — khi flag, expert nhập `expertCorrection` → `PUT /QAMessage/{id}` body: `{ expertCorrection, correctedByExpertId }`
3. **Admin flagged list** — AdminDashboard `aiMonitoring` load từ API (không localStorage)
4. **Retrain trigger** (nếu backend hỗ trợ) — nút "Gửi bản sửa cho huấn luyện lại" → POST endpoint (TBD)
5. **ResearcherPortalPage QA** — thêm flag button giống ChatbotPage

### Files cần thay đổi
| File | Thay đổi |
|------|----------|
| `src/services/qaAdminApi.ts` | Thêm `getFlaggedMessages()`, `submitCorrection(id, correction)` |
| `src/pages/ChatbotPage.tsx` | Đã có flag ✓ — thêm correction form nếu cần |
| `src/pages/researcher/ResearcherPortalPage.tsx` | QA tab: thêm flag button + dùng `ChatMessageItem` |
| `src/pages/ModerationPage.tsx` | Tab AI: load từ API thay localStorage |
| `src/pages/admin/AdminDashboard.tsx` | aiMonitoring: đã có `FlaggedResponseList` + count từ API — chỉ cần đảm bảo không regression khi refactor §G |
| `src/components/features/chatbot/ChatMessageItem.tsx` | Thêm inline correction input |

### Effort: ~3–4 giờ

---

## §H — Content Moderation — Copyright Dispute UI

### Trạng thái hiện tại: ✅ Đã triển khai chung trong §E
- Scope của §H đã được gộp vào workflow Embargo/Copyright ở §E để tránh trùng lặp.
- UI xử lý tranh chấp (list/detail/assign/resolve/evidence/report) đã có đầy đủ trong code.
- Không còn phụ thuộc backend mới cho dispute flow.

### Effort còn lại: ~0 giờ riêng cho §H (đã tính trong §E manual runtime)

---

## §I — Interview Recording Tools (MediaRecorder API)

### Hiện trạng
- **Không có** bất kỳ code nào liên quan `MediaRecorder`, `getUserMedia`, `navigator.mediaDevices`
- Upload hiện chỉ nhận **file** (drag & drop hoặc chọn file)

### Cần bổ sung
1. **RecordAudioPanel component** — giao diện ghi âm trực tiếp từ trình duyệt
2. **Controls:** Record / Pause / Resume / Stop / Preview / Re-record
3. **Timer + waveform** — hiển thị thời gian ghi + visualizer realtime
4. **Output:** Blob WAV/WebM → convert to File → inject vào upload flow
5. **Permissions:** Request microphone, handle deny gracefully
6. **Mobile support:** Responsive, test trên Chrome Android / Safari iOS
7. **Metadata auto-fill:** GPS (đã có), timestamp, device info

### Files cần thay đổi
| File | Thay đổi |
|------|----------|
| `src/components/features/recording/RecordAudioPanel.tsx` | **Mới** — MediaRecorder + UI |
| `src/hooks/useMediaRecorder.ts` | **Mới** — hook quản lý recording state |
| `src/components/features/UploadMusic.tsx` | Thêm tab/toggle "Ghi âm" bên cạnh "Tải file" |
| `src/pages/UploadPage.tsx` | Routing/layout hỗ trợ record mode |

### Effort: ~5–6 giờ

---

## §J — Whisper-based Audio Transcription UI

### Hiện trạng
- **Swagger:** `GET /api/Transcription/{submissionId}` → `TranscriptionDto` { submissionId, content, language, status, version, updatedAt }
- **Swagger:** `PUT /api/Transcription/{submissionId}` → `UpdateTranscriptionRequest`
- **Swagger:** `GET /api/Song/{songId}/transcription` → `TranscriptionDto`
- **Frontend:** Transcription chỉ là **form text field** trong upload, không gọi API transcription

### Cần bổ sung
1. **Transcription service** — `transcriptionApi.ts` gọi endpoints trên
2. **Auto-transcribe trigger** — nút "Phiên âm tự động" trong upload wizard sau khi tải audio
3. **Status polling** — `TranscriptionDto.status` có thể là `pending` / `processing` / `completed` / `failed`
4. **Review & edit** — hiển thị kết quả ASR, cho phép expert sửa → `PUT` update
5. **Recording detail** — hiển thị transcription từ API thay vì metadata text

### ⚠️ Phụ thuộc backend — endpoint `/api/Transcription` cần Whisper/STT tích hợp phía server

### Files cần thay đổi
| File | Thay đổi |
|------|----------|
| `src/services/transcriptionApi.ts` | **Mới** — get/update transcription |
| `src/types/transcription.ts` | **Mới** — `TranscriptionDto`, `UpdateTranscriptionRequest` |
| `src/components/features/upload/steps/TranscriptionStep.tsx` | **Mới** — trigger + review |
| `src/pages/RecordingDetailPage.tsx` | Hiển thị transcription từ API |
| `src/pages/ModerationPage.tsx` | Hiển thị transcription trong review panel |

### Effort: ~3–4 giờ (UI) + phụ thuộc backend Whisper

---

## §K — Submission Version History UI

### Hiện trạng
- **Swagger API có đầy đủ:**
  - `GET /api/SubmissionVersion` — list (paged)
  - `POST /api/SubmissionVersion` — create (`CreateSubmissionVersionDto` { submissionId, changesJson })
  - `GET /api/SubmissionVersion/{id}` — detail
  - `PUT /api/SubmissionVersion/{id}` — update (`UpdateSubmissionVersionDto` { changesJson })
  - `DELETE /api/SubmissionVersion/{id}` — xóa
  - `GET /api/SubmissionVersion/submission/{submissionId}` — list by submission → `SubmissionVersionDtoListServiceResponse`
  - `GET /api/SubmissionVersion/submission/{submissionId}/latest` — phiên bản mới nhất
  - `DELETE /api/SubmissionVersion/submission/{submissionId}/all` — xóa tất cả
- **DTO:** `SubmissionVersionDto` { id, submissionId, versionNumber (int), changesJson, createdAt (datetime) }
- **Frontend:** ✅ Đã tích hợp đầy đủ Phase 1→5:
  - `src/types/submissionVersion.ts` (**mới**) — DTO, paged result, `parseChangesJson`
  - `src/services/submissionVersionApi.ts` (**mới**) — list/detail/create/update/delete + listBySubmission/latest/deleteAll
  - `src/components/features/submission/SubmissionVersionTimeline.tsx` (**mới**) — timeline, modal detail, parse diff/fallback raw
  - `src/pages/ContributionsPage.tsx` — hiển thị lịch sử phiên bản trong detail modal của contributor
  - `src/pages/ModerationPage.tsx` — hiển thị lịch sử phiên bản ở panel review (read-only)
  - `src/components/features/UploadMusic.tsx` — auto-create version best-effort sau khi contributor sửa submission và save thành công

### Verification
- ✅ `npm run lint` pass
- ✅ `npm run build` pass
- ✅ `npm run test:unit` pass
- ⚠️ Manual runtime còn lại: kiểm tra click-through timeline/detail/diff và network shape ở môi trường thực

### Effort còn lại: ~0.5–1 giờ (manual QA/runtime verification)

---

## §L — Notification Web Flow

### Trạng thái hiện tại: ✅ Đã triển khai (code, Phase 1–8 + X)

Chi tiết triển khai, checklist runtime và các mục còn tùy chọn nằm trong **`docs/PLAN-notification-web-flow.md`**.

### Tóm tắt đã có trong code
- **Store + engine:** `notificationFeedStore`, `useNotificationFeedEngine` — polling, merge, dedupe, xóa trùng khi BE đã tạo notification
- **Realtime:** `notificationHub` (SignalR), reconnect, subscribe unread-count
- **Bootstrap UI:** `NotificationFeedBootstrap` — badge/header, đồng bộ unread
- **API:** `getUnreadCount`, xóa/xem theo contract đã align với backend (xem plan chi tiết)

### Gap / việc còn lại (không chặn)
- Smoke test SignalR trên môi trường thật; một số hạng mục manual trong `PLAN-notification-web-flow.md` Phase X

### Effort còn lại: ~0–1 giờ (manual + smoke hub)

---

## Tổng hợp Priority & Effort

| # | Feature | Priority | Effort | Backend dependency |
|---|---------|----------|--------|--------------------|
| A | Dual audio player | ✅ Done | 0h còn lại | Không |
| B | Export CSV/XLSX | ✅ Done | 0h còn lại | Không |
| L | Notification web flow | ✅ Done (code) | ~0–1h (smoke/manual) | Hub + API ✓ |
| F | Coverage gap charts | ✅ Done (code) | ~0.5–1h | API có sẵn ✓ |
| I | Interview recording | 🔴 Cao | ~5–6h | Không |
| C | Expert annotations | ✅ Done (code) | ~0.5–1h | API có sẵn ✓ |
| D | AI dashboard real data | ✅ Done (code) | ~0.5–1h | API có sẵn ✓ |
| G | QA flag → retrain | 🟡 T.bình | ~3–4h | Một phần ✓ |
| K | Submission version history | ✅ Done (code) | ~0.5–1h | API có sẵn ✓ |
| J | Whisper transcription UI | 🟡 T.bình | ~3–4h | ⚠️ Backend Whisper |
| E | Embargo/copyright | ✅ Done (code) | ~0.5–1h | API có sẵn ✓ |
| H | Copyright dispute UI | ✅ Done (code) | ~0h (gộp vào E) | API có sẵn ✓ |

**Tổng effort còn lại (ước tính):** ~12–17 giờ (§I + §J + §G + manual các mục đã Done)

---

## Recommended Implementation Order

### Sprint 1 — API có sẵn, không phụ thuộc backend mới
1. **§G** QA flag → retrain (thống nhất 3 hệ thống flag)

### Sprint 2 — Cần code phức tạp hoặc backend mới
2. **§I** Interview recording (MediaRecorder — complex nhưng self-contained)
3. **§J** Whisper transcription UI (chờ backend Whisper sẵn sàng)

---

## Agent Assignment

| Sprint | Features | Agent | Ghi chú |
|--------|----------|-------|---------|
| Sprint 1 | G | Code Agent | Cần test với backend thật |
| Sprint 2 | I, J | Code Agent + Backend coordination | MediaRecorder phức tạp, Whisper cần backend readiness |

---

## Phase X — Verification Checklist

| # | Kiểm tra | Type |
|---|----------|------|
| 1 | `npm run lint` passes | Auto |
| 2 | `npm run build` passes | Auto |
| 3 | Export dialog opens, CSV/XLSX download works | Manual |
| 4 | Coverage gap chart renders from API data | Manual |
| 5 | Submission version timeline shows history | Manual |
| 6 | Dual player syncs playback | Manual |
| 7 | Annotation CRUD works via API | Manual |
| 8 | AI dashboard shows real flagged count | Manual |
| 9 | QA flag/correction flow end-to-end | Manual |
| 10 | Interview recording captures audio | Manual |
| 11 | Transcription status polling works | Manual |
| 12 | Embargo fields save to API | Manual |
| 13 | Dispute panel CRUD works | Manual |
| 14 | Notification feed: badge, mark read, delete, hub reconnect | Manual |

### Cập nhật nhanh trạng thái (2026-04-15)
- **§A:** Implemented + lint/build pass.
- **§B:** Implemented (Phase 1–3 + X), auto checks pass (`lint`, `build`, `test:unit`).
- **§C:** Implemented (Phase 1–4 + X auto), auto checks pass (`lint`, `build`, `test:unit`).
- **§D:** Implemented (Phase 1–3 + X auto), auto checks pass (`lint`, `build`, `test:unit`).
- **§E + §H:** Implemented (Phase 1–4 + X auto), auto checks pass (`lint`, `build`, `test:unit`).
- **§F:** Implemented (Phase 1–5 + X auto), auto checks pass (`lint`, `build`, `test:unit`).
- **§K:** Implemented (Phase 1–5 + X auto), auto checks pass (`lint`, `build`, `test:unit`).
- **§L:** Implemented (Phase 1–8 + X code), auto checks pass (`lint`, `build`); smoke SignalR/unread trên env thật — xem `PLAN-notification-web-flow.md`.
- **§G:** Admin `FlaggedResponseList` đã dùng API; **ModerationPage** tab AI + **Researcher** QA vẫn localStorage — gap còn lại như mục §G.
- **Pending manual:** click-through runtime §A/#6, §B/#3, §C/#7, §D/#8, §E/#12-#13, §F/#4, §K/#5, checklist **#14** (notification), và §D/#9 / §G khi thống nhất flag pipeline.
