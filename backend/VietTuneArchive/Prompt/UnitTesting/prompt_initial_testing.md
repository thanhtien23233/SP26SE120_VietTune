You are setting up a unit test project for a .NET 8 / ASP.NET Core backend solution 
named VietTuneArchive. The solution has 3 existing projects:
- VietTuneArchive.Domain
- VietTuneArchive.Application  
- VietTuneArchive.API

## GOAL
Create a new test project and scaffold the folder structure. Do NOT write any test code yet.

## STEPS

1. **Create test project**
   - Add a new xUnit project named `VietTuneArchive.Tests` inside the solution
   - Add project references to Domain, Application, and API projects
   - Install NuGet packages: xUnit, Moq, FluentAssertions, 
     Microsoft.EntityFrameworkCore.InMemory, Microsoft.AspNetCore.Mvc.Testing,
     Testcontainers.PostgreSql, coverlet.collector, WireMock.Net

2. **Create folder structure** (empty folders with .gitkeep):
   VietTuneArchive.Tests/
   ├── Unit/
   │   ├── Services/        # Business logic tests using mocks
   │   └── Domain/          # Entity & state machine tests
   ├── Integration/
   │   ├── Controllers/     # API endpoint tests via WebApplicationFactory
   │   └── Repositories/    # DB tests via Testcontainers
   └── TestHelpers/
       ├── Builders/        # Object mother / test data builders
       ├── Fixtures/        # Shared test fixtures (DB context, etc.)
       └── Fakes/           # Fake implementations of interfaces

3. **Create placeholder files**
   - `TestHelpers/Fixtures/DatabaseFixture.cs` — empty class, comment only
   - `TestHelpers/Builders/README.md` — one-line note: "Add builder classes here"
   - A root-level `README.md` inside the test project explaining the structure

4. **Verify**
   - Run `dotnet build` on the solution and confirm 0 errors
   - Run `dotnet test` and confirm the test project is discovered (0 tests, 0 failures)

## CONSTRAINTS
- Do not write any actual test methods
- Do not modify existing project files except .sln (to add the new project)
- Use the existing solution file to register the new test project