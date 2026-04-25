You are implementing unit tests for the Submission Flow in VietTuneArchive.Tests.
The backend is .NET 8 / ASP.NET Core. Test project is already scaffolded.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.Application/Services/SubmissionService2.cs
- VietTuneArchive.Application/IServices/ISubmissionService2.cs (or similar)
- VietTuneArchive.Application/DTOs/Submission/ (all files)
- VietTuneArchive.Domain/Entities/Submission.cs
- VietTuneArchive.Domain/Enums/SubmissionStatus.cs (or equivalent)
- VietTuneArchive.Application/IRepositories/ISubmissionRepository.cs
- VietTuneArchive.Application/IServices/INotificationService.cs

Understand ALL state transitions, business rules, and method signatures
before writing anything.

## TARGET FILE
VietTuneArchive.Tests/Unit/Services/SubmissionServiceTests.cs

## TEST CASES TO IMPLEMENT

### State Transitions (core — highest priority)
Map every valid transition and assert status change:
- Draft → Pending          (contributor confirms submit)
- Pending → Under Review   (expert picks up)
- Under Review → UpdateRequested  (expert requests edits)
- UpdateRequested → Pending       (contributor resubmits)
- Under Review → Approved         (expert approves)
- Under Review → Rejected         (expert rejects)

Invalid transitions must throw or return error:
- Approved → Pending   (illegal)
- Rejected → Approved  (illegal)
- Draft → Approved     (skip steps — illegal)
- Any transition by wrong role (e.g., Contributor trying to Approve)

### Business Rules
- Cannot submit (Draft → Pending) if required metadata fields are missing
- Only the owning Contributor can resubmit after UpdateRequested
- Only Expert role can trigger Approve / Reject / RequestEdit
- Each state change must trigger the correct notification type
- Submission must reference a valid RecordingId (mock repo returns exists/not-exists)

### Notification Assertions
For each valid transition, verify INotificationService is called:
- With the correct notification type/event
- With the correct recipientId (contributor vs expert depending on direction)
- Called exactly once per transition (no duplicates)

### Edge Cases
- Submitting a non-existent submissionId → not found error
- Concurrent approval attempt (optimistic lock or idempotency check if exists)
- Resubmit on a Rejected submission → illegal

## IMPLEMENTATION RULES

1. Use xUnit + Moq + FluentAssertions only
2. Mock all dependencies:
   - ISubmissionRepository
   - INotificationService
   - IRecordingRepository (to validate RecordingId exists)
   - Any IUserRepository used for role checks
3. Arrange / Act / Assert structure with comments in each test
4. Naming: MethodName_Scenario_ExpectedResult
   Example: ConfirmSubmit_WhenDraft_TransitionsToPending
            Approve_ByContributorRole_ThrowsUnauthorized
5. Group tests by transition or method using nested classes
6. If service uses Result<T> pattern, assert IsSuccess/IsFailure and error message
7. Use a helper method or builder to create a default Submission entity
   in a given status to reduce boilerplate across tests

## AFTER ALL TESTS PASS

Run `dotnet test --filter "SubmissionServiceTests"` — all must be green.
Fix any errors before proceeding.

Then create the file:
VietTuneArchive.Tests/Report/SUBMISSION_TEST_REPORT.md

The report must include:
- Date generated
- Total test count
- List of all test method names grouped by category (State Transitions / 
  Business Rules / Notifications / Edge Cases)
- Any assumptions made (e.g., "Assumed SubmissionStatus is an enum with these values")
- Any methods in SubmissionService2 that were NOT covered and why
- Suggested follow-up tests if applicable

Keep the report concise — no fluff.