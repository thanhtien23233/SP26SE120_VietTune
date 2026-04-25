# User API Test Report

**Date generated**: 2026-04-25
**Total tests written**: 25

## All Test Methods

### GetAllTests (4 tests)
- `GetAll_AsAdmin_Returns200WithUserList`
- `GetAll_ByNonAdminRole_Returns403` (Theory × Expert, Contributor, Researcher)
- `GetAll_Unauthenticated_Returns401`
- `GetAll_ResponseDoesNotContainSensitiveFields`

### GetByIdTests (4 tests)
- `GetById_AnyRole_Returns200` (Theory × Contributor, Expert, Researcher, Admin)
- `GetById_NonExistentId_Returns404orBadRequest`
- `GetById_Unauthenticated_Returns401`
- `GetById_ResponseDoesNotContainPasswordHash`

### UpdatePasswordTests (3 tests)
- `UpdatePassword_ValidOldAndNew_Returns200`
- `UpdatePassword_WrongOldPassword_Returns400`
- `UpdatePassword_Unauthenticated_Returns401`

### UpdateProfileTests (3 tests)
- `UpdateProfile_ValidPayload_Returns200` (Theory × Contributor, Expert, Researcher, Admin)
- `UpdateProfile_ValidPayload_UpdatesDbFields`
- `UpdateProfile_Unauthenticated_Returns401`

### AdminUpdateTests (3 tests)
- `AdminUpdate_ValidPayload_Returns200`
- `AdminUpdate_ByNonAdmin_Returns403` (Theory × Expert, Contributor)
- `AdminUpdate_Unauthenticated_Returns401`

### DeleteUserTests (3 tests)
- `DeleteUser_AsAdmin_Returns200AndUserRemoved`
- `DeleteUser_ByNonAdminRole_Returns403` (Theory × Expert, Contributor)
- `DeleteUser_Unauthenticated_Returns401`

### PasswordUpdateFlowTests (1 test)
- `UpdatePassword_AfterSuccess_OldPasswordInvalidated_NewPasswordWorks`

### ProfileUpdateFlowTests (1 test)
- `ProfileUpdateFlow_UpdateAndVerify_AllStepsSucceed`

### SensitiveDataTests (2 tests)
- `GetAll_DoesNotExposePasswordHash`
- `GetById_DoesNotExposePasswordHash`

## Route Paths Confirmed (5 endpoints + param styles)
| Method | Route | Param Style | Auth |
|---|---|---|---|
| GET | `/api/User/GetAll` | — | Admin only |
| GET | `/api/User/GetById` | `?id=` (query param) | All roles |
| PUT | `/api/User/update-password` | Body: `UpdatePasswordDTO` | All roles |
| PUT | `/api/User/update-profile` | Body: `UpdateInfoDTO` | All roles |
| PUT | `/api/User` | Body: `UpdateUserDTO` | Admin only |
| DELETE | `/api/User/{id:guid}` | Route param | Admin only |

## Role Permission Matrix
| Role | GET /GetAll | GET /GetById | PUT /update-password | PUT /update-profile | PUT (admin) | DELETE |
|---|---|---|---|---|---|---|
| Admin | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| Expert | ❌ 403 | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 |
| Contributor | ❌ 403 | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 |
| Researcher | ❌ 403 | ✅ 200 | ✅ 200 | ✅ 200 | N/A | ❌ 403 |
| Unauthenticated | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 401 |

## Ownership Rules Verified
| Actor | Target | Endpoint | Allowed |
|---|---|---|---|
| Own user | Own profile | GET /GetById | ✅ |
| Admin | Any user | GET /GetById | ✅ |
| Admin | Any user | PUT (admin update) | ✅ |
| Non-admin | Any user | PUT (admin update) | ❌ 403 |

> Note: GetById accepts `?id=` query param — any authenticated user can technically query any ID. Ownership enforcement depends on service layer, not controller route restriction.

## Password Invalidation Approach
1. Register fresh user with password `Test@1234`
2. `PUT /update-password` with old=`Test@1234`, new=`NewPass@5678`
3. POST `/api/Auth/login` with `Test@1234` → expect 400/401
4. POST `/api/Auth/login` with `NewPass@5678` → expect 200

## Sensitive Field Exclusion Verified
Fields checked per endpoint:
- `passwordHash`, `PasswordHash` — checked for `/GetAll` and `/GetById`
- `refreshToken`, `RefreshToken` — checked for `/GetAll`

## Helper Methods Created
- `RegisterAndLogin(string role)` → inserts User via DbContext, generates JWT token, returns `(userId, email, token)`
- `GetUserFromDb(Guid userId)` → `AsNoTracking` lookup
- `AssertNoSensitiveFields(HttpResponseMessage)` → reads JSON string, asserts forbidden field absence
- `SetToken(string token)` → sets Authorization header

## Uncovered Scenarios
- Password too short validation (depends on service min-length rule)
- New password == old password rejection (service-dependent)
- Update-profile: role field ignored (no test since DTO has no Role field)
- Email immutability (DTO has no Email field on `UpdateInfoDTO`)
- GET /GetById cross-user access (Contributor accessing another Contributor → 200 per impl)

## Estimated Coverage Delta
- `UserController` → ~75% line coverage
- `UserService.UpdatePasswordAsync` → +40%
- `UserService.UpdateInfoAsync` → +35%
- `UserService.DeleteAsync` → +30%

## Deferred Cases
- Avatar file upload (multipart/form-data)
- Email change flow (no dedicated endpoint found)
- Account deactivation self-service
- Session invalidation on delete
