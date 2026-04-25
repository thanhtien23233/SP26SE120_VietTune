You are implementing API integration tests for the Media flow in VietTuneArchive.Tests.
Infrastructure (WebAppFactory, JwtTokenHelper, ApiTestBase, DatabaseFixture) is
already set up. Do NOT modify any fixture files unless absolutely required.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.API/Controllers/MediaController.cs            ← routes, auth/policy
- VietTuneArchive.Application/Services/ (MediaService or equivalent)
- VietTuneArchive.Application/DTOs/Media/ (all files)           ← request/response shape
- VietTuneArchive.Domain/Entities/MediaFile.cs (or equivalent)
- VietTuneArchive.Domain/Enums/ (MediaType, MediaStatus, or equivalent)
- VietTuneArchive.API/Policies/ or Authorization/ (Owner policy definition)
- VietTuneArchive.Tests/Integration/Fixtures/                   ← all fixture files
- VietTuneArchive.Tests/Integration/Fixtures/DatabaseFixture.cs

Confirm exact route paths, Owner policy implementation, file size limits,
accepted MIME types, and streaming behavior before writing any test.

## TARGET FILE
VietTuneArchive.Tests/Integration/Controllers/MediaControllerTests.cs

## BASE CLASS
Inherit ApiTestBase. Use JwtTokenHelper for role tokens.
Owner policy: user must own the submission to access its media.
Seed submissions and media files directly via DbContext in test setup.

---

## TEST CASES

### POST /api/Media/submissions/{submissionId}/files [Authorize(Policy="Owner")]
- Valid audio file [Owner/Contributor] → 201, mediaFileId returned
- Valid video file [Owner] → 201
- Valid image file [Owner] → 201
- [Admin] → 201 or 403 per Owner policy impl (document behavior)
- [Expert] → 201 or 403 per Owner policy impl
- Non-owner Contributor → 403
- Unauthenticated → 401
- Non-existent submissionId → 404
- File too large (exceeds limit) → 413
- Unsupported MIME type (e.g., .exe) → 415 or 400
- Missing file in request → 400
- Empty file (0 bytes) → 400
- After upload → MediaFile persisted in DB with:
    submissionId, uploadedBy, fileName, mimeType, fileSize, isPrimary=false
- First file uploaded → isPrimary=true (if auto-set rule exists)

### GET /api/Media/submissions/{submissionId}/files [Authorize(Policy="Owner")]
- Owner → 200, list of media files for submission
- Non-owner → 403
- Unauthenticated → 401
- Non-existent submissionId → 404
- Submission with no files → 200 empty list
- Response per file: id, fileName, mimeType, fileSize, isPrimary, createdAt

### GET /api/Media/{mediaFileId}
- Valid id [Authenticated] → 200, media file metadata DTO
- Non-existent id → 404
- Unauthenticated → 401 or 200 per auth rule (check controller)
- Response contains: id, fileName, mimeType, fileSize, isPrimary, submissionId

### DELETE /api/Media/{mediaFileId} [Authorize(Policy="Owner")]
- Own media file [Owner] → 204, file removed from DB
- Non-owner → 403
- Unauthenticated → 401
- Non-existent id → 404
- Primary file deletion → 400 (cannot delete primary) or 204 + auto-promote
- After delete → GET /{mediaFileId} returns 404
- After delete → GET /submissions/{id}/files no longer contains deleted file

### PUT /api/Media/{mediaFileId}/set-primary [Authorize(Policy="Owner")]
- Own media file [Owner] → 200, isPrimary=true in DB
- Previous primary file → isPrimary=false in DB (only one primary at a time)
- Non-owner → 403
- Unauthenticated → 401
- Non-existent mediaFileId → 404
- Already primary file → 200 idempotent
- After set-primary → GET /submissions/{id}/files shows exactly one isPrimary=true

### GET /api/Media/{mediaFileId}/stream
- Valid mediaFileId [Authenticated or Anonymous per rule] → 206 Partial Content
- Request with Range header → 206, correct byte range returned
- Request without Range header → 200 full content or 206 per impl
- Non-existent id → 404
- Response headers contain:
    Content-Type matching file mimeType
    Accept-Ranges: bytes
    Content-Length (if not chunked)
- Stream returns actual file bytes (not empty)

### GET /api/Media/{mediaFileId}/download
- Valid id → 200, file bytes in response body
- Response headers contain:
    Content-Disposition: attachment; filename="originalFileName"
    Content-Type matching mimeType
- Non-existent id → 404
- File name in Content-Disposition matches uploaded fileName

### GET /api/Media/{mediaFileId}/thumbnail
- Valid id for image/video file → 200, thumbnail bytes returned
- Valid id for audio file → 200 default thumbnail or 404 per impl
- Non-existent id → 404
- Response Content-Type is image/* (png, jpeg, etc.)
- Thumbnail smaller than original file size

---

### File Upload Edge Cases
- Upload file with no extension → handled without crash
- Upload file with misleading extension (txt file named .mp3) →
  detected by content sniffing or accepted by name — document behavior
- Upload duplicate file name for same submission →
  accepted with unique storage name or rejected — document behavior
- Upload when submission is Approved (closed) →
  rejected or allowed per business rule — document behavior

### Multi-file & Primary Promotion
- Upload 3 files for same submission → all persisted, first is primary
- Delete primary file → second file auto-promoted to primary (if rule exists)
  OR deletion blocked (if primary cannot be deleted)
- Set non-existent file as primary → 404
- Set file belonging to different submission as primary → 403 or 404

### Streaming Integrity
- Upload small test file (< 1MB in-memory bytes)
- GET /stream → response body bytes match uploaded bytes exactly
- GET /download → response body bytes match uploaded bytes exactly
- Assert: sha256(uploaded) == sha256(downloaded)

---

## IMPLEMENTATION RULES

1. Inherit ApiTestBase — use GetAsync, DeleteAsync, PutAsync<T> helpers
   For file upload: construct MultipartFormDataContent manually:
   var content = new MultipartFormDataContent();
   var fileBytes = new byte[] { 0xFF, 0xFB, ... }; // fake audio header bytes
   content.Add(new ByteArrayContent(fileBytes), "file", "test.mp3");
   var response = await Client.PostAsync(url, content);

2. File content for tests — use minimal valid byte arrays per MIME type:
   - Audio MP3:  new byte[] { 0xFF, 0xFB, 0x90, 0x00 } + padding
   - Image JPEG: new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 } + padding
   - Video MP4:  new byte[] { 0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70 }
   - Invalid:    new byte[] { 0x4D, 0x5A } (EXE magic bytes)
   Do NOT read real files from disk — keep tests self-contained

3. Owner policy setup:
   - Seed submission owned by contributorUser in test setup
   - Use contributorToken for Owner tests
   - Use differentContributorToken for non-owner tests
   - If Admin bypasses Owner policy — document and test this explicitly

4. For file storage in test environment:
   - If app saves to disk → WebAppFactory should configure temp directory
   - If app saves to cloud storage → stub IStorageService in WebAppFactory
     to return deterministic URLs and store bytes in-memory Dictionary
   - Expose storage stub from WebAppFactory for byte comparison in streaming tests

5. Each test independent:
   - Seed fresh submission + upload fresh file per test for write operations
   - For read-only tests: share seeded media file at class level
   - Never share mutable state between tests

6. For DB state assertions:
   - Resolve AppDbContext from WebAppFactory.Services scope
   - Assert MediaFile.IsPrimary, MediaFile.FileName, MediaFile presence/absence

7. Naming: Endpoint_Scenario_ExpectedResult
   Example: UploadFile_WithUnsupportedMimeType_Returns415
            SetPrimary_ClearsPreviousPrimaryFile_OnlyOnePrimaryInDb
            StreamFile_WithRangeHeader_Returns206WithCorrectBytes
            DownloadFile_ContentDispositionContainsOriginalFileName
            DeletePrimaryFile_WhenAutoPromotionExists_SecondFileBecomePrimary
            UploadFile_ExceedingSizeLimit_Returns413

8. Group by nested classes:
   - UploadFileTests
   - GetSubmissionFilesTests
   - GetMediaFileTests
   - DeleteMediaFileTests
   - SetPrimaryTests
   - StreamTests
   - DownloadTests
   - ThumbnailTests
   - EdgeCaseTests
   - MultiFileTests
   - StreamingIntegrityTests

9. For streaming integrity test:
   var uploadBytes = GenerateTestAudioBytes(1024); // 1KB
   // upload → get mediaFileId
   var streamResponse = await GetAsync($"/api/Media/{mediaFileId}/stream");
   var downloadedBytes = await streamResponse.Content.ReadAsByteArrayAsync();
   downloadedBytes.Should().BeEquivalentTo(uploadBytes);

10. Content-Disposition assertion:
    var disposition = response.Content.Headers.ContentDisposition;
    disposition.DispositionType.Should().Be("attachment");
    disposition.FileName.Should().Be("test.mp3");

## VERIFICATION
Run: dotnet test --filter "MediaControllerTests"
All tests must be green. Fix errors before proceeding.

Check coverage delta:
- MediaController → ≥ 80% line coverage
- MediaService upload/stream/download branches covered
- Storage stub behavior documented for team

## REPORT
Create: VietTuneArchive.Tests/Report/MEDIA_API_TEST_REPORT.md

Include:
- Date generated
- Total tests written, pass/fail count
- All test method names grouped by category
- Route paths confirmed (list all 8 endpoints)
- Owner policy behavior observed:
  (table: Role → Upload/GetFiles/Delete/SetPrimary → Allowed/Forbidden)
- File storage approach in test environment:
  (disk temp dir / in-memory stub / cloud stub — which was used)
- MIME types tested and validation behavior observed
- File size limit observed (what limit was enforced)
- Primary file behavior observed:
  (auto-set on first upload? / delete primary blocked or promoted?)
- Streaming: Range header support verified (206 vs 200)
- Byte integrity test result (upload == download)
- Uncovered scenarios and reason
- Estimated MediaController coverage delta
- Deferred cases:
    (virus scanning integration, CDN URL signing, media transcoding
     status endpoint, bulk file operations, resumable upload)

Keep concise — no fluff.