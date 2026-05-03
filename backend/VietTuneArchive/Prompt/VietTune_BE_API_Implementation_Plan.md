# VietTune BE API Implementation Plan

## Mục tiêu
Plan này gửi cho backend team để biết chính xác API nào cần ưu tiên cho demo-ready.

---

# Phase P0 — Phải làm trước demo

## 1. Submission DTO Patch

### Existing endpoint giữ nguyên
POST /api/Submissions  
PUT /api/Submissions/{id}

### Cần patch request DTO:
- regionId
- genreId
- songCategory
- instrumentType

### Rule:
- optional field
- không break dữ liệu cũ

---

## 2. Moderation 3-stage API

### Verify endpoint hiện có
GET /api/Admin/submissions  
POST /api/Admin/submissions/{id}/assign  
POST /api/Admin/submissions/{id}/approve  
POST /api/Admin/submissions/{id}/reject  

### Cần bổ sung:
POST /api/Moderation/{submissionId}/advance-stage  
POST /api/Moderation/{submissionId}/claim  
POST /api/Moderation/{submissionId}/release  

### Logic:
- screening -> verification -> approval
- không skip stage
- stale claim cần release được

---

## 3. Metadata Suggestion API

### New endpoint
GET /api/MetadataSuggestion/{recordingId}

### Response:
- candidates
- finalScore
- isPrimary
- conflictDetected
- policyVersion

### Optional:
POST /api/MetadataSuggestion/{recordingId}/expert-decision

---

## 4. Compare API

### New endpoint
GET /api/Recordings/compare?recordingIds=id1,id2

### Mục tiêu:
- compare 2 recordings
- show region
- show genre
- show detected instruments

---

## 5. Search Filter Patch

### Existing endpoint patch:
GET /api/Recordings/search

### Add query params:
- regionId
- genreId
- instrumentType

---

# Phase P1 — Sau demo

## AI async jobs
POST /api/AI/jobs  
GET /api/AI/jobs/{jobId}

## Cache later
Redis optional

## SignalR optional

---

# Senior priority nếu ít thời gian

1. Moderation
2. MetadataSuggestion
3. Compare
4. DTO patch

---

# Strong rule

Patch endpoint cũ trước.
Chỉ tạo endpoint mới nếu business flow bắt buộc.