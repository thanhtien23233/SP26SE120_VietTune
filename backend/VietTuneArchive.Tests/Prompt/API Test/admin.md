You are implementing API integration tests for the Admin flow in VietTuneArchive.Tests.
Infrastructure (WebAppFactory, JwtTokenHelper, ApiTestBase, DatabaseFixture) is
already set up. Do NOT modify any fixture files unless absolutely required.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.API/Controllers/AdminController.cs            ← routes, auth roles
- VietTuneArchive.Application/Services/ (UserService, AnalyticsService,
  AuditLogService — whichever AdminController depends on)
- VietTuneArchive.Application/DTOs/Admin/ (all files)           ← request/response shape
- VietTuneArchive.Domain/Entities/User.cs
- VietTuneArchive.Domain/Entities/AuditLog.cs
- VietTuneArchive.Domain/Enums/ (UserRole, UserStatus, or equivalent)
- VietTuneArchive.Tests/Integration/Fixtures/                   ← all fixture files
- VietTuneArchive.Tests/Integration/Fixtures/DatabaseFixture.cs ← seeded users

Confirm exact route paths, DTO field names, pagination params,
and Admin-only enforcement before writing any test.

## TARGET FILE
VietTuneArchive.Tests/Integration/Controllers/AdminControllerTests.cs

## BASE CLASS
Inherit ApiTestBase. Use JwtTokenHelper.AdminToken() for all admin actions.
Use seeded users from DatabaseFixture (expert, contributor, researcher).

---

## TEST CASES

### GET /api/Admin/users
- [Admin] → 200, paginated user list returned
- [Expert] → 403
- [Contributor] → 403
- [Researcher] → 403
- Unauthenticated → 401
- Default pagination → first page, reasonable page size
- page=1&size=2 → max 2 users returned
- page=2&size=2 → next 2 users
- Filter by role=Expert → only Experts returned
- Filter by role=Contributor → only Contributors returned
- Filter by status=Active → only active users
- Filter by status=Inactive → only inactive users
- No filter → all users returned
- Response contains per user: id, email, role, status, createdAt
- Response does NOT contain: passwordHash, refreshTokens (sensitive fields)

### GET /api/Admin/users/{id}
- Valid userId [Admin] → 200, full user detail
- Non-existent userId → 404
- [Expert] → 403
- [Contributor] → 403
- Unauthenticated → 401
- Response contains: id, email, role, status, createdAt, profile fields
- Response does NOT expose password hash

### PUT /api/Admin/users/{id}/role
- Valid userId, valid role [Admin] → 200, role updated in DB
- Change Contributor → Expert → 200, user.Role = Expert in DB
- Change Expert → Admin → 200 or 400 per promotion rule
- Change Admin → Contributor → 200 or 400 per demotion rule
- Invalid role value (not in enum) → 400
- Self role change (Admin changing own role) → 400 or 200 per impl
- Non-existent userId → 404
- [Expert] → 403
- Unauthenticated → 401
- After role update → AuditLog entry created in DB

### PUT /api/Admin/users/{id}/status
- Valid userId, status=Inactive [Admin] → 200, user.Status = Inactive in DB
- Valid userId, status=Active [Admin] → 200, user.Status = Active in DB
- Inactive user attempts login after deactivation → 401 or 403
- Cannot deactivate own Admin account → 400 per impl (self-lock prevention)
- Invalid status value → 400
- Non-existent userId → 404
- [Expert] → 403
- Unauthenticated → 401
- After status update → AuditLog entry created in DB

### GET /api/Admin/submissions
- [Admin] → 200, paginated submissions list
- [Expert] → 403
- [Contributor] → 403
- Unauthenticated → 401
- Filter by status=Pending → only Pending returned
- Filter by status=Approved → only Approved returned
- Filter by status=Draft → only Draft returned
- No filter → all submissions returned paginated
- Response contains per submission: id, status, submittedBy, createdAt, recordingTitle
- Empty DB → 200 empty list

### POST /api/Admin/submissions/{id}/assign
- Valid submissionId, valid expertId [Admin] → 200, expert assigned
- Non-existent submissionId → 404
- Non-existent expertId → 404
- AssigneeId belongs to non-Expert role → 400
- Already assigned submission → 200 (reassign) or 400 per impl
- [Expert] → 403
- Unauthenticated → 401
- After assign → submission.AssignedExpertId = expertId in DB
- After assign → notification created for assigned Expert in DB

### GET /api/Admin/audit-logs
- [Admin] → 200, paginated audit logs
- [Expert] → 403
- [Contributor] → 403
- Unauthenticated → 401
- Filter by userId → only logs for that user
- Filter by action/entity (if supported) → correct subset
- Filter by date range (if supported) → correct subset
- No filter → all logs paginated
- Response contains per log: id, userId, action, entity, entityId, createdAt
- After role change → relevant AuditLog entry queryable here
- After status change → relevant AuditLog entry queryable here

### GET /api/Admin/system-health
- [Admin] → 200, health status object
- [Expert] → 403
- [Contributor] → 403
- Unauthenticated → 401
- Response contains health indicators (DB connection, services, etc.)
- All indicators should be healthy in test environment

---

### Role Change Impact Flow (end-to-end)
Chain in sequence within one test:
1. GET /Admin/users → find seeded contributor userId
2. PUT /Admin/users/{id}/role (Contributor → Expert) → 200
3. GET /Admin/users/{id} → role = Expert in response
4. Assert DB: user.Role = Expert
5. Assert DB: AuditLog contains entry for this role change
6. New Expert token generated → can access Expert-only endpoint

### Status Change Impact Flow (end-to-end)
1. Use seeded contributor user
2. Login as contributor → 200, get token
3. PUT /Admin/users/{id}/status (Active → Inactive) [Admin] → 200
4. Login as same contributor again → 401 or 403
5. PUT /Admin/users/{id}/status (Inactive → Active) [Admin] → 200
6. Login as contributor → 200 (access restored)

### Assignment Flow (end-to-end)
1. Create and confirm submission (status = Pending)
2. POST /Admin/submissions/{id}/assign (expertId = seeded expert) → 200
3. GET /Admin/submissions → submission shows assignedExpertId
4. Assert DB: notification exists for expert

---

## IMPLEMENTATION RULES

1. Inherit ApiTestBase — use GetAsync, PutAsync<T>, PostAsync<T> helpers
2. All admin actions use JwtTokenHelper.AdminToken()
3. Each test fully independent:
   - For user mutation tests (role/status): create a fresh user via
     POST /api/Auth/register-contributor (not the seeded shared user)
     to avoid state bleed between tests
   - For submission tests: create fresh submission via SubmissionController
4. For DB state assertions:
   - Resolve AppDbContext from WebAppFactory.Services scope
   - Assert User.Role, User.Status, AuditLog records, Notification records
5. Naming: Endpoint_Scenario_ExpectedResult
   Example: GetUsers_ByExpertRole_Returns403
            UpdateUserRole_ContributorToExpert_UpdatesRoleInDb
            UpdateUserStatus_ToInactive_PreventsLogin
            AssignSubmission_ToNonExpertUser_Returns400
            GetAuditLogs_AfterRoleChange_ContainsRelevantEntry
6. Group by nested classes:
   - GetUsersTests
   - GetUserByIdTests
   - UpdateUserRoleTests
   - UpdateUserStatusTests
   - GetSubmissionsTests
   - AssignSubmissionTests
   - GetAuditLogsTests
   - SystemHealthTests
   - RoleChangeFlowTests
   - StatusChangeFlowTests
   - AssignmentFlowTests
7. Shared helpers within test class:
   - RegisterFreshUser(string role) → register + return (userId, email, token)
   - CreateAndConfirmSubmission(string contributorToken) → returns submissionId
   - GetUserFromDb(Guid userId) → resolve DbContext, return User entity
8. For sensitive field assertion (no password exposure):
   var json = await response.Content.ReadAsStringAsync();
   json.Should().NotContain("passwordHash");
   json.Should().NotContain("refreshToken");
9. AuditLog verification after mutations:
   var logs = dbContext.AuditLogs
       .Where(l => l.EntityId == userId.ToString()).ToList();
   logs.Should().Contain(l => l.Action == "RoleUpdate");
10. For system health: assert response has 200 and body is not empty;
    do not assert specific service names (they may change)

## VERIFICATION
Run: dotnet test --filter "AdminControllerTests"
All tests must be green. Fix errors before proceeding.

Check coverage delta:
- AdminController → ≥ 80% line coverage
- AuditLogService gains additional coverage via integration path
- UserService role/status mutation paths covered

## REPORT
Create: VietTuneArchive.Tests/Report/ADMIN_API_TEST_REPORT.md

Include:
- Date generated
- Total tests written, pass/fail count
- All test method names grouped by category
- Route paths confirmed (list all 8 endpoints)
- Role permission matrix:
  (Role × Endpoint → Allowed/Forbidden)
- Role promotion/demotion rules observed (document what was allowed)
- Self-action rules observed (self role change, self deactivation)
- AuditLog verification approach used
- Sensitive field exclusion verified (list fields checked)
- Assignment notification verification approach
- Helper methods created (list signatures)
- Uncovered scenarios and reason
- Estimated AdminController coverage delta
- Deferred cases:
  (bulk user operations, export audit logs, admin dashboard metrics,
   force logout active sessions)

Keep concise — no fluff.