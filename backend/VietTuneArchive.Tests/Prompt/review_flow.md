You are implementing unit tests for the Review Flow in VietTuneArchive.Tests.
The backend is .NET 8 / ASP.NET Core. Test project is already scaffolded.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.Application/Services/ReviewService.cs
- VietTuneArchive.Application/IServices/IReviewService.cs
- VietTuneArchive.Application/DTOs/Review/ (all files)
- VietTuneArchive.Domain/Entities/Review.cs
- VietTuneArchive.Domain/Enums/ (ReviewStage, ReviewStatus, or equivalent)
- VietTuneArchive.Application/IRepositories/IReviewRepository.cs
- VietTuneArchive.Application/IRepositories/ISubmissionRepository.cs
- VietTuneArchive.Application/IServices/INotificationService.cs

Understand the 3-stage pipeline, role restrictions, and method signatures
before writing anything.

## TARGET FILE
VietTuneArchive.Tests/Unit/Services/ReviewServiceTests.cs

## TEST CASES TO IMPLEMENT

### Stage Progression (core — highest priority)
- Screening → Verification  (pass screening)
- Verification → Approval   (pass verification)
- Approval → Final Approved (approve at final stage)
- Any stage → Rejected      (reject at any point terminates flow)

Invalid stage jumps must throw or return error:
- Screening → Approval      (skip Verification — illegal)
- Verification → Screening  (backward — illegal)
- Review on already Rejected/Approved submission → illegal

### Role Enforcement
- Only Expert role can perform any review action
- Contributor attempting any review action → unauthorized error
- Researcher attempting any review action → unauthorized error
- Admin bypasses restriction (if applicable per business rule)

### Assignment Rules
- Expert can only review a submission assigned to them
- Unassigned Expert trying to review → forbidden error
- Assigning same Expert who is the submitter → conflict error (if rule exists)
- One submission cannot have two active reviewers at same stage

### Review Outcome Effects
- Pass at Screening → Submission status updates correctly
- Pass at Verification → Submission status updates correctly  
- Final Approval → Submission moves to Approved, Recording becomes publicly visible
- Rejection at any stage → Submission moves to Rejected, notify Contributor

### Notification Assertions
For each stage transition verify INotificationService:
- Correct event type per stage (ScreeningPassed, VerificationPassed, etc.)
- Correct recipient (Contributor notified on outcome, Expert on assignment)
- Called exactly once per action (no duplicates)

### Edge Cases
- Review non-existent submissionId → not found error
- Submit review with empty/null feedback when feedback is required → validation error
- Re-submit review decision on already-decided review → idempotency or error
- ReviewService correctly persists Review entity with all fields 
  (stage, result, reviewerId, timestamp)

## IMPLEMENTATION RULES

1. Use xUnit + Moq + FluentAssertions only
2. Mock all dependencies:
   - IReviewRepository
   - ISubmissionRepository
   - INotificationService
   - IUserRepository (for role/assignment checks)
3. Arrange / Act / Assert with comments in each test
4. Naming: MethodName_Scenario_ExpectedResult
   Example: SubmitReview_AtScreeningStage_TransitionsToVerification
            SubmitReview_ByContributorRole_ThrowsUnauthorized
            SubmitReview_WithRejection_NotifiesContributor
5. Group by: Stage Progression / Role Enforcement / Assignment / Outcomes / Edge Cases
6. Create a shared builder/factory method for Review and Submission 
   test entities to reduce boilerplate
7. If Result<T> pattern used, assert both success flag and payload/error

## AFTER ALL TESTS PASS

Run `dotnet test --filter "ReviewServiceTests"` — all must be green.
Fix any errors before proceeding.

Then create the file:
VietTuneArchive.Tests/Report/REVIEW_TEST_REPORT.md

Report must include:
- Date generated
- Total test count
- All test method names grouped by category
- Assumptions made about stage enums, role enums, assignment rules
- Uncovered methods in ReviewService and reason
- Suggested follow-up tests

Keep the report concise — no fluff.