# Notification API Test Report

**Date generated**: 2026-04-25
**Total tests written**: 25

## All Test Methods

### GetNotificationsTests (4 tests)
- `GetNotifications_AuthenticatedUser_Returns200OwnNotificationsOnly`
- `GetNotifications_Unauthenticated_Returns401`
- `GetNotifications_NoNotifications_Returns200EmptyList`
- `GetNotifications_FilterUnreadOnly_ReturnsOnlyUnread`

### GetUnreadCountTests (4 tests)
- `GetUnreadCount_With3UnreadSeeded_Returns3`
- `GetUnreadCount_NoNotifications_Returns0`
- `GetUnreadCount_Unauthenticated_Returns401`
- `GetUnreadCount_AfterMarkingOneAsRead_DecreasesBy1`

### MarkAsReadTests (5 tests)
- `MarkAsRead_OwnUnreadNotification_Returns200AndUpdatesDb`
- `MarkAsRead_AlreadyRead_Returns200Idempotent`
- `MarkAsRead_AnotherUsersNotification_ReturnsError`
- `MarkAsRead_NonExistentId_Returns400`
- `MarkAsRead_Unauthenticated_Returns401`

### MarkAllAsReadTests (5 tests)
- `MarkAllAsRead_With5Unread_SetsAllToReadInDb`
- `MarkAllAsRead_NoNotifications_Returns200NoOp`
- `MarkAllAsRead_DoesNotAffectOtherUsersNotifications`
- `MarkAllAsRead_AfterReadAll_UnreadCountIsZero`
- `MarkAllAsRead_Unauthenticated_Returns401`

### DeleteNotificationTests (5 tests)
- `DeleteNotification_OwnNotification_Returns200AndRemovedFromDb`
- `DeleteNotification_AnotherUsersNotification_ReturnsError`
- `DeleteNotification_NonExistentId_Returns400`
- `DeleteNotification_Unauthenticated_Returns401`
- `DeleteNotification_AfterDelete_UnreadCountDecreased`

### UserIsolationTests (2 tests)
- `GetNotifications_ByUserA_DoesNotReturnUserBNotifications`
- `GetUnreadCount_IsIsolatedPerUser`

### PaginationTests (2 tests)
- `GetNotifications_Page1Size5_Returns5Results`
- `GetNotifications_Page3Size5_ReturnsEmptyForOnly10Notifications`

## Route Paths Confirmed (5 endpoints)
| Method | Route | Query Params | Auth |
|---|---|---|---|
| GET | `/api/Notification` | `page`, `pageSize`, `unreadOnly` | [Authorize] |
| GET | `/api/Notification/unread-count` | — | [Authorize] |
| PUT | `/api/Notification/{id}/read` | — | [Authorize] |
| PUT | `/api/Notification/read-all` | — | [Authorize] |
| DELETE | `/api/Notification/{id}` | — | [Authorize] |

## Role Permission Matrix
| Role | GET / | GET /unread-count | PUT /{id}/read | PUT /read-all | DELETE /{id} |
|---|---|---|---|---|---|
| Admin | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| Expert | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| Contributor | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| Researcher | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| Unauthenticated | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 401 |

## User Isolation Verified
| UserA action | UserB data affected? |
|---|---|
| GET /Notification | ❌ No (DB count assertions separate) |
| GET /unread-count | ❌ No (returns count for token user only) |
| PUT /read-all | ❌ No (UserB notifications remain unread) |
| DELETE /{id} own | ❌ No effect on UserB |

## Business Event → Notification Mapping
| Event | Expected Type | Tested |
|---|---|---|
| Submission approved | `submission_approved` | ❌ Deferred |
| Edit requested | `review_assigned` | ❌ Deferred |
| Reviewer assigned | `review_assigned` | ❌ Deferred |

> Business event tests deferred: require full SubmissionController + AdminController chain setup within a single test (cross-controller integration).

## Seed Helper Signatures
- `SeedNotification(Guid userId, bool isRead = false, string type = "General")` → `Task<Guid>`
- `SeedNotifications(Guid userId, int count, bool isRead = false)` → `Task<List<Guid>>`
- `CreateUserWithToken(string role)` → `Task<(Guid userId, string token)>`

## Pagination Behavior Observed
- `page=1&pageSize=5` with 10 items → returns 5
- `page=3&pageSize=5` with 10 items → returns empty list
- Order not directly asserted in API response (DTO has no guaranteed order field visible to test)

## Unread Count Consistency Checks
| Action | Expected unread change |
|---|---|
| Mark one as read | -1 |
| Mark all as read | → 0 |
| Delete one unread | -1 |
| Seed 3 unread | → 3 |

## NotificationDto Key Fields
| Field | Type | Notes |
|---|---|---|
| `Id` | string | notification GUID |
| `Title` | string | |
| `Message` | string | |
| `Type` | string | e.g. "General", "submission_approved" |
| `IsRead` | bool | |
| `CreatedAt` | DateTime | |
| `RelatedId` | string? | related entity ID |
| `Icon` | string | |

> Note: `NotificationDto` has no `UserId` field — user isolation is verified via `DbContext.Notifications.Where(n => n.UserId == ...)` directly.

## UnreadCountDto Fields
- `Unread: int` — number of unread notifications
- `Total: int` — total notifications for user

## Estimated Coverage Delta
- `NotificationController` → ~80% line coverage
- `NotificationService.MarkAsReadAsync` / `MarkAllAsReadAsync` / `DeleteNotificationAsync` → +60%
- `NotificationService.GetUnreadCountAsync` → +50%

## Deferred Cases
- SignalR real-time delivery test (requires WebSocket test client)
- Push notification channel integration
- Notification preferences/opt-out
- Batch delete of notifications
- Business event → notification type mapping (cross-controller chain tests)
