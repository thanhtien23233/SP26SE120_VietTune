# VietTuneArchive.Tests

Test project for the **VietTuneArchive** ASP.NET Core 8 backend.

---

## Folder Structure

```
VietTuneArchive.Tests/
├── Unit/
│   ├── Services/        # Business logic tests using Moq stubs
│   └── Domain/          # Entity validation & pure-logic tests
├── Integration/
│   ├── Controllers/     # End-to-end API tests via WebApplicationFactory
│   └── Repositories/    # Real-DB tests using Testcontainers (PostgreSQL)
└── TestHelpers/
    ├── Builders/        # Object-mother / fluent test-data builders
    ├── Fixtures/        # Shared fixtures (DatabaseFixture, WebAppFixture)
    └── Fakes/           # In-process fake implementations of interfaces
```

---

## Key Packages

| Package | Purpose |
|---|---|
| `xUnit` | Test framework |
| `Moq` | Mock/stub dependencies in unit tests |
| `FluentAssertions` | Readable assertion API |
| `Microsoft.EntityFrameworkCore.InMemory` | Fast, in-process DB for unit tests |
| `Microsoft.AspNetCore.Mvc.Testing` | Spin up the full ASP.NET pipeline in tests |
| `Testcontainers.PostgreSql` | Real Postgres container for integration tests |
| `WireMock.Net` | Mock external HTTP services (AI endpoints, etc.) |
| `coverlet.collector` | Code-coverage collection |

---

## Running Tests

```bash
# Run all tests
dotnet test

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run only unit tests
dotnet test --filter "FullyQualifiedName~Unit"

# Run only integration tests
dotnet test --filter "FullyQualifiedName~Integration"
```

---

## Conventions

- **Unit tests** – no I/O, no network; inject mocks via constructor.
- **Integration tests** – use `DatabaseFixture` (Testcontainers) or `WebApplicationFactory`.
- **Builders** – prefer the Object Mother pattern; every builder lives in `TestHelpers/Builders/`.
- **Fakes** – hand-written interface implementations for deterministic behaviour; prefer over mocks for complex state.
