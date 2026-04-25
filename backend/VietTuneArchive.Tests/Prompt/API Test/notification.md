You are implementing API integration tests for the Notification flow in VietTuneArchive.Tests.
Infrastructure (WebAppFactory, JwtTokenHelper, ApiTestBase, DatabaseFixture) is
already set up. Do NOT modify any fixture files unless absolutely required.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.API/Controllers/NotificationController.cs      ← routes, auth roles
- VietTuneArchive.Application/Services/NotificationService.cs    ← business rules
- VietTuneArchive.Application/DTOs/Notification/ (all files)     ← request/response shape
- VietTuneArchive.Domain/Entities/Notification.cs
- VietTuneArchive.Domain/Enums/ (NotificationType, or equivalent)
- VietTuneArchive.Application/IRepositories/INotificationRepository.cs
- VietTuneArchive.Tests/Integration/Fixtures/                    ← all fixture files
- VietTuneArchive.Tests/Integration/Fixtures/DatabaseFixture.cs

Confirm exact route paths, DTO field names, ownership rules,
and read/unread state logic before writing any test.

## TARGET FILE
VietTuneArchive.Tests/Integration/Controllers/NotificationControllerTests.cs

## BASE CLASS
Inherit ApiTestBase. Use JwtTokenHelper for role tokens.
Notifications are seeded directly via DbContext in test setup
(do not rely on other flows to generate them).

---

## TEST CASES

### GET /api/Notification [Authorize]
- [Contributor] → 200, returns only own notifications
- [Expert] → 200, own only
- [Admin] → 200, own only (admin sees own, not all users')
- Unauthenticated → 401
- UserA notifications NOT visible to UserB
- Pagination: page=1&size=3 → max 3 results
- Pagination: page=2 → next slice
- Order: newest notification first (createdAt desc)
- Filter isRead=false → only unread returned
- Filter isRead=true → only read returned
- No notifications for user → 200 empty list
- Response per notification contains:
    id, type, message, isRead, createdAt, relatedEntityId (if exists)

### GET /api/Notification/unread-count [Authorize]
- User with 3 unread, 2 read → returns 3
- User with 0 notifications → returns 0
- User with all read → returns 0
- [Expert] → 200
- [Contributor] → 200
- Unauthenticated → 401
- UserA unread count unaffected by UserB notifications
- After marking one as read → count decreases by 1

### PUT /api/Notification/{id}/read [Authorize]
- Own notification, isRead=false [Contributor] → 200, isRead=true in DB
- Own notification, already isRead=true → 200 idempotent
- Another user's notificationId → 403
- Non-existent notificationId → 404
- Unauthenticated → 401
- After mark read → GET unread-count decreases by 1
- After mark read → GET /Notification filter isRead=false excludes this one
- Response contains updated notification with isRead=true

### PUT /api/Notification/read-all [Authorize]
- User with 5 unread → 200, all 5 set to isRead=true in DB
- User with 0 notifications → 200, no-op
- User with mix read/unread → only unread updated
- [Expert] → 200
- [Contributor] → 200
- Unauthenticated → 401
- UserA read-all → does NOT affect UserB notifications
- After read-all → GET unread-count = 0
- After read-all → GET /Notification filter isRead=false → empty list

### DELETE /api/Notification/{id} [Authorize]
- Own notification [Contributor] → 204, removed from DB
- Another user's notificationId → 403
- Non-existent notificationId → 404
- Unauthenticated → 401
- After delete → GET /Notification no longer contains that id
- After delete → unread-count updated if deleted was unread

---

### Notification Seeding via Other Flows
Test that notifications are auto-created by business events:
- Submission approved → notification in DB for Contributor
  (trigger via PUT /api/Submission/approve-submission, then
   GET /api/Notification as Contributor → includes approval notification)
- Edit requested → notification in DB for Contributor
  (trigger via PUT /api/Submission/edit-request-submission, then verify)
- Review assigned → notification in DB for Expert
  (trigger via POST /api/Admin/submissions/{id}/assign, then verify)

For each: assert notification.Type matches expected enum value

### Isolation Between Users
- Seed 3 notifications for UserA, 2 for UserB
- GET /Notification as UserA → exactly 3 returned
- GET /Notification as UserB → exactly 2 returned
- GET unread-count as UserA → correct count for A only
- PUT read-all as UserA → UserB notifications unchanged in DB

### Pagination & Ordering
- Seed 10 notifications for one user (different createdAt)
- GET page=1&size=5 → 5 most recent returned
- GET page=2&size=5 → next 5 returned
- GET page=3&size=5 → empty list (only 10 total)
- All 10 notifications across pages are distinct (no duplicates)
- Order within each page: newest first

---

## IMPLEMENTATION RULES

1. Inherit ApiTestBase — use GetAsync, PutAsync<T>, DeleteAsync helpers
2. Seed notifications directly via DbContext (not via business flows)
   for isolation — except in "Notification Seeding via Other Flows" tests
   which intentionally trigger real flows
3. Seed helper within test class:
   - SeedNotification(Guid userId, bool isRead = false, string type = "General")
     → inserts Notification via DbContext, returns notificationId
   - SeedNotifications(Guid userId, int count, bool isRead = false)
     → bulk seed, returns list of ids
4. Each test fully independent:
   - Register fresh users per test or use seeded fixture users carefully
   - Clear/scope notifications per test via seeding fresh ones
   - Never share notification state between tests
5. For DB state assertions:
   - Resolve AppDbContext from WebAppFactory.Services scope
   - Assert Notification.IsRead, Notification presence/absence after mutations
6. Naming: Endpoint_Scenario_ExpectedResult
   Example: GetNotifications_ByUserA_DoesNotReturnUserBNotifications
            GetUnreadCount_After3UnreadSeeded_Returns3
            MarkAsRead_AnotherUsersNotification_Returns403
            MarkAllAsRead_With5Unread_SetsAllToReadInDb
            DeleteNotification_OwnNotification_Returns204AndRemovedFromDb
            SubmissionApproved_GeneratesNotificationForContributor
7. Group by nested classes:
   - GetNotificationsTests
   - GetUnreadCountTests
   - MarkAsReadTests
   - MarkAllAsReadTests
   - DeleteNotificationTests
   - BusinessEventNotificationTests
   - UserIsolationTests
   - PaginationTests
8. Assert response body shape:
   var body = await response.Content
       .ReadFromJsonAsync<List<NotificationDto>>();
   body.Should().OnlyContain(n => n.RecipientId == userId);
   body.Should().BeInDescendingOrder(n => n.CreatedAt);
9. For unread count: deserialize as int or wrapper DTO per impl:
   var count = await response.Content.ReadFromJsonAsync<int>();
   count.Should().Be(3);
10. For business event tests: chain API calls across controllers
    (Submission → approve → then check Notification endpoint)
    Use existing submission/review helpers if available

## VERIFICATION
Run: dotnet test --filter "NotificationControllerTests"
All tests must be green. Fix errors before proceeding.

Check coverage delta:
- NotificationController → ≥ 80% line coverage
- NotificationService read/unread + delivery branches covered

## REPORT
Create: VietTuneArchive.Tests/Report/NOTIFICATION_API_TEST_REPORT.md

Include:
- Date generated
- Total tests written, pass/fail count
- All test method names grouped by category
- Route paths confirmed (list all 5 endpoints)
- Role permission matrix:
  (Role × Endpoint → Allowed/Forbidden)
- User isolation verified (table: UserA action → UserB data affected?)
- Business event → notification type mapping verified (list events tested)
- Seed helper signatures used
- Pagination behavior observed (page size, ordering, empty page)
- Unread count consistency checks (before/after mark read/delete)
- Uncovered scenarios and reason
- Estimated NotificationController + NotificationService coverage delta
- Deferred cases:
    (SignalR real-time delivery test, push notification channel,
     notification preferences/opt-out, batch delete)

Keep concise — no fluff.