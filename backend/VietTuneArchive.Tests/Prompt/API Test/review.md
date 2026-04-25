You are implementing API integration tests for the Recording flow in VietTuneArchive.Tests.
Infrastructure (WebAppFactory, JwtTokenHelper, ApiTestBase, DatabaseFixture) is
already set up. Do NOT modify any fixture files unless absolutely required.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.API/Controllers/RecordingController.cs       ← routes, auth roles
- VietTuneArchive.API/Controllers/RecordingGuestController.cs  ← public routes
- VietTuneArchive.Application/Services/RecordingService.cs     ← business rules
- VietTuneArchive.Application/DTOs/Recording/ (all files)      ← request/response shape
- VietTuneArchive.Domain/Entities/Recording.cs
- VietTuneArchive.Domain/Enums/ (RecordingStatus, ApprovalStatus, or equivalent)
- VietTuneArchive.Tests/Integration/Fixtures/                  ← all fixture files
- VietTuneArchive.Tests/Integration/Fixtures/DatabaseFixture.cs ← seeded reference data

Confirm exact route paths, DTO field names, role restrictions,
and approval/visibility rules before writing any test.

## TARGET FILE
VietTuneArchive.Tests/Integration/Controllers/RecordingControllerTests.cs

## BASE CLASS
Inherit ApiTestBase. Use JwtTokenHelper for role tokens.
Use DatabaseFixture seeded data (EthnicGroup, Instrument, Ceremony, Province, etc.)

---

## TEST CASES

### GET /api/Recording (authenticated — all roles)
- [Admin] → 200, returns paginated list
- [Expert] → 200
- [Contributor] → 200
- [Researcher] → 200
- Unauthenticated → 401
- Pagination: page=1&size=5 → max 5 results returned
- Pagination: page=2 → next slice returned
- Empty DB → 200 with empty list, not error

### GET /api/Recording/{id}
- Valid id [any authenticated role] → 200, correct recording returned
- Non-existent id → 404
- Soft-deleted recording → 404 (if soft delete implemented)
- Unauthenticated → 401
- Response body contains all expected fields:
  (id, title, ethnicGroup, instruments, ceremony, location, approvalStatus)

### PUT /api/Recording/{id}/upload (UploadRecordInfo)
- Valid payload [Contributor] → 200, recording fields updated in DB
- Valid payload [Expert] → 200
- Valid payload [Admin] → 200
- [Researcher] → 403
- Unauthenticated → 401
- Non-existent recordingId → 404
- Invalid ethnicGroupId (not in DB) → 400 or 404
- Invalid instrumentId (not in DB) → 400 or 404
- Invalid ceremonyId (not in DB) → 400 or 404
- Invalid provinceId (not in DB) → 400 or 404
- Missing required field (title null) → 400
- After successful upload → EmbeddingService stub called (verify via spy)
- After successful upload → DB reflects updated fields

### GET /api/Recording/search-by-title
- Query matches existing title → 200, correct result returned
- Partial match → 200, all matches returned
- No match → 200, empty list
- Empty query string → 400 or empty result per impl
- Vietnamese diacritics in query → matched correctly
- Unauthenticated → 401
- [Researcher] → 200 (allowed role)

### GET /api/Recording/search-by-filter
- Filter by ethnicGroupId → 200, only matching recordings
- Filter by instrumentId → 200, only matching recordings
- Filter by ceremonyId → 200, only matching recordings
- Filter by approvalStatus=Approved → only approved returned
- Filter by approvalStatus=Pending → only pending returned
- Multiple filters combined → intersection returned
- No filters → all recordings paginated
- Filter with no matching results → empty list, not error
- Unauthenticated → 401

---

### GET /api/RecordingGuest (public — no auth required)
- Anonymous request → 200, returns only Approved recordings
- Pending/Draft recordings NOT included in response
- Rejected recordings NOT included in response
- Pagination respected
- Empty approved set → 200 empty list

### GET /api/RecordingGuest/{id}
- Valid id, Approved recording → 200, full detail returned
- Valid id, Pending recording → 404 or 403 (not visible to guest)
- Valid id, Rejected recording → 404 or 403
- Non-existent id → 404
- Response contains public-safe fields only (no internal status fields if hidden)

### GET /api/RecordingGuest/search-by-title
- Query → 200, only Approved recordings in results
- Pending recording with matching title → NOT returned
- Empty result → 200 empty list

### GET /api/RecordingGuest/search-by-filter
- Filter by ethnicGroupId → only Approved in that group
- Filter by instrumentId → only Approved with that instrument
- Combined filter → correct approved subset

---

### Approval Visibility Rules (cross-cutting)
- Recording created → default ApprovalStatus = Pending (not visible to guest)
- Admin/Expert can see Pending recordings via /api/Recording
- Guest sees only Approved via /api/RecordingGuest
- After submission approved → ApprovalStatus = Approved → visible to guest
- Assert these visibility rules by querying both endpoints for same recordingId

### Embedding Side Effect
- After PUT /api/Recording/{id}/upload succeeds →
  IEmbeddingService stub was invoked with correct recordingId
- If EmbeddingService throws → recording still saved (resilience check)
  Assert: PUT returns 200, DB has updated fields despite embedding failure

---

## IMPLEMENTATION RULES

1. Inherit ApiTestBase — use GetAsync, PutAsync<T> helpers
2. Each test fully independent:
   - Seed a fresh recording per test or use a shared seeded recording
     from DatabaseFixture for read-only tests
   - For write tests (PUT upload) create dedicated recording to avoid state bleed
3. For DB state assertions:
   - Resolve AppDbContext from WebAppFactory.Services scope
   - Assert recording fields directly after PUT
4. For EmbeddingService spy:
   - Register IEmbeddingService as a Moq mock in WebAppFactory
   - Expose it via WebAppFactory property so tests can call Verify()
5. Naming: Endpoint_Scenario_ExpectedResult
   Example: GetById_WithNonExistentId_Returns404
            UploadRecordInfo_WithInvalidEthnicGroupId_Returns400
            GuestGetById_WithPendingRecording_Returns404
            SearchByFilter_WithEthnicGroupAndInstrumentFilter_ReturnsIntersection
            UploadRecordInfo_WhenEmbeddingThrows_RecordingStillSaved
6. Group by nested classes:
   - GetAllTests
   - GetByIdTests
   - UploadRecordInfoTests
   - SearchByTitleTests
   - SearchByFilterTests
   - GuestGetAllTests
   - GuestGetByIdTests
   - GuestSearchTests
   - ApprovalVisibilityTests
   - EmbeddingSideEffectTests
7. Shared helper within test class:
   - SeedRecording(status, approvalStatus) → inserts recording directly
     via DbContext and returns its id
   - Use this to control approval state without going through full submission flow
8. Assert both status code AND response body shape:
   response.StatusCode.Should().Be(HttpStatusCode.OK);
   var body = await response.Content.ReadFromJsonAsync<RecordingDto>();
   body.Title.Should().Be("expected title");
   body.EthnicGroup.Should().NotBeNull();
9. For guest visibility: call both /api/Recording/{id} (with Admin token)
   AND /api/RecordingGuest/{id} (no token) for same id and compare results

## VERIFICATION
Run: dotnet test --filter "RecordingControllerTests"
All tests must be green. Fix errors before proceeding.

Check coverage delta:
- RecordingController → ≥ 80% line coverage
- RecordingGuestController → ≥ 80% line coverage
- RecordingService.UploadRecordInfo branches gain additional coverage
  (combined with Phase 1 unit tests, target ≥ 70% branch coverage)

## REPORT
Create: VietTuneArchive.Tests/Report/RECORDING_API_TEST_REPORT.md

Include:
- Date generated
- Total tests written, pass/fail count
- All test method names grouped by category
- Route paths confirmed (list all from both controllers)
- Approval visibility rules verified (table: role × endpoint → visible/hidden)
- FK validation cases tested (list which FKs were tested)
- Embedding spy approach used
- SeedRecording helper signature
- Uncovered scenarios and reason
- Estimated RecordingController + RecordingGuestController coverage delta
- Deferred edge cases (media upload, streaming — belongs to MediaController tests)

Keep concise — no fluff.