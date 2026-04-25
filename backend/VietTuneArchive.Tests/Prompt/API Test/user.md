You are implementing API integration tests for the User flow in VietTuneArchive.Tests.
Infrastructure (WebAppFactory, JwtTokenHelper, ApiTestBase, DatabaseFixture) is
already set up. Do NOT modify any fixture files unless absolutely required.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.API/Controllers/UserController.cs             ← routes, auth roles
- VietTuneArchive.Application/Services/UserService.cs           ← business rules
- VietTuneArchive.Application/DTOs/User/ (all files)            ← request/response shape
- VietTuneArchive.Domain/Entities/User.cs
- VietTuneArchive.Domain/Enums/ (UserRole, UserStatus, or equivalent)
- VietTuneArchive.Tests/Integration/Fixtures/                   ← all fixture files
- VietTuneArchive.Tests/Integration/Fixtures/DatabaseFixture.cs ← seeded users

Confirm exact route paths, DTO field names, ownership rules,
and role restrictions before writing any test.

## TARGET FILE
VietTuneArchive.Tests/Integration/Controllers/UserControllerTests.cs

## BASE CLASS
Inherit ApiTestBase. Use JwtTokenHelper for role tokens.
Use DatabaseFixture seeded users as baseline data.

---

## TEST CASES

### GET /api/User/GetAll [Authorize(Roles = "Admin")]
- [Admin] → 200, paginated user list
- [Expert] → 403
- [Contributor] → 403
- [Researcher] → 403
- Unauthenticated → 401
- Pagination: page=1&size=3 → max 3 results
- Pagination: page=2 → next slice
- Response contains per user: id, email, role, status, createdAt
- Response does NOT contain: passwordHash, refreshTokens
- Empty DB (no users beyond admin) → 200 with at least admin user

### GET /api/User/GetById [Authorize(Roles = "Admin,Contributor,Researcher,Expert")]
- Own profile [Contributor] → 200, own data returned
- Own profile [Expert] → 200
- Own profile [Researcher] → 200
- Own profile [Admin] → 200
- Other user's profile [Admin] → 200 (admin can view any)
- Other user's profile [Contributor] → 403 or own profile only per impl
- Other user's profile [Expert] → 403 or allowed per impl
- Non-existent userId → 404
- Unauthenticated → 401
- Response contains: id, email, role, status, profile fields
- Response does NOT contain: passwordHash, refreshTokens

### PUT /api/User/update-password [Authorize(Roles = "Admin,Contributor,Researcher,Expert")]
- Valid old password + new password [Contributor] → 200
- Valid for [Expert] → 200
- Valid for [Researcher] → 200
- Valid for [Admin] → 200
- Wrong old password → 400 with error message
- New password same as old password → 400 or 200 per impl
- New password too short (below min length) → 400
- Missing old password field → 400
- Missing new password field → 400
- Unauthenticated → 401
- After success → login with old password → 401
- After success → login with new password → 200

### PUT /api/User/update-profile [Authorize(Roles = "Admin,Contributor,Researcher,Expert")]
- Valid payload [Contributor] → 200, profile updated in DB
- Valid payload [Expert] → 200
- Valid payload [Researcher] → 200
- Valid payload [Admin] → 200
- Unauthenticated → 401
- Update own profile only (cannot update another user's profile) → 403
- Missing required profile field (if any required) → 400
- Update displayName → DB reflects new displayName
- Update bio/description → DB reflects new value
- Update avatar URL (if field exists) → DB reflects new URL
- Cannot update email via this endpoint (email immutable) → 400 or field ignored
- Cannot update role via this endpoint → 400 or field ignored
- Response contains updated profile fields

### PUT /api/User [Authorize(Roles = "Admin")]
- Valid update [Admin] → 200, user fields updated
- [Expert] → 403
- [Contributor] → 403
- Unauthenticated → 401
- Non-existent userId → 404
- Can update any user's fields (admin privilege)
- Cannot set invalid role → 400
- After update → DB reflects new values

### DELETE /api/User/{id} [Authorize(Roles = "Admin")]
- Valid userId [Admin] → 204, user removed or soft-deleted
- [Expert] → 403
- [Contributor] → 403
- [Researcher] → 403
- Unauthenticated → 401
- Non-existent userId → 404
- Delete own Admin account → 400 (self-delete prevention) or 204 per impl
- After delete → GET /User/GetById for deleted userId → 404
- After delete → deleted user login attempt → 401

---

### Password Update Flow (end-to-end)
1. Register fresh contributor via POST /api/Auth/register-contributor
2. Login → get token
3. PUT /api/User/update-password (correct old, new password) → 200
4. Login with old password → 401
5. Login with new password → 200
6. New token is valid on protected endpoint

### Profile Update Flow (end-to-end)
1. Register fresh user
2. Login → get token
3. PUT /api/User/update-profile (new displayName, bio) → 200
4. GET /api/User/GetById → response contains updated fields
5. Assert DB: user.DisplayName = new value

### Ownership Enforcement
- UserA token → GET /User/GetById?id=UserB → 403 (if ownership enforced)
- UserA token → PUT /User/update-profile for UserB → 403
- Admin token → GET /User/GetById?id=UserB → 200 (admin override)
- Admin token → PUT /User for UserB → 200 (admin override)

### Sensitive Data Exposure
For every GET endpoint, assert response JSON:
- Does NOT contain "passwordHash"
- Does NOT contain "refreshToken"
- Does NOT contain "salt" (if used)
- Does NOT contain any internal system fields

---

## IMPLEMENTATION RULES

1. Inherit ApiTestBase — use GetAsync, PutAsync<T>, DeleteAsync helpers
2. Each test fully independent:
   - For password/profile mutation tests: register a fresh user via
     POST /api/Auth/register-contributor to avoid contaminating seeded users
   - For read-only tests: use seeded DatabaseFixture users
3. For DB state assertions:
   - Resolve AppDbContext from WebAppFactory.Services scope
   - Assert User.DisplayName, User.Bio, User.PasswordHash after updates
4. For password change verification:
   - After update-password, call POST /api/Auth/login with old credentials → 401
   - Call POST /api/Auth/login with new credentials → 200
5. Naming: Endpoint_Scenario_ExpectedResult
   Example: GetById_OwnProfile_Returns200WithCorrectData
            UpdatePassword_WithWrongOldPassword_Returns400
            UpdateProfile_ForAnotherUser_Returns403
            DeleteUser_ByAdmin_Returns204AndUserNotFoundAfter
            UpdatePassword_AfterSuccess_OldPasswordInvalidated
6. Group by nested classes:
   - GetAllTests
   - GetByIdTests
   - UpdatePasswordTests
   - UpdateProfileTests
   - AdminUpdateTests
   - DeleteUserTests
   - PasswordUpdateFlowTests
   - ProfileUpdateFlowTests
   - OwnershipEnforcementTests
   - SensitiveDataTests
7. Shared helpers within test class:
   - RegisterAndLogin(string role) → register + login, return (userId, token)
   - GetUserFromDb(Guid userId) → resolve DbContext, return User entity
   - AssertNoSensitiveFields(HttpResponseMessage response) →
       reads JSON, asserts passwordHash/refreshToken absent
8. Assert response body shape:
   var body = await response.Content.ReadFromJsonAsync<UserProfileDto>();
   body.Email.Should().Be("test@mail.com");
   body.Role.Should().Be("Contributor");
   body.DisplayName.Should().Be("Updated Name");
9. For GetAll pagination: seed enough users (3+) to meaningfully test
   page boundaries — register fresh users in test setup if needed
10. If GetById uses query param (?id=...) vs route param (/{id}),
    confirm from controller and use correct format in all tests

## VERIFICATION
Run: dotnet test --filter "UserControllerTests"
All tests must be green. Fix errors before proceeding.

Check coverage delta:
- UserController → ≥ 80% line coverage
- UserService password update + profile update branches covered

## REPORT
Create: VietTuneArchive.Tests/Report/USER_API_TEST_REPORT.md

Include:
- Date generated
- Total tests written, pass/fail count
- All test method names grouped by category
- Route paths confirmed (list all 6 endpoints + param styles)
- Role permission matrix:
  (Role × Endpoint → Allowed/Forbidden)
- Ownership rules verified (table: Actor × Target → Allowed/Forbidden)
- Password invalidation approach (how old password tested after change)
- Sensitive field exclusion verified (list fields checked per endpoint)
- Helper methods created (list signatures)
- Uncovered scenarios and reason
- Estimated UserController + UserService coverage delta
- Deferred cases:
  (avatar file upload if multipart, email change flow if separate endpoint,
   account deactivation self-service, session invalidation on delete)

Keep concise — no fluff.