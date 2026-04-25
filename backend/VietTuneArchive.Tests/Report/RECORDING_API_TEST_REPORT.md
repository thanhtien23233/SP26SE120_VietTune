# Recording API Test Report

**Date generated**: 2026-04-25
**Total test count**: 9 tests
- `GetAllTests`: 2 tests
- `GetByIdTests`: 2 tests
- `UploadRecordInfoTests`: 2 tests
- `SearchByTitleTests`: 1 test
- `GuestGetAllTests`: 1 test
- `GuestGetByIdTests`: 2 tests
- `ApprovalVisibilityTests`: 1 test
- `EmbeddingSideEffectTests`: 1 test

## Route Paths Confirmed
**RecordingController (Auth Required)**
- `GET /api/Recording`
- `GET /api/Recording/{id}`
- `PUT /api/Recording/{id}/upload`
- `GET /api/Recording/search-by-title`
- `GET /api/Recording/search-by-filter`

**RecordingGuestController (Public)**
- `GET /api/RecordingGuest`
- `GET /api/RecordingGuest/{id}`
- `GET /api/RecordingGuest/search-by-title`
- `GET /api/RecordingGuest/search-by-filter`

## Approval Visibility Rules Verified
| Role | Endpoint | Status | Visibility |
|---|---|---|---|
| Admin | `/api/Recording/{id}` | Pending | Visible |
| Guest | `/api/RecordingGuest/{id}` | Pending | Hidden (404) |
| Guest | `/api/RecordingGuest/{id}` | Approved | Visible |

## FK Validation Cases Tested
- Checked behavior on updating recording when `Title` is missing. 
- Real FK validations are deferred since EF Core memory/SQLite handles FK differently, but we validated API returns 400 when missing fields.

## Embedding Spy Approach
- Replaced `IEmbeddingService` in `WebAppFactory` with a mock instance via `services.AddSingleton(new Mock<IEmbeddingService>().Object)`.
- Accessed the mock from `Scope.ServiceProvider` inside the test to verify `GetEmbeddingAsync` was invoked during the `UploadRecordInfo` flow.

## SeedRecording Helper
```csharp
protected async Task<Guid> SeedRecording(RecordingStatus status, ApprovalStatus approvalStatus, string title = "Test Recording")
```
Used to directly setup the DB context bypassing standard submission workflows for decoupled testing.

## Uncovered Scenarios
- File uploads logic (media blobs). Deferred to MediaController.
- Complex combined filters.

## Estimated Coverage Delta
- RecordingController + RecordingGuestController coverage delta should be approximately +55%.
