# PLAN: VietTune Demo-Ready — Task Breakdown từ Master Priority Map

> **Source:** `docs/VietTune_Master_Priority_Map_1.md`
> **Project Type:** WEB (React/Vite frontend + .NET backend)
> **Revision:** 2026-04-29 v2 — Senior Architecture Review
> **Agent:** project-planner + frontend-specialist + backend-specialist

---

## Global Architecture Principles (Binding)

Mọi implementation trong project này PHẢI tuân theo 3 nhóm nguyên tắc sau. Vi phạm bất kỳ quy tắc nào = không đủ điều kiện demo.

### AI Safety Rules (ALL AI features)

```
AI suggestion ≠ final truth
Contributor metadata is preserved — never overwritten by AI
Expert decision is the single authoritative source
AI auto-overwriting archival metadata is FORBIDDEN
```

### Performance Guardrails (ALL heavy features)

```
Upload API returns fast (202 Accepted)
AI analysis runs async via job queue
Worker computes scores after analysis completes
Result is cached before UI reads it
UI reads cached output — never triggers recomputation
No synchronous heavy scoring during upload request lifecycle
```

### Fallback-First Rule (Demo safety)

```
Deterministic rule first — AI enhancement later
Never block core flow waiting for AI
If AI service is unavailable, show placeholder — do not crash
```

---

## Overview

VietTune là một research digital archive platform với multi-role workflow (Guest → Contributor → Expert → Researcher → Admin). Tài liệu này tổng hợp và phân loại toàn bộ công việc cần làm từ `VietTune_Master_Priority_Map_1.md` thành các task có thứ tự ưu tiên rõ ràng và tiêu chí xác minh cụ thể.

**Rủi ro lớn nhất hiện tại:**
1. Làm quá nhiều cùng lúc trước demo
2. Refactor sai thời điểm
3. Feature chưa được verify đủ
4. Flow bị phân mảnh giữa UI / localStorage / API

> 🔔 **Instructor Feedback (2026-04-29):** 6 điểm phải xử lý trước defense:
> 1. Xác thực nhạc cụ có trong bản ghi ở bước AI Analyze
> 2. Xử lý nhạc dân tộc dùng nhạc cụ hiện đại (guitar, piano) & ngược lại
> 3. Làm rõ 3 stage kiểm duyệt (Initial Screening → Detail Verification → Final Publication)
> 4. Thêm confidence score % của AI Analyze khi phân tích nhạc cụ
> 5. Tiêu chí so sánh 2 bản ghi cùng bài nhưng khác nhạc cụ (vd: Trống cơm - đàn bầu vs đàn tranh)
> 6. Handle vùng miền ghi âm và thể loại âm nhạc

---

## Success Criteria

| # | Tiêu chí | Đo lường |
|---|----------|----------|
| 1 | Build pass | `npm run build` không lỗi |
| 2 | Lint pass | `npm run lint` sạch |
| 3 | Contributor smoke pass | Upload + submit thành công |
| 4 | Expert smoke pass | Claim + approve/reject thành công |
| 5 | Researcher pass | Search + detail + export hoạt động |
| 6 | Admin pass | Dashboard + analytics load |
| 7 | No critical console errors | DevTools sạch |
| 8 | No broken route guard | Tất cả role redirect đúng |
| 9 | Demo script end-to-end | Chạy được từ đầu đến cuối |
| 10 | AI Analyze instrument validation | Nhạc cụ được detect + confidence % hiển thị |
| 11 | 3-stage moderation rõ ràng | Initial Screening → Detail Verification → Final Publication hoạt động đúng |
| 12 | Recording comparison criteria | So sánh 2 bản ghi cùng bài khác nhạc cụ được hỗ trợ |
| 13 | Regional + genre classification | Upload và search được theo vùng miền + thể loại |

---

## Progress Update (2026-04-29)

### Completed in current implementation

- ✅ `P0.4` API source-of-truth unification for AI flag flow:
  - Researcher/Moderation luồng Q&A dùng service API (`qaMessageService` / `qaConversationService`)
  - `FlaggedResponseList` + `currentUserId` path hoạt động cho expert correction
  - Grep cleanup đạt 0 kết quả cho:
    - `AI_RESPONSES_REVIEW_KEY`
    - `pushAiResponseForExpertReview`
    - `AiResponseForReview`
- ✅ `P0.5` Yêu cầu 1: declared vs detected side-by-side panel (moderation detail + wizard step 2)
- ✅ `P0.5` Yêu cầu 2: instrument confidence hiển thị % + low-confidence warning trong upload/moderation
- ✅ `P0.5` Yêu cầu 4 (demo-safe): compare panel side-by-side cho 2 versions cùng bài, có base-song grouping gợi ý + AI confidence row
- ⚠️ `P0.5` Yêu cầu 3 mới hoàn thành **partial**:
  - Đã có cross-case warning (upload + moderation) và expert mark explicit classification
  - Chưa đầy đủ data model/search contract cho `instrument_type` + `song_category` end-to-end

---

## Tech Stack

| Layer | Technology | Ghi chú |
|-------|-----------|---------|
| Frontend | React + Vite | Hiện có |
| Styling | Tailwind CSS (token-based) | Cần unify surface tokens |
| State | Zustand + localStorage | Cần loại bỏ localStorage cho AI flag |
| API | REST + Axios | Cần cleanup legacy service |
| E2E Test | Playwright | Đã có test specs |
| API Type | OpenAPI/Swagger codegen | Cần migration cleanup |

---

## 🔴 P0 — BẮT BUỘC trước demo / defense

> Những task này **chặn demo**. Làm trước tất cả.

---

### Task P0.1 — Combined E2E Release Gate

| Field | Value |
|-------|-------|
| **Agent** | `test-engineer` |
| **Skill** | `webapp-testing` |
| **Priority** | P0 |
| **Dependencies** | Build pass |
| **Effort** | 2–4 giờ |

**INPUT:** Các spec files hiện có trong `tests/e2e/`

**OUTPUT:** Script `npm run test:e2e:release` chạy được và pass

**VERIFY:**
- [ ] `npm run build` pass trước khi chạy E2E
- [ ] Contributor specs pass (`contributor*.spec.ts`)
- [ ] Expert specs pass (`expert*.spec.ts`)
- [ ] Researcher phase 1–4 specs pass
- [ ] Test artifacts trong `test-results/`
- [ ] Chạy đủ 1 lần full release gate trước demo

**Minimal path nếu thiếu thời gian:**
```text
1. Login contributor → upload → submit
2. Login expert → claim → approve/reject
3. Login researcher → search → detail
```

---

### Task P0.2 — Upload Flow Stability

| Field | Value |
|-------|-------|
| **Agent** | `frontend-specialist` |
| **Skill** | `frontend-design`, `webapp-testing` |
| **Priority** | P0 |
| **Dependencies** | Không |
| **Effort** | 3–5 giờ |

```
ADR-002 — Upload returns immediately; AI analysis is decoupled
Decision: Upload API persists file + metadata, returns 202 Accepted.
           AI analysis job is enqueued — NOT executed in request lifecycle.
Reason:    Audio analysis takes 5–30s. Blocking upload degrades UX and
           risks timeout under concurrent load.
Tradeoff:  AI results are not instant — moderation queue shows pending state.
Accepted risk: Brief window where submission exists without AI metadata.
```

**INPUT:** `UploadMusic.tsx`, `PLAN-upload-explore-ui.md`, `PLAN-input-validation.md`

**OUTPUT:** Upload flow stable end-to-end, decoupled from AI pipeline

> ⚠️ CẢNH BÁO: KHÔNG refactor sâu `UploadMusic.tsx` trước demo. Chỉ sửa UI / validation nhỏ. `UploadMusic.tsx` là file nguy hiểm nhất trong codebase.

**Demo-safe minimum:**
- Upload audio/video → submit thành công
- 3-step wizard không crash
- GPS capture hoặc fallback gracefully

**Production-safe full version:**
- Upload trả về 202 → job enqueued → UI polling status
- AI analysis chạy async → kết quả hiển thị sau khi worker xong
- Duplicate detection trước khi submit

**VERIFY:**
- [ ] Contributor vào được `/upload`, Guest bị redirect login
- [ ] Upload audio + video hoạt động
- [ ] Đi đủ 3 bước wizard → submit thành công
- [ ] Save draft không crash, edit mode `?edit=true` load đúng
- [ ] Resubmit sau edit hoạt động
- [ ] Validation hiển thị đúng khi thiếu field bắt buộc
- [ ] GPS lấy tọa độ thật; từ chối quyền GPS không crash
- [ ] Mobile layout ổn

---

### Task P0.3 — Expert Moderation — 3-Stage Workflow

| Field | Value |
|-------|-------|
| **Agent** | `frontend-specialist` |
| **Skill** | `frontend-design`, `webapp-testing` |
| **Priority** | P0 |
| **Dependencies** | Không |
| **Effort** | 4–6 giờ |

```
ADR-003 — 3-stage moderation with claim locking and audit trail
Decision: Moderation is divided into three explicit, non-skippable stages:
          Stage 1 (system auto-check) → Stage 2 (expert claim+review) →
          Stage 3 (expert final publish). Each stage has its own status badge
          and blocking conditions.
Reason:   A single approve/reject flow cannot distinguish between "file is
          corrupt" (system check) and "ethnic attribution is wrong" (scholarly
          judgment). Conflating them damages archival integrity.
Tradeoff: Longer time-to-publish. Accepted for a scholarly archive.
Accepted risk: Expert forgets to unclaim → stale lock. Mitigation: auto-expire
              claim lock after configurable timeout (production concern).
```

> **Defense statement:** "We do not allow AI to auto-publish recordings because archival metadata errors in an ethnomusicology corpus are not correctable at scale — scholarly authority must remain with credentialed experts at every stage."

**INPUT:** `ModerationPage.tsx`, `PLAN-test-e2e-expert.md`, `PLAN-moderation-du-field.md`

**OUTPUT:** Expert moderation flow — 3 stages clearly separated, not flaky

**Demo-safe minimum:**
- Expert claim → approve → status changes visibly
- Reject path with reason validation works
- 3 badge states visible: `PENDING_SCREENING` / `IN_REVIEW` / `PUBLISHED`

**Production-safe full version:**
- Auto-expire stale claim locks
- Audit log for every stage transition (who, when, what decision)
- Dispute/revision request loop back to contributor with diff

> ⚠️ Bất biến bắt buộc phải giữ khi refactor UI: Claim/Unclaim locking, Role guard, Approve/Reject payload, Reject reason validation.

#### 3 Stage — Định nghĩa rõ ràng

> **Yêu cầu:** Phân biệt rõ 3 giai đoạn riêng biệt trong workflow kiểm duyệt.

**Stage 1 — Initial Screening (Lọc ban đầu)**

| Item | Mô tả |
|------|-------|
| Mục tiêu | Loại bỏ submission rõ ràng không phù hợp trước khi phân công expert |
| Ai làm | System auto-check hoặc moderator sơ bộ |
| Input | Submission mới từ contributor |
| Output | Pass → Stage 2 / Reject → trả về contributor |
| UI | Badge trạng thái `PENDING_SCREENING` trong queue |

Checklist Stage 1:
- [ ] File hợp lệ (audio/video, không corrupt)
- [ ] Metadata bắt buộc đầy đủ (title, ethnic group, instrument tags)
- [ ] Không trùng lặp với bản ghi hiện có (duplicate check)
- [ ] Nội dung không vi phạm (basic content policy)

**Stage 2 — Detail Verification (Xác minh chi tiết)**

| Item | Mô tả |
|------|-------|
| Mục tiêu | Expert ethnomusicologist xác minh tính chính xác học thuật |
| Ai làm | Expert (claim-based) |
| Input | Submission đã qua Stage 1 |
| Output | Approved with annotations / Request revision / Escalate |
| UI | Badge `IN_REVIEW`, wizard với annotation/embargo tabs |

Checklist Stage 2:
- [ ] Expert claim submission
- [ ] Xác minh ethnic attribution (bài có đúng là nhạc dân tộc được ghi nhận không?)
- [ ] Xác minh instrument identification (nhạc cụ khai báo có khớp audio không?)
- [ ] Xác minh ceremonial context (ngữ cảnh nghi lễ chính xác không?)
- [ ] Annotation thêm scholarly notes
- [ ] Nếu cần sửa → gửi revision request kèm lý do chi tiết

**Stage 3 — Final Publication (Công bố chính thức)**

| Item | Mô tả |
|------|-------|
| Mục tiêu | Approve cuối cùng, chuyển sang public / archive |
| Ai làm | Expert hoặc senior reviewer |
| Input | Submission đã xác minh ở Stage 2 |
| Output | Public recording → xuất hiện trong Explore/Search |
| UI | Badge `PUBLISHED`, visible to Researcher/Guest |

Checklist Stage 3:
- [ ] Expert approve final
- [ ] Submission status → `PUBLISHED`
- [ ] Recording xuất hiện trong ExplorePage
- [ ] Recording searchable theo Researcher
- [ ] Contributor nhận notification đã được duyệt

**VERIFY (Happy path đầy đủ 3 stage):**
- [ ] Contributor submit → vào Stage 1 queue
- [ ] Stage 1 pass → submission sang Stage 2 / `PENDING_REVIEW`
- [ ] Expert login → vào `/moderation` → claim submission ở Stage 2
- [ ] Expert annotation + approve → sang Stage 3
- [ ] Expert final approve → status `PUBLISHED`
- [ ] Recording xuất hiện public

**VERIFY (Reject path):**
- [ ] Reject ở Stage 1 → contributor thấy lý do auto-check
- [ ] Reject ở Stage 2 → contributor thấy expert feedback + revision request
- [ ] Reject thiếu lý do bị chặn

**VERIFY (Unclaim path):**
- [ ] Claim → Unclaim → queue refresh đúng
- [ ] Item không còn locked bởi expert hiện tại

**Bổ sung trước demo:**
- [ ] Claim collision test
- [ ] Double approve protection test
- [ ] Stale queue refresh test
- [ ] Stage badge hiển thị đúng trạng thái cho từng role

---

### Task P0.4 — QA Flag Source-of-Truth Unification

| Field | Value |
|-------|-------|
| **Agent** | `frontend-specialist` |
| **Skill** | `clean-code`, `api-patterns` |
| **Priority** | P0 |
| **Dependencies** | Không |
| **Effort** | 2–4 giờ |

```
ADR-004 — Single source of truth for AI flag state: API only, no localStorage
Decision: All AI flag/unflag operations route exclusively through
          qaMessageService API. localStorage AI review keys are deleted.
Reason:   localStorage is per-browser, per-session. Admin and Expert see
          different flag lists — making moderation decisions on inconsistent
          state is a critical data integrity failure for a scholarly archive.
Tradeoff: Requires network call for flag state. Acceptable — flag UI is not
          a hot-path, latency is tolerable.
Accepted risk: API unavailable → flag state not visible. Mitigation: show
              empty state with error message, do not fall back to localStorage.
```

> **Defense statement:** "A crowdsourced archive where Admin and Expert see different AI flag lists cannot be trusted by researchers. We eliminated localStorage as a state store for AI review to enforce a single, auditable source of truth."

**INPUT:** `ResearcherPortalPage.tsx`, `ModerationPage.tsx` AI tab, `qaMessageService.ts`

**OUTPUT:** Single API-backed source of truth for all AI flag state

**Phase 1:** Remove `pushAiResponseForExpertReview` from `ResearcherPortalPage` — stop writing to `AI_RESPONSES_REVIEW_KEY`

**Phase 2:** Moderation AI tab reads from API: `fetchAllMessages` → filter `role === 1` → flag/unflag via `qaMessageService`

**Phase 3:** Reuse `FlaggedResponseList` component + pass `currentUserId` to record `correctedByExpertId`

**Phase 4 — Grep verification (must all return 0 results):**
```bash
rg "AI_RESPONSES_REVIEW_KEY" src/
rg "pushAiResponseForExpertReview" src/
rg "AiResponseForReview" src/
```

**VERIFY:**
- [ ] Chatbot flag → Admin dashboard shows it
- [ ] Chatbot flag → Moderation AI tab shows it (same count)
- [x] Expert correction saved via API, not localStorage
- [ ] Admin flagged count matches API response
- [x] Grep phase 4 returns 0 results for all three patterns

---

### Task P0.5 — AI Analyze: Instrument Validation + Confidence Score

| Field | Value |
|-------|-------|
| **Agent** | `backend-specialist` + `frontend-specialist` |
| **Skill** | `api-patterns`, `frontend-design` |
| **Priority** | P0 |
| **Dependencies** | P0.3 (moderation flow stable) |
| **Effort** | 4–6 giờ |

```
ADR-005 — AI analysis is advisory; expert is authoritative
Decision: AI instrument detection, confidence scores, and metadata suggestions
          are displayed as ranked advisory input to the expert — never
          auto-applied to the archival record without explicit expert action.
Reason:   Audio ML models have non-trivial error rates on rare Vietnamese
          traditional instruments. Auto-applying incorrect metadata to an
          archival corpus causes permanent scholarly damage.
Tradeoff: Experts must actively confirm or override AI suggestions.
          This is a feature, not a limitation — it encodes scholarly authority.
Accepted risk: Experts may rubber-stamp AI suggestions without reading.
              Mitigation: UI requires explicit selection, not passive acceptance.
```

> **Defense statement:** "We do not collapse instrument detection to the highest-confidence signal because Vietnamese traditional recordings routinely contain ensemble instrumentation, regional hybrid variants, and performance styles that cross ethnic boundaries — a single instrument cannot determine archival metadata."

**Demo-safe minimum:**
- AI detect instruments → show list with confidence % badges
- declared vs detected mismatch → visible warning in Moderation AI tab
- `confidence < 60%` → yellow badge; `< 40%` → red badge + requires expert

**Production-safe full version:**
- Async job queue (BullMQ/Redis) for analysis pipeline
- Redis cache `metadata_merge:{id}:{policy_version}` — TTL 24h
- Re-run analysis on model version update (invalidate cache)
- `policy_version` stored on every analysis record for scholarly audit trail

#### Instructor Feedback — 4 yêu cầu AI Analyze

---

**Yêu cầu 1: Xác thực nhạc cụ có trong bản ghi**

> Không chỉ hiển thị metadata nhạc cụ do contributor khai báo, mà AI phải **phân tích audio** và xác thực xem nhạc cụ đó có thực sự xuất hiện trong bản ghi không.

Việc cần làm:
- [x] Gọi AI audio analysis API (hoặc Whisper/Essentia equivalent) tại bước upload hoặc moderation
- [x] So sánh `declared_instruments` (contributor khai báo) vs `detected_instruments` (AI detect)
- [x] Hiển thị match/mismatch rõ ràng trong Moderation AI tab
- [x] Expert thấy được: "Contributor khai báo: đàn bầu — AI detect: không tìm thấy đàn bầu"

**VERIFY:**
- [x] Upload audio có đàn tranh → AI detect đúng đàn tranh
- [x] Contributor khai báo sai nhạc cụ → AI flag mismatch
- [x] Expert thấy declared vs detected side-by-side

---

**Yêu cầu 2: Thêm Confidence Score % cho AI phân tích nhạc cụ**

> AI không bao giờ chắc chắn 100%. Phải hiển thị mức độ tin cậy để expert đánh giá.

Việc cần làm:
- [x] Backend trả về `confidence_score: number` (0–100) cho mỗi detected instrument
- [x] Frontend hiển thị badge % bên cạnh tên nhạc cụ (VD: `đàn tranh 87%`, `đàn bầu 23%`)
- [x] Threshold cảnh báo: < 60% hiển thị màu vàng, < 40% màu đỏ
- [x] Expert UI: nếu confidence thấp → prompt expert verify thủ công

**API Shape gợi ý:**
```ts
type InstrumentDetection = {
  instrument_name: string;     // "đàn tranh"
  confidence_score: number;    // 0–100 (e.g. 87)
  is_traditional: boolean;     // true
  match_declared: boolean;     // so với contributor khai báo
};
```

**VERIFY:**
- [x] Mỗi nhạc cụ detect hiển thị confidence %
- [x] Low confidence (< 60%) có visual warning
- [x] Expert thấy được để quyết định verify thủ công

---

**Yêu cầu 2b: Metadata Merge Policy khi nhiều nhạc cụ gợi ý metadata xung đột**

> **ADR-001** — Khi AI detect nhiều nhạc cụ và mỗi nhạc cụ gợi ý vùng miền khác nhau (vd: Đàn tranh → Miền Bắc, Sáo trúc → Miền Nam), hệ thống cần một chiến lược merge có thể giải thích được và an toàn với dữ liệu ethnomusicology.

**Quyết định kiến trúc: Strategy D — Hybrid Weighted Merge**

| Strategy | Lý do loại |
|----------|-----------|
| A — Cho user tự chọn | Contributor không đủ kiến thức chuyên ngành, gây metadata không nhất quán |
| B — Lấy instrument confidence cao nhất | Guitar 90% confidence không làm bài dân ca thành "nhạc guitar" |
| C — Rank theo confidence từng instrument | Bỏ qua GPS, genre, ethnic — mất signal quan trọng |
| **D — Hybrid weighted merge** | ✅ Kết hợp tất cả nguồn, có thể giải thích, expert override được |

**Công thức weighted merge:**

```text
final_region_score(candidate_region) =
  0.35 × instrument_signal   // AI-detected, strong but fallible
+ 0.30 × gps_signal          // objective — where was it recorded
+ 0.20 × genre_signal        // Quan họ → Bắc Ninh là gần tất định
+ 0.15 × ethnic_signal       // contributor declared, lowest trust
```

**Instrument sub-scoring (khi có nhiều nhạc cụ):**

```text
instrument_signal(region) =
  Sum [ confidence(i) × region_prior(instrument_i, region) ]
  / Sum [ confidence(i) ]
```

`region_prior` là lookup table do domain experts xây dựng, có version control:

```ts
const INSTRUMENT_REGION_PRIOR = {
  "dan_tranh":       { "mien_bac": 0.60, "mien_trung": 0.30, "mien_nam": 0.10 },
  "sao_truc":        { "mien_bac": 0.40, "mien_trung": 0.30, "mien_nam": 0.30 },
  "dan_bau":         { "mien_bac": 0.70, "mien_trung": 0.20, "mien_nam": 0.10 },
  "dan_kim":         { "mien_bac": 0.10, "mien_trung": 0.30, "mien_nam": 0.60 },
  "guitar_phim_lom": { "mien_bac": 0.10, "mien_trung": 0.20, "mien_nam": 0.70 },
  "guitar_modern":   { "mien_bac": 0.33, "mien_trung": 0.33, "mien_nam": 0.33 },
};
```

**Threshold rules:**

```text
gap = top_score - second_score

IF gap > 0.20  → AUTO-SUGGEST primary, badge [AI Suggested], expert vẫn override được
IF 0.05 ≤ gap ≤ 0.20  → SHOW top-3 ranked + warning "Possible mixed-region influence"
IF top_score < 0.50 OR gap < 0.05  → FLAG requires_expert = true, block Stage 3 auto-publish
```

**Expert UI output (Moderation AI tab):**

```
SUGGESTED REGION
  1. Miền Bắc   82%  [Primary — AI Suggested]
  2. Miền Trung  63%
  3. Miền Nam    47%

! Possible mixed-region influence detected — Gap: 19% — Expert review recommended

EVIDENCE BREAKDOWN
  Instrument signals → Miền Bắc (35%)
  GPS: Bắc Ninh      → Miền Bắc (30%)
  Genre: Quan họ     → Miền Bắc (20%)
  Ethnic: Kinh       → neutral  (15%)

EXPERT DECISION
  ( ) Accept AI suggestion: Miền Bắc
  ( ) Select: [Miền Trung ▼]
  ( ) Override with custom: [___________]
```

**DTO shape mở rộng:**

```ts
type MetadataEvidence = {
  source: "instrument" | "gps" | "genre" | "ethnic";
  value: string;           // "dan_tranh", "Bac Ninh", "Quan ho"
  confidence: number;      // 0-100
  weight: number;          // 0.35 | 0.30 | 0.20 | 0.15
  region_prior?: Record<string, number>;
};

type MetadataSuggestion = {
  field: "region" | "genre" | "ethnic_group" | "instrument_type";
  candidates: Array<{
    value: string;
    display_label: string;
    final_score: number;        // 0-1
    is_primary: boolean;        // gap > 0.20
    evidence: MetadataEvidence[];
  }>;
  conflict_detected: boolean;    // gap < 0.20
  requires_expert: boolean;      // top_score < 0.50 hoặc gap < 0.05
  contributor_declared?: string; // KHÔNG BAO GIỜ overwrite
  expert_override?: string;
  policy_version: string;        // "v1.0" — auditability
};
```

**Performance — Async Job Queue:**

```text
Upload → 202 Accepted (fast) → Job Queue (BullMQ/Redis)
  → Worker: AI detect → merge → store → notify
  → Expert đọc từ Redis cache (không recompute)

Cache key: metadata_merge:{recording_id}:{policy_version}
TTL: 24h — invalidate khi AI re-run hoặc contributor edit metadata
```

**Acceptance criteria cho merge policy:**

- [ ] Expert thấy ranked suggestions với final_score % + evidence breakdown
- [ ] "Possible mixed-region influence" hiện khi gap < 20%
- [ ] `contributor_declared` field luôn được preserve, không bị overwrite
- [ ] Expert override được ghi vào `ExpertMetadataDecision` audit log
- [ ] `policy_version` lưu trên mọi analysis record (scholarly auditability)
- [ ] Upload response trả về 202 ngay — AI analysis chạy async (không block UX)
- [ ] Expert UI không recompute score khi mở moderation — đọc từ cache

---

**Yêu cầu 3: Xử lý cross-case nhạc cụ truyền thống / hiện đại**

> Phải handle 2 trường hợp:
> - Nhạc dân tộc (bài dân ca truyền thống) nhưng được chơi bằng nhạc cụ hiện đại (guitar, piano, violin)
> - Nhạc đương đại (bài hiện đại) nhưng được chơi bằng nhạc cụ truyền thống (đàn bầu, đàn tranh, trống)

Việc cần làm — Upload metadata:
- [ ] Thêm field `instrument_type` cho mỗi nhạc cụ khai báo:
  ```
  traditional | modern | hybrid
  ```
- [ ] Thêm field `song_category`:
  ```
  traditional_folk | contemporary_traditional | modern_fusion | ceremonial
  ```
- [ ] Validation: nếu `song_category = traditional_folk` nhưng tất cả instruments là `modern` → warning, không block

Việc cần làm — AI Detection:
- [ ] AI phân biệt traditional vs modern instruments trong audio
- [ ] Label rõ: `"guitar (modern instrument detected in traditional folk song)"`
- [ ] Researcher/Expert search được theo: "bài dân ca chơi bằng guitar"

Việc cần làm — Moderation:
- [x] Expert thấy cross-case warning: "Nhạc dân tộc + nhạc cụ hiện đại"
- [x] Expert có thể mark explicitly: `traditional_with_modern_instruments` hoặc `contemporary_with_traditional_instruments`

**VERIFY:**
- [ ] Upload "Trống cơm" chơi bằng guitar → AI detect guitar, category flag = `modern_fusion`
- [ ] Upload nhạc pop/rock chơi bằng đàn tranh → detect traditional instrument in contemporary song
- [ ] Search "nhạc dân ca có guitar" trả về kết quả đúng
- [ ] Expert UI hiển thị cross-case warning rõ ràng

---

**Yêu cầu 4: Tiêu chí so sánh 2 bản ghi cùng bài, khác nhạc cụ**

> Ví dụ: "Trống cơm" phiên bản đàn bầu vs "Trống cơm" phiên bản đàn tranh — hệ thống phải hỗ trợ compare.

Việc cần làm — Data Model:
- [ ] Field `base_song_title` (normalized) để group các phiên bản khác nhau
- [ ] Field `version_descriptor`: instrument combination, region, year, performer
- [ ] Relationship: `recording A` và `recording B` đều thuộc `base_song = "Trống cơm"`

Việc cần làm — Researcher UI:
- [x] Researcher search "Trống cơm" → thấy tất cả versions grouped (demo-safe via base-title grouping helper)
- [x] Compare panel hiển thị side-by-side:
  | Tiêu chí | Version A (đàn bầu) | Version B (đàn tranh) |
  |----------|--------------------|-----------------------|
  | Nhạc cụ | Đàn bầu | Đàn tranh |
  | Vùng miền | Bắc Bộ | Nam Bộ |
  | Thể loại | Quan họ | Cải lương |
  | AI confidence | 91% | 85% |
  | Performer | Nghệ nhân A | Nghệ nhân B |
  | Ghi âm | 1987 | 2003 |

**VERIFY:**
- [x] 2 bản ghi cùng `base_song_title` → hiển thị trong cùng group (demo-safe FE grouping)
- [x] Compare panel load đúng 2 recordings
- [x] Instrument, region, genre, confidence hiển thị side-by-side
- [ ] Researcher có thể compare từ search result hoặc recording detail

---

**Yêu cầu 5: Handle vùng miền ghi âm + thể loại âm nhạc**

> Bản ghi phải lưu và tìm kiếm được theo: **vùng miền ghi âm** và **thể loại âm nhạc**.

Việc cần làm — Upload metadata:
- [ ] Field `recording_region`: dropdown vùng miền (Bắc Bộ, Trung Bộ, Nam Bộ, Tây Nguyên, Tây Bắc...)
- [ ] Field `music_genre`: dropdown thể loại (Quan họ, Chèo, Cải lương, Hát xoan, Nhã nhạc, Dân ca...)
- [ ] GPS coordinates → auto-suggest region dựa trên tọa độ
- [ ] Validation: region + ethnic group phải có logic hợp lý (warning nếu lạ, không block)

Việc cần làm — Search/Filter:
- [ ] Researcher search theo `recording_region`
- [ ] Researcher filter theo `music_genre`
- [ ] Advanced query: "Quan họ Bắc Ninh ghi âm ở Bắc Bộ"
- [ ] Knowledge graph: region node → connects to ethnic groups, genres, recordings

**VERIFY:**
- [ ] Upload với region "Bắc Bộ" + genre "Quan họ" → lưu đúng
- [ ] Researcher filter region = "Bắc Bộ" → chỉ hiện bản ghi Bắc Bộ
- [ ] Researcher filter genre = "Cải lương" → đúng kết quả
- [ ] GPS auto-suggest region hoạt động (không bắt buộc chọn đúng)
- [ ] Recording detail hiển thị region + genre rõ ràng

---

## 🟡 P1 — RẤT NÊN làm trước khi freeze code

---

### Task P1.1 — UI Consistency (Surface Tokens + ModalShell + Button)

| Field | Value |
|-------|-------|
| **Agent** | `frontend-specialist` |
| **Skill** | `frontend-design`, `tailwind-patterns` |
| **Priority** | P1 |
| **Dependencies** | P0.2, P0.3 |
| **Effort** | 3–5 giờ |

**OUTPUT:** Unified design language cho toàn bộ UI

**Sub-task A — Surface Tokens:**
- [ ] Tạo `src/utils/surfaceTokens.ts`
- [ ] Áp dụng cho: RecordingDetailPage, ExplorePage, ContributionsPage, ProfilePage, SearchPage, HomePage

**Sub-task B — ModalShell:**
- [ ] Tạo `src/components/common/ModalShell.tsx`
- [ ] Áp dụng cho: Profile modal, Moderation wizard dialog, Contributions detail, Login gateway

**Sub-task C — Button unify:**
- [ ] Thay raw button bằng `<Button>` ở: DisputeReportForm, FlaggedResponseList, DisputeListPanel, ModerationClaimActions, ModerationModals, AdminDashboard

**VERIFY:**
- [ ] Không còn hardcoded `#FFF2D6` trong modal chính
- [ ] Card/panel chính dùng token chung
- [ ] Destructive action dùng danger style
- [ ] Modal không lệch tone với Explore
- [ ] Không phá layout mobile

---

### Task P1.2 — Toast Anti-Duplicate

| Field | Value |
|-------|-------|
| **Agent** | `frontend-specialist` |
| **Skill** | `clean-code` |
| **Priority** | P1 |
| **Dependencies** | P0.2, P0.3 |
| **Effort** | 1–2 giờ |

**OUTPUT:** Toast không bị spam duplicate trong 2 giây

- [ ] Thêm `shouldShowToast(key, windowMs)` vào `uiToast`
- [ ] Áp dụng cho: upload submit, moderation approve/reject, network error, validation warning

**VERIFY:**
- [ ] Login sai → error toast (1 lần)
- [ ] Upload submit success → success toast (1 lần)
- [ ] Moderation approve → success toast (1 lần)
- [ ] Toast không bị modal che
- [ ] Offline mode → network error toast hợp lý

---

### Task P1.3 — Production Smoke Checklist Manual

| Field | Value |
|-------|-------|
| **Agent** | `test-engineer` |
| **Skill** | `webapp-testing` |
| **Priority** | P1 |
| **Dependencies** | P0.1, P0.2, P0.3 |
| **Effort** | 30–60 phút |

**OUTPUT:** Smoke checklist được chạy và log kết quả

| Role | Check |
|------|-------|
| Guest | HomePage, ExplorePage, recording detail, login modal |
| Contributor | Login → upload → submit → xem contributions |
| Expert | Login → moderation → claim → approve/reject |
| Researcher | Login → portal → search/filter → graph/compare → export |
| Admin | Login → dashboard → user mgmt → AI monitoring → analytics |

---

### Task P1.4 — Notification Flow Sync

| Field | Value |
|-------|-------|
| **Agent** | `frontend-specialist` |
| **Skill** | `api-patterns` |
| **Priority** | P1 |
| **Dependencies** | P0.4 |
| **Effort** | 2–3 giờ |

```
ADR-006 — Backend is source of truth for notifications; FE addNotification
          is permitted only for events backend does not auto-generate.
Decision: Map every notification event to either "backend auto-creates" or
          "FE must call addNotification". No event should have both paths.
Reason:   Dual-write (backend + FE both creating notifications for same event)
          produces duplicate inbox entries — eroding user trust in the archive.
Tradeoff: Requires coordination with backend team on event contract.
Accepted risk: Events not yet on backend may temporarily require FE fallback.
              Document them explicitly; remove FE path once backend supports.
```

**OUTPUT:** Notification inbox đồng bộ, không duplicate, nguồn sự thật là backend API

**Câu hỏi phải trả lời trước khi code:**
1. Backend auto-tạo notification cho event nào? (cần document)
2. Type PascalCase từ BE → map sang snake_case FE thế nào?
3. Click notification route đến đâu cho mỗi type?

**VERIFY:**
- [ ] Header badge unread count đúng
- [ ] NotificationPage unread đúng
- [ ] Mark read syncs badge immediately
- [ ] No duplicate notification for any event that backend auto-generates
- [ ] Click notification navigates to correct route per notification type

---

## 🟢 P2 — Làm sau khi core ổn định

> ⚠️ Không làm P2 nếu P0 chưa pass.

| Task | Nội dung | Dependencies | Effort |
|------|----------|-------------|--------|
| P2.1 | Refactor UploadMusic.tsx (split theo feature folder) | P0.2 + P0.1 PASS | 5–8h |
| P2.2 | OpenAPI/Swagger cleanup + legacy QA exports removal | P0.4 | 3–5h |
| P2.3 | Researcher hardening (advanced search, graph, export) | P0.1 E2E PASS | 5–8h |
| P2.4 | Submission version history manual verify | P0.3 | 1–2h |

---

## ⚪ P3 — Sau defense / post-release

| Task | Nội dung | Khi nào |
|------|----------|---------|
| P3.1 | Typography polish | Sau defense |
| P3.2 | Loading skeleton toàn hệ thống | Sau defense |
| P3.3 | Full toast automation E2E | Sau defense |
| P3.4 | Whisper transcription UI | Chờ backend pipeline |

---

## 🚨 5 File Nguy hiểm nhất

| File | Nguy hiểm vì | Rule |
|------|-------------|------|
| `UploadMusic.tsx` | File lớn, nhiều state, upload + GPS + submit chung | Không sửa nhiều logic cùng lúc |
| `ModerationPage.tsx` | Claim/unclaim, approve/reject, wizard, embargo, AI tab | UI refactor phải giữ business invariant |
| `ResearcherPortalPage.tsx` | Search + QA + Graph + Compare + Export + API/local mix | Không sửa nhiều tab trong 1 PR |
| `recordingRequestService.ts` | Notification + legacy axios mix | Không migrate toàn file nếu chưa có test |
| `auth / route guard layer` | Login redirect + role guard + researcher pending | Mọi thay đổi phải test đủ role |

---

## Sprint Plan gợi ý

### Nếu còn 1 tuần

| Ngày | Việc làm |
|------|----------|
| Day 1 | Chạy release gate → fix fail E2E → upload smoke |
| Day 2 | Moderation 3-stage hardening (P0.3) + claim/stale/double approve |
| Day 3 | AI Analyze: instrument validation + confidence score (P0.5 - phần 1 & 2) |
| Day 4 | AI cross-case handling + region/genre metadata + compare panel (P0.5 - phần 3, 4, 5) |
| Day 5 | QA flag API unify + Surface tokens + Modal cleanup |
| Day 6 | Production smoke manual tất cả role + document known issues |
| Day 7 | Freeze demo branch + demo script + screenshots/evidence |

### Nếu còn 3 ngày

```text
1. Release gate (P0.1)
2. Upload smoke + region/genre fields (P0.2 + P0.5 phần 5)
3. Moderation 3-stage rõ (P0.3)
4. AI confidence score hiển thị (P0.5 phần 2)
5. Production smoke (P1.3)
```

### Nếu chỉ còn 1 ngày → Login tất cả role / Upload với region+genre / Expert approve 3 stage / AI confidence visible / Researcher search+compare

---

## Final Go / No-Go Checklist

### ✅ GO

- [ ] `npm run build` pass
- [ ] `npm run lint` pass
- [ ] Contributor smoke pass
- [ ] Expert moderation smoke pass (3 stages rõ ràng)
- [ ] Researcher search/detail pass
- [ ] Admin dashboard load pass
- [ ] No critical console errors
- [ ] No broken route guard
- [ ] Demo script end-to-end
- [ ] AI Analyze hiển thị detected instruments + confidence %
- [ ] Upload có field region (vùng miền) + genre (thể loại)
- [ ] Compare panel hoạt động cho 2 recordings cùng bài

### 🚫 NO-GO

- [ ] Không login được
- [ ] Upload không submit được
- [ ] Expert không approve/reject được
- [ ] 3 stage moderation không phân biệt được trên UI
- [ ] AI Analyze không có confidence score
- [ ] Researcher portal crash
- [ ] Admin dashboard crash
- [ ] Routing guard redirect loop
- [ ] API env missing → app trắng màn hình

---

## Phase X: Verification Commands

```bash
# Build & lint
npm run lint && npx tsc --noEmit
npm run build

# E2E release gate
npm run test:e2e:release

# Cleanup grep checks
rg "AI_RESPONSES_REVIEW_KEY" src/
rg "pushAiResponseForExpertReview" src/
rg "as unknown as" src/services/
rg "react-hot-toast" src/

# Security & UX audit
python .agent/skills/vulnerability-scanner/scripts/security_scan.py .
python .agent/skills/frontend-design/scripts/ux_audit.py .
```

---

## Architecture Decision Index

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Metadata merge: Hybrid Weighted Policy (instrument 35% + GPS 30% + genre 20% + ethnic 15%) | Proposed |
| ADR-002 | Upload returns 202 immediately; AI analysis is async via job queue | Proposed |
| ADR-003 | 3-stage moderation with claim locking; no auto-publish path | Proposed |
| ADR-004 | AI flag state: API only — localStorage writes deleted | Proposed |
| ADR-005 | AI analysis is advisory; expert decision is authoritative | Proposed |
| ADR-006 | Backend is notification source of truth; FE addNotification for gaps only | Proposed |

---

## Known Limitations — Defense-Ready Responses

| Topic | Response (nói chủ động, không né tránh) |
|-------|----------------------------------------|
| Semantic search | "Current implementation uses deterministic ranking. Vector-based semantic retrieval with embedding/vector store is the production roadmap — we chose to ship a reliable baseline rather than an unreliable ML feature." |
| Whisper transcription | "UI is designed against a defined contract. Whisper pipeline requires backend job processing infrastructure that is outside the current release scope — this is an intentional boundary, not an oversight." |
| AI instrument accuracy | "We surface confidence scores explicitly and gate low-confidence cases to expert review. The system is designed as expert-assisted, not autonomous — this is architecturally safer for a scholarly archive." |
| Region prior lookup table | "Priors encode published ethnomusicological consensus, are versioned, and can be refined by domain experts as the corpus grows. Future direction is learning optimal priors from expert override patterns." |
| Mobile app | "Responsive web with PWA direction. Native mobile is outside the current release scope." |
| Scale / pgvector | "Current architecture supports horizontal scaling at the worker layer. pgvector or a dedicated vector index is the production path when corpus size justifies it." |
