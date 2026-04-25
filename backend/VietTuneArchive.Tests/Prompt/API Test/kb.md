You are implementing API integration tests for the Knowledge Base flow in VietTuneArchive.Tests.
Infrastructure (WebAppFactory, JwtTokenHelper, ApiTestBase, DatabaseFixture) is
already set up. Do NOT modify any fixture files unless absolutely required.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.API/Controllers/KBEntriesController.cs        ← routes, auth roles
- VietTuneArchive.Application/Services/KBEntryService.cs        ← business rules
- VietTuneArchive.Application/Services/KBRevisionService.cs     ← revision logic
- VietTuneArchive.Application/DTOs/KnowledgeBase/ (all files)   ← request/response shape
- VietTuneArchive.Domain/Entities/KBEntry.cs
- VietTuneArchive.Domain/Entities/KBRevision.cs
- VietTuneArchive.Domain/Entities/KBCitation.cs
- VietTuneArchive.Domain/Enums/ (KBStatus, or equivalent)
- VietTuneArchive.Tests/Integration/Fixtures/                   ← all fixture files
- VietTuneArchive.Tests/Integration/Fixtures/DatabaseFixture.cs

Confirm exact route paths, DTO field names, role restrictions,
status lifecycle, revision tracking, and citation linking rules
before writing any test.

## TARGET FILE
VietTuneArchive.Tests/Integration/Controllers/KBEntriesControllerTests.cs

## BASE CLASS
Inherit ApiTestBase. Use JwtTokenHelper for role tokens.
Use DatabaseFixture seeded data (recordings for citation FK tests).

---

## TEST CASES

### GET /api/kb-entries [AllowAnonymous]
- Anonymous → 200, returns published entries only
- [Authenticated any role] → 200
- Unpublished/Draft entries NOT visible to anonymous
- Pagination: page/size respected
- Empty published set → 200 empty list
- Response contains: id, title, slug, status, createdAt

### GET /api/kb-entries/by-slug/{slug} [AllowAnonymous]
- Valid slug, published entry → 200, correct entry returned
- Valid slug, draft/unpublished entry → 404 (not visible to anonymous)
- Non-existent slug → 404
- Slug is URL-safe (no special chars cause routing issues)
- Response contains full entry detail

### GET /api/kb-entries/{id} [Authorize]
- Valid id [Expert] → 200, returns entry regardless of status
- Valid id [Admin] → 200
- Valid id [Contributor] → 200 or 403 per visibility rule
- Valid id [Researcher] → 200
- Non-existent id → 404
- Unauthenticated → 401

### POST /api/kb-entries [Authorize(Roles = "Expert,Admin")]
- Valid payload [Expert] → 201, entry created with status = Draft
- Valid payload [Admin] → 201
- [Contributor] → 403
- [Researcher] → 403
- Unauthenticated → 401
- Missing required title → 400
- Missing required content → 400
- Duplicate slug (same title generates same slug) → 409 or 400 per impl
- After create → KBEntry persisted in DB:
    createdBy = requestingUserId, status = Draft, slug generated
- After create → initial KBRevision created automatically (if rule exists)

### PUT /api/kb-entries/{id} [Authorize(Roles = "Expert,Admin")]
- Valid update [Expert] → 200, fields updated in DB
- Valid update [Admin] → 200
- [Contributor] → 403
- [Researcher] → 403
- Unauthenticated → 401
- Non-existent id → 404
- Missing required field → 400
- After update → new KBRevision created in DB (history tracked)
- After update → updatedAt refreshed
- Previous revision content preserved in KBRevisions table

### PATCH /api/kb-entries/{id}/status [Authorize(Roles = "Expert,Admin")]
- Draft → Published [Expert] → 200, status = Published in DB
- Draft → Published [Admin] → 200
- Published → Archived [Admin] → 200
- Published → Archived [Expert] → 200 or 403 per rule
- [Contributor] → 403
- [Researcher] → 403
- Unauthenticated → 401
- Non-existent id → 404
- Invalid status value → 400
- Invalid transition (Archived → Draft) → 400
- After publish → entry visible to anonymous via GET /by-slug/{slug}
- After archive → entry NOT returned in GET /kb-entries anonymous list

### DELETE /api/kb-entries/{id} [Authorize(Roles = "Admin")]
- Valid id [Admin] → 204, entry removed or soft-deleted
- [Expert] → 403
- [Contributor] → 403
- [Researcher] → 403
- Unauthenticated → 401
- Non-existent id → 404
- After delete → GET /{id} returns 404
- After delete → citations cascade deleted or blocked per rule

---

### GET /api/kb-entries/{entryId}/citations [AllowAnonymous]
- Valid entryId with citations → 200, list of citations
- Valid entryId with no citations → 200 empty list
- Non-existent entryId → 404
- Each citation contains: id, sourceType, referenceId or url, createdAt

### POST /api/kb-entries/{entryId}/citations [Authorize(Roles = "Expert,Admin")]
- Valid citation linking to Recording [Expert] → 201, citation created
- Valid citation with external URL [Expert] → 201
- [Admin] → 201
- [Contributor] → 403
- [Researcher] → 403
- Unauthenticated → 401
- Non-existent entryId → 404
- Invalid recordingId (not in DB) → 400 or 404
- Missing both recordingId and url (no source) → 400
- After create → KBCitation persisted with correct entryId, sourceType

### PUT /api/kb-entries/citations/{citationId} [Authorize(Roles = "Expert,Admin")]
- Valid update [Expert] → 200, citation updated
- [Admin] → 200
- [Contributor] → 403
- Non-existent citationId → 404
- Unauthenticated → 401

### DELETE /api/kb-entries/citations/{citationId} [Authorize(Roles = "Expert,Admin")]
- Valid id [Expert] → 204, citation removed
- [Admin] → 204
- [Contributor] → 403
- Non-existent id → 404
- Unauthenticated → 401
- After delete → GET citations for entry no longer contains this citation

---

### GET /api/kb-entries/{entryId}/revisions [Authorize(Roles = "Expert,Admin")]
- Entry with multiple revisions → 200, ordered by date desc
- Entry with no revisions → 200 empty list
- [Contributor] → 403
- [Researcher] → 403
- Unauthenticated → 401
- Non-existent entryId → 404
- Each revision contains: id, editorId, createdAt, previousContent or diff

### GET /api/kb-entries/revisions/{revisionId} [Authorize(Roles = "Expert,Admin")]
- Valid revisionId → 200, full revision snapshot
- Non-existent revisionId → 404
- [Contributor] → 403
- Unauthenticated → 401
- Response contains: full content at that revision point

---

### End-to-End Flow
Chain in sequence within one test:
1. POST /kb-entries [Expert] → 201 Draft
2. PUT /kb-entries/{id} → 200 (edit content)
3. GET /kb-entries/{id}/revisions → 200, 2 revisions (initial + edit)
4. PATCH /kb-entries/{id}/status (Draft → Published) → 200
5. GET /kb-entries/by-slug/{slug} [Anonymous] → 200 (now visible)
6. POST /kb-entries/{id}/citations (link to seeded Recording) → 201
7. GET /kb-entries/{id}/citations [Anonymous] → 200, 1 citation
8. DELETE /kb-entries/{id} [Admin] → 204
9. GET /kb-entries/by-slug/{slug} [Anonymous] → 404

### Visibility Rules Across Status
Assert for same entryId:
- Status = Draft:
    Anonymous GET /by-slug → 404
    Expert GET /{id} → 200
- Status = Published:
    Anonymous GET /by-slug → 200
    GET /kb-entries list anonymous → included
- Status = Archived:
    Anonymous GET /kb-entries list → NOT included
    Expert GET /{id} → 200 (still accessible to authenticated)

---

## IMPLEMENTATION RULES

1. Inherit ApiTestBase — use PostAsync<T>, PutAsync<T>, PatchAsync<T>,
   GetAsync, DeleteAsync helpers
2. Each test fully independent:
   - Create fresh KBEntry per test via POST
   - Use unique title per test (include Guid) to avoid slug collision
   - For citation tests: use seeded Recording from DatabaseFixture
3. For DB state assertions:
   - Resolve AppDbContext from WebAppFactory.Services scope
   - Assert KBEntry.Status, KBEntry.Slug, KBRevision count,
     KBCitation presence directly
4. Naming: Endpoint_Scenario_ExpectedResult
   Example: CreateEntry_ByContributor_Returns403
            PatchStatus_DraftToPublished_MakesEntryVisibleToAnonymous
            AddCitation_WithInvalidRecordingId_Returns404
            GetRevisions_AfterTwoEdits_ReturnsTwoRevisions
            EndToEndFlow_CreateEditPublishCiteDelete_AllStepsSucceed
5. Group by nested classes:
   - GetEntriesTests
   - GetBySlugTests
   - GetByIdTests
   - CreateEntryTests
   - UpdateEntryTests
   - PatchStatusTests
   - DeleteEntryTests
   - CitationTests
   - RevisionTests
   - VisibilityRulesTests
   - EndToEndTests
6. Shared helpers within test class:
   - CreateDraftEntry(string expertToken) → POST, returns (id, slug)
   - PublishEntry(Guid id, string token) → PATCH status to Published
   - AddCitation(Guid entryId, Guid recordingId, string token)
     → POST citation, returns citationId
7. Assert response body shape:
   var body = await response.Content.ReadFromJsonAsync<KBEntryDto>();
   body.Status.Should().Be("Draft");
   body.Slug.Should().NotBeNullOrEmpty();
   body.CreatedBy.Should().Be(expertUserId);
8. For revision count assertion:
   var revisions = dbContext.KBRevisions
       .Where(r => r.EntryId == entryId).ToList();
   revisions.Should().HaveCount(2); // initial + one edit
9. For slug collision test: create two entries with identical title,
   assert second returns 409 or second slug is auto-suffixed

## VERIFICATION
Run: dotnet test --filter "KBEntriesControllerTests"
All tests must be green. Fix errors before proceeding.

Check coverage delta:
- KBEntriesController → ≥ 80% line coverage
- KBEntryService + KBRevisionService gain additional branch coverage

## REPORT
Create: VietTuneArchive.Tests/Report/KB_API_TEST_REPORT.md

Include:
- Date generated
- Total tests written, pass/fail count
- All test method names grouped by category
- Route paths confirmed (list all 13 endpoints)
- Visibility rules verified (table: Status × Audience → Visible/Hidden)
- Role permission matrix:
  (Role × Endpoint → Allowed/Forbidden)
- Revision tracking approach verified (how count asserted)
- Citation FK validation cases tested
- Helper methods created (list signatures)
- Slug generation behavior observed (document pattern)
- Uncovered scenarios and reason
- Estimated KBEntriesController + KBEntryService + KBRevisionService coverage delta
- Deferred cases:
  (rollback revision endpoint if exists, bulk publish, search within KB entries)

Keep concise — no fluff.