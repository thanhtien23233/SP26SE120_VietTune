You are implementing unit tests for the Notification Flow in VietTuneArchive.Tests.
The backend is .NET 8 / ASP.NET Core. Test project is already scaffolded.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.Application/Services/NotificationService.cs
- VietTuneArchive.Application/IServices/INotificationService.cs
- VietTuneArchive.Application/DTOs/Notification/ (all files)
- VietTuneArchive.Domain/Entities/Notification.cs
- VietTuneArchive.Domain/Enums/ (NotificationType, NotificationStatus, or equivalent)
- VietTuneArchive.Application/IRepositories/INotificationRepository.cs
- VietTuneArchive.Hubs/ or VietTuneArchive.API/Hubs/ (SignalR hub if exists)

Understand notification creation, delivery channels (SignalR, Email),
read/unread state, and event-type mapping before writing anything.

## TARGET FILE
VietTuneArchive.Tests/Unit/Services/NotificationServiceTests.cs

## TEST CASES TO IMPLEMENT

### Creation & Persistence
- SendNotification: valid payload → Notification entity persisted with correct fields
  (recipientId, type, message, createdAt, isRead = false)
- SendNotification: null recipientId → validation error
- SendNotification: null/empty message → validation error
- SendNotification: invalid NotificationType → rejected
- Bulk notify (if exists): multiple recipients → one record per recipient persisted

### Delivery Channels
- SendNotification → ISignalRService (or IHubContext) called with correct
  userId and payload
- If user is offline (SignalR not connected) → notification still persisted in DB
- If email notification enabled for type → IEmailService called once
- If email notification disabled for type → IEmailService NOT called
- Email and SignalR both triggered for high-priority notification types (if rule exists)

### Duplicate Prevention
- Same event triggers SendNotification twice in quick succession →
  second call is ignored or deduplicated (if idempotency key exists)
- If no deduplication rule exists, assert two records are created (document behavior)

### Read / Unread State
- MarkAsRead: existing notificationId + correct userId → isRead set to true
- MarkAsRead: notificationId belonging to different user → forbidden error
- MarkAsRead: non-existent notificationId → not found error
- MarkAllAsRead(userId): all unread notifications for user → all set to true
- GetUnreadCount(userId): returns correct integer count

### Retrieval & Pagination
- GetNotifications(userId): returns only notifications for that user
- GetNotifications: ordered by createdAt descending
- GetNotifications: pagination returns correct slice
- GetNotifications with filter isRead=false → only unread returned
- User with 0 notifications → returns empty list, not error

### Event-Type Mapping (assert correct type per flow)
- Submission confirmed → NotificationType.SubmissionReceived sent to Expert
- Submission approved → NotificationType.SubmissionApproved sent to Contributor
- Submission rejected → NotificationType.SubmissionRejected sent to Contributor
- Edit requested → NotificationType.EditRequested sent to Contributor
- Review assigned → NotificationType.ReviewAssigned sent to Expert
- Map any additional types found in the codebase

### Edge Cases
- SendNotification to non-existent userId → not found or silent fail per rule
- SignalR hub throws exception → notification still saved in DB (resilience)
- Email service throws exception → notification still saved in DB (resilience)

## IMPLEMENTATION RULES

1. Use xUnit + Moq + FluentAssertions only
2. Mock all dependencies:
   - INotificationRepository
   - IHubContext<NotificationHub> or ISignalRService (whichever is used)
   - IEmailService
   - IUserRepository (for recipient validation)
3. Arrange / Act / Assert with comments in each test
4. Naming: MethodName_Scenario_ExpectedResult
   Example: SendNotification_WithNullRecipient_ReturnsValidationError
            MarkAsRead_ByDifferentUser_ThrowsForbidden
            SendNotification_WhenSignalRThrows_StillPersistsToDb
5. Group by nested classes:
   - CreationAndPersistence
   - DeliveryChannels
   - DuplicatePrevention
   - ReadUnreadState
   - RetrievalAndPagination
   - EventTypeMapping
   - EdgeCases
6. Create a shared NotificationBuilder helper for test entity setup
7. For SignalR mocking: mock IHubContext<T> and verify
   Clients.User(userId).SendAsync(...) was called with correct args
8. If Result<T> pattern used, assert IsSuccess/IsFailure and payload

## AFTER ALL TESTS PASS

Run `dotnet test --filter "NotificationServiceTests"` — all must be green.
Fix any errors before proceeding.

Then create the file:
VietTuneArchive.Tests/Report/NOTIFICATION_TEST_REPORT.md

Report must include:
- Date generated
- Total test count
- All test method names grouped by category
- Assumptions made (channel rules, dedup logic, email toggle behavior)
- SignalR mocking approach used (document for team reference)
- Uncovered methods and reason
- Suggested follow-up tests (e.g., integration test with real SignalR hub)

Keep the report concise — no fluff.