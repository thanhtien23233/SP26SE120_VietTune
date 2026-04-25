You are implementing unit tests for the Auth Flow in the VietTuneArchive.Tests project.
The backend is .NET 8 / ASP.NET Core. Test project is already scaffolded.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.Application/Services/AuthService.cs
- VietTuneArchive.Application/IServices/IAuthService.cs
- VietTuneArchive.Application/DTOs/Auth/ (all files)
- VietTuneArchive.Domain/Entities/User.cs
- VietTuneArchive.Domain/Enums/ (roles, status enums)
- VietTuneArchive.Application/IRepositories/IUserRepository.cs (or equivalent)

Understand the actual method signatures, DTO fields, and business rules 
before writing anything.

## TARGET FILE
VietTuneArchive.Tests/Unit/Services/AuthServiceTests.cs

## TEST CASES TO IMPLEMENT

### Register()
- Valid input → user created, password hashed (not stored as plaintext)
- Duplicate email → throws exception or returns error result
- Invalid role (not in allowed enum) → rejected
- Missing required fields → validation fails

### Login()
- Correct credentials → returns JWT token with correct role claim
- Wrong password → returns unauthorized/error
- Email not found → returns unauthorized/error  
- Inactive/banned user → returns forbidden/error
- JWT payload contains: userId, email, role (assert these claims exist)

### RefreshToken()
- Valid refresh token → returns new access token
- Expired refresh token → rejected
- Tampered/invalid token string → rejected
- Refresh token belonging to different user → rejected

## IMPLEMENTATION RULES

1. Use xUnit + Moq + FluentAssertions only
2. Mock all external dependencies:
   - IUserRepository (or whatever repo AuthService depends on)
   - Any IEmailService, ITokenService, etc.
   - Do NOT use real DB or real JWT signing validation
3. Each test method: Arrange / Act / Assert structure, labeled with comments
4. Naming convention: MethodName_Scenario_ExpectedResult
   Example: Login_WithWrongPassword_ReturnsUnauthorized
5. Group by method using nested classes or #region
6. If AuthService uses Result<T> wrapper pattern, assert both 
   .IsSuccess and .Value/.Error appropriately
7. If password hashing uses a service/interface, mock it — 
   do not test the hashing algorithm itself

## AFTER WRITING
- Run `dotnet test --filter "AuthServiceTests"` 
- All tests must pass (green)
- Fix any compilation or logic errors before finishing
- Report: total tests written, pass/fail count