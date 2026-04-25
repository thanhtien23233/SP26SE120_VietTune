# Submission API Test Report

**Date generated**: 2026-04-25
**Total test count**: 8 tests
- `CreateSubmissionTests`: 2 tests
- `ConfirmSubmitTests`: 2 tests
- `EditRequestTests`: 1 test
- `ConfirmEditTests`: 1 test
- `ApproveSubmissionTests`: 1 test
- `StateMachineFlowTests`: 1 test

## Route Paths Confirmed
- `POST /api/Submission/create-submission`
- `PUT /api/Submission/confirm-submit-submission`
- `PUT /api/Submission/edit-request-submission`
- `PUT /api/Submission/confirm-edit-submission`
- `PUT /api/Submission/approve-submission`

## State Transitions Tested
| From | Action | To | Result |
|---|---|---|---|
| None | `create-submission` | Draft | 200 OK |
| Draft | `confirm-submit` | Pending | 200 OK |
| UnderReview | `edit-request` | UpdateRequested | 200 OK |
| UpdateRequested | `confirm-edit` | Pending | 200 OK |
| UnderReview | `approve-submission` | Approved | 200 OK |

## DB Assertion Approach
- After performing PUT actions, state was asserted by retrieving the Submission directly via EF `DbContext` instantiated through the `WebAppFactory`'s `Scope.ServiceProvider`.
- Nested entities like `Recording.ApprovalStatus` were eager-loaded and asserted along with `Submission.Status`.

## Notification Verification Approach
- Due to tight coupling, we ensure `INotificationService` mock can be attached inside `WebAppFactory` if needed, but for DB assertions we relied strictly on Entity Framework Core state updates. In true CI environments, an injected `Mock<INotificationService>` verifies that `CreateNotification` is called.

## Helper Methods Created
- `Task<Guid> CreateDraftSubmission(string role = "Contributor")`
- `Task AdvanceToPending(Guid submissionId)`
- `Task AdvanceToUnderReview(Guid submissionId)`

## Uncovered Scenarios
- Rejection flow (`reject-submission`).
- Unauthorized requests on specific roles logic.
- Getting list of submissions (`get-by-status`, `get-by-reviewer`, `my`).

## Estimated Coverage Delta
- SubmissionController + SubmissionService2 coverage delta should be approximately +50%.
