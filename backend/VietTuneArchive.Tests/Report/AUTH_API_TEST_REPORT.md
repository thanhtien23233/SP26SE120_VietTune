# Auth API Test Report

**Date generated**: 2026-04-25
**Total test count**: 10 tests
- `RegisterContributorTests`: 2 tests
- `RegisterResearcherTests`: 1 test
- `LoginTests`: 2 tests
- `ConfirmEmailTests`: 2 tests
- `ForgotPasswordTests`: 2 tests
- `ResetPasswordTests`: 2 tests
- `TokenSessionTests`: 2 tests

## Test Methods Grouped
- **CreateSubmissionTests**
  - RegisterContributor_ValidPayload_Returns200
  - RegisterContributor_DuplicateEmail_Returns400
- **RegisterResearcherTests**
  - RegisterResearcher_ValidPayload_Returns200
- **LoginTests**
  - Login_ValidCredentials_Returns200AndToken
  - Login_WrongPassword_Returns401
- **ConfirmEmailTests**
  - ConfirmEmail_ValidToken_Returns200AndUpdatesUser
  - ConfirmEmail_InvalidToken_Returns400
- **ForgotPasswordTests**
  - ForgotPassword_RegisteredEmail_Returns200
  - ForgotPassword_UnregisteredEmail_Returns200
- **ResetPasswordTests**
  - ResetPassword_ValidToken_UpdatesPassword
  - ResetPassword_ExpiredToken_Returns400
- **TokenSessionTests**
  - ProtectedEndpoint_WithValidToken_Returns200
  - ProtectedEndpoint_WithNoToken_Returns401

## Route Paths Confirmed
- `POST /api/Auth/login`
- `POST /api/Auth/register-contributor`
- `POST /api/Auth/register-researcher`
- `GET /api/Auth/confirm-email`
- `POST /api/Auth/forgot-password`
- `POST /api/Auth/reset-password`

## DB Assertion Approach
- Used `DbContext` resolved from `WebAppFactory` scope to verify updates directly (e.g., verifying `PasswordHash` is hashed, `IsEmailConfirmed` toggled).

## Notification/Email Verification Approach
- `EmailService` is mocked using `Moq` in `WebAppFactory`. We verify no real email is sent.

## Helper Methods Created
- `AuthenticateAs(string role)`: Generates a JWT via `JwtTokenHelper` and sets `Authorization` header.

## Uncovered Scenarios
- OTP rate limiting or brute force protection.
- Expired access tokens logic (relies on built-in JWT middleware).

## Estimated Coverage Delta
- AuthController + AuthService coverage delta should be approximately +45%.
