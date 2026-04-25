You are implementing unit tests for the Knowledge Base Flow in VietTuneArchive.Tests.
The backend is .NET 8 / ASP.NET Core. Test project is already scaffolded.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.Application/Services/KBEntryService.cs
- VietTuneArchive.Application/Services/KBRevisionService.cs
- VietTuneArchive.Application/IServices/IKBEntryService.cs
- VietTuneArchive.Application/IServices/IKBRevisionService.cs
- VietTuneArchive.Application/DTOs/KnowledgeBase/ (all files)
- VietTuneArchive.Domain/Entities/KBEntry.cs
- VietTuneArchive.Domain/Entities/KBRevision.cs
- VietTuneArchive.Domain/Entities/KBCitation.cs
- VietTuneArchive.Domain/Enums/ (KBStatus, RevisionStatus, or equivalent)
- VietTuneArchive.Application/IRepositories/IKBEntryRepository.cs
- VietTuneArchive.Application/IRepositories/IKBRevisionRepository.cs

Understand entry lifecycle, revision history tracking, citation linking,
and role-based edit permissions before writing anything.

## TARGET FILES
- VietTuneArchive.Tests/Unit/Services/KBEntryServiceTests.cs
- VietTuneArchive.Tests/Unit/Services/KBRevisionServiceTests.cs

---

## KBEntryServiceTests

### CRUD & Validation
- CreateEntry: valid input → entry persisted with correct fields
- CreateEntry: missing required fields (title, content, ethnicGroup) → validation error
- CreateEntry: duplicate title within same domain/category → rejected (if rule exists)
- GetById: existing id → returns correct DTO
- GetById: non-existent id → not found error
- UpdateEntry: valid input → fields updated, updatedAt refreshed
- UpdateEntry: non-existent entry → not found error
- DeleteEntry: existing entry → soft delete or hard delete per implementation
- DeleteEntry: entry with active citations → blocked or cascaded per rule

### Role Enforcement
- Contributor cannot create/edit/delete KB entries → unauthorized
- Researcher can read but not modify (if rule exists)
- Expert can create and edit entries
- Admin can delete entries

### Status Lifecycle (if KBEntry has status)
- Draft → Published (expert publishes)
- Published → Archived (admin archives)
- Invalid transition → error

### Search & Filter
- Search by title keyword → returns matching entries
- Filter by ethnicGroup / category → correct subset returned
- Empty result set → returns empty list, not error
- Pagination: page 1 of N returns correct slice

---

## KBRevisionServiceTests

### Revision Creation
- Edit published entry → new KBRevision created, old content preserved
- Revision captures: editorId, timestamp, previous content, new content
- Multiple revisions on same entry → all persisted, none overwritten
- Creating revision on non-existent entry → not found error

### Version History
- GetRevisionHistory(entryId) → returns all revisions ordered by date desc
- GetRevisionById → returns exact revision snapshot
- Latest revision content matches current entry content

### Rollback
- Rollback to a previous revision → entry content restored to that snapshot
- Rollback creates a new revision record (audit trail preserved)
- Rollback to non-existent revisionId → not found error
- Rollback by unauthorized role → forbidden error

### Citation Linking (KBCitation)
- Add citation to entry → citation persisted with correct entryId + source
- Citation can link to: Recording (internal) or external URL
- Add citation with invalid recordingId → not found error
- Remove citation → citation deleted, entry unaffected
- GetCitationsByEntry → returns all citations for that entry

### Edge Cases
- Revision diff is empty (no actual change) → rejected or flagged
- Concurrent edits on same entry (optimistic concurrency if implemented)
- Entry with 0 revisions → revision history returns empty list, not error

---

## IMPLEMENTATION RULES

1. Use xUnit + Moq + FluentAssertions only
2. Mock all dependencies:
   - IKBEntryRepository
   - IKBRevisionRepository
   - IKBCitationRepository (if separate)
   - IUserRepository (for role checks)
   - IRecordingRepository (for citation FK validation)
3. Arrange / Act / Assert with comments in each test
4. Naming: MethodName_Scenario_ExpectedResult
   Example: CreateEntry_WithMissingTitle_ReturnsValidationError
            GetRevisionHistory_ForEntryWithMultipleRevisions_ReturnsOrderedDesc
            Rollback_ByContributorRole_ThrowsUnauthorized
5. Group by feature area using nested classes:
   - KBEntryServiceTests: Crud / RoleEnforcement / StatusLifecycle / Search
   - KBRevisionServiceTests: RevisionCreation / VersionHistory / Rollback / Citations
6. Share a TestDataBuilder for KBEntry, KBRevision, KBCitation entities
   to reduce boilerplate across both test files
7. If Result<T> pattern used, assert IsSuccess/IsFailure and message

---

## AFTER ALL TESTS PASS

Run `dotnet test --filter "KBEntryServiceTests|KBRevisionServiceTests"`
All must be green. Fix any errors before proceeding.

Then create the file:
VietTuneArchive.Tests/Report/KB_TEST_REPORT.md

Report must include:
- Date generated
- Total test count per file (KBEntry / KBRevision separately)
- All test method names grouped by category
- Assumptions made (status enums, role rules, citation model)
- Uncovered methods and reason
- Suggested follow-up tests (e.g., integration test for full revision chain)

Keep the report concise — no fluff.