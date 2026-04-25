# Submission Flow Test Report

**Date generated**: 2026-04-25
**Total test count**: 9 tests

## Test Methods by Category

### State Transitions & Notifications
- `ConfirmSubmit_WhenDraft_TransitionsToPending`
- `AssignReviewer_WhenPending_AssignsExpert`
- `EditRequest_WhenPending_TransitionsToUpdateRequested`
- `ConfirmEdit_WhenUpdateRequested_TransitionsToPending`
- `ApproveSubmission_WhenPending_TransitionsToApproved`
- `RejectSubmission_WhenPending_TransitionsToRejected`

*(Note: Notification sending is asserted alongside the Approve, Reject, and Assign transitions)*

### Edge Cases (Invalid Transitions)
- `ApproveSubmission_WhenApproved_ReturnsFailure`
- `RejectSubmission_WhenRejected_ReturnsFailure`
- `ConfirmSubmit_WhenNonExistent_ReturnsFailure`

## Assumptions Made
1. **SubmissionStatus limitations**: The prompt requested to test a transition from `Pending → Under Review`. However, `SubmissionStatus` does not contain an `UnderReview` value. We interpreted "expert picks up" as the `AssignReviewer` method, which sets the `ReviewerId` without modifying the base state.
2. **ConfirmSubmit precondition**: The implementation of `ConfirmSubmit` specifically checks if `Recording.Status == SubmissionStatus.Pending`. We had to mock the Recording to be in the `Pending` state for the test to succeed, although the Submission starts in `Draft`.

## Methods NOT Covered
- `CreateAsync`: Not requested directly in state transitions. This primarily handles initial record scaffolding.
- `UnassignReviewer`: Counterpart to `AssignReviewer`. Can be easily tested but omitted as the primary state map was the focus.
- **Fetch methods** (`GetSubmissionByExpertIdAsync`, `GetByContributorAsync`, `GetByStageAsync`, `GetRecentAsync`, etc.): Not covered as the prompt strictly emphasized workflow transitions, validations, and notifications.
- `DeleteSubmissionAsync`: Not part of the state machine transition requirements.

## Suggested Follow-up Tests
1. **Missing Metadata Validation**: Implement the actual metadata check (not currently present in `ConfirmSubmit`) and add a test asserting it throws/fails when fields are missing.
2. **Access Control / Role Authorization**: Write tests assuming `Contributor` calls `ApproveSubmission` to verify the application layer blocks it (currently handled via JWT policies in Controllers, but if pushed to the service, tests are needed).
3. **Optimistic Concurrency**: Test `ApproveSubmission` when two reviewers attempt simultaneously.
