You are implementing API integration tests for all Reference Data CRUD controllers
in VietTuneArchive.Tests. Infrastructure (WebAppFactory, JwtTokenHelper, ApiTestBase,
DatabaseFixture) is already set up. Do NOT modify any fixture files unless required.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.API/Controllers/CeremonyController.cs
- VietTuneArchive.API/Controllers/InstrumentController.cs
- VietTuneArchive.API/Controllers/EthnicGroupController.cs
- VietTuneArchive.API/Controllers/MusicalScaleController.cs
- VietTuneArchive.API/Controllers/VocalStyleController.cs
- VietTuneArchive.API/Controllers/TagController.cs
- VietTuneArchive.API/Controllers/ProvinceController.cs (if exists)
- VietTuneArchive.API/Controllers/DistrictController.cs
- VietTuneArchive.API/Controllers/CommuneController.cs
- VietTuneArchive.Application/DTOs/ (DTOs for each entity above)
- VietTuneArchive.Domain/Entities/ (entity fields for each above)
- VietTuneArchive.Tests/Integration/Fixtures/

Confirm exact routes, auth rules, required fields, and any
special endpoints (non-CRUD) per controller before writing tests.

## TARGET FILE
VietTuneArchive.Tests/Integration/Controllers/ReferenceDataTests.cs

Single file covering all reference controllers.
Group by controller using nested classes.

## BASE CLASS
Inherit ApiTestBase. Use JwtTokenHelper for role tokens.

---

## SHARED CRUD PATTERN
Every reference controller follows this pattern. Apply to ALL 9 controllers:

### GET / (GetAll)
- Anonymous or authenticated (per controller auth rule) → 200, paginated list
- page=1&size=3 → max 3 results
- page beyond total → 200 empty list
- Empty table → 200 empty list
- Response contains expected fields (id, name, + entity-specific fields)

### GET /{id}
- Valid id → 200, correct entity returned
- Non-existent id → 404
- Response shape matches DTO

### POST / (Create)
- Valid payload [Admin] → 201, entity created in DB
- [Expert] → 403 or 201 per role rule (check each controller)
- [Contributor] → 403
- Unauthenticated → 401
- Missing required name field → 400
- Duplicate name → 409 or 400 per impl
- After create → GET /{id} returns new entity

### PUT /{id} (Update)
- Valid update [Admin] → 200, fields updated in DB
- [Expert] → 403 or 200 per rule
- [Contributor] → 403
- Unauthenticated → 401
- Non-existent id → 404
- Missing required field → 400
- After update → GET /{id} reflects new values

### DELETE /{id}
- Valid id [Admin] → 204, removed from DB
- [Expert] → 403
- [Contributor] → 403
- Unauthenticated → 401
- Non-existent id → 404
- Entity referenced by Recording (FK) → 400 or cascade per impl
- After delete → GET /{id} returns 404

---

## CONTROLLER-SPECIFIC TESTS

### InstrumentController (extra endpoints)

GET /api/Instrument/category/{category}
- Valid category with instruments → 200, only that category returned
- Non-existent category → 200 empty or 404 per impl
- Anonymous → 200

GET /api/Instrument/ethnic-group/{ethnicGroupId}
- Valid ethnicGroupId with linked instruments → 200, correct subset
- EthnicGroupId with no linked instruments → 200 empty
- Non-existent ethnicGroupId → 404 or 200 empty per impl
- Anonymous → 200

GET /api/Instrument/search
- Query matching name → 200, correct instruments returned
- Partial match → 200, all matches
- No match → 200 empty
- Anonymous → 200

GET /api/Instrument/categories/list
- Returns all distinct categories → 200, non-empty array
- Anonymous → 200

### DistrictController (extra endpoint)

GET /api/District/get-by-province/{provinceId}
- Valid provinceId → 200, districts for that province
- ProvinceId with no districts → 200 empty
- Non-existent provinceId → 404 or 200 empty per impl
- Anonymous → 200

### CommuneController (extra endpoint)

GET /api/Commune/get-by-district/{districtId}
- Valid districtId → 200, communes for that district
- DistrictId with no communes → 200 empty
- Non-existent districtId → 404 or 200 empty per impl
- Anonymous → 200

---

## REFERENTIAL INTEGRITY TESTS

For each reference entity used as FK in Recording:
- Seed a Recording referencing the entity
- Attempt DELETE of that entity → assert 400 (FK violation) or cascade per impl
- Document observed behavior in report

Test for: EthnicGroup, Instrument, Ceremony, MusicalScale, VocalStyle

---

## IMPLEMENTATION RULES

1. Inherit ApiTestBase — use GetAsync, PostAsync<T>, PutAsync<T>, DeleteAsync
2. Single file, grouped by nested classes:
   - CeremonyTests
   - InstrumentTests       ← includes extra endpoints
   - EthnicGroupTests
   - MusicalScaleTests
   - VocalStyleTests
   - TagTests
   - ProvinceTests (if controller exists)
   - DistrictTests         ← includes get-by-province
   - CommuneTests          ← includes get-by-district
   - ReferentialIntegrityTests
3. Each test independent:
   - Create fresh entity per write test (unique name via Guid suffix)
     e.g., $"Ceremony-{Guid.NewGuid()}"
   - For read tests: use DatabaseFixture seeded reference data
4. For DB state assertions:
   - Resolve AppDbContext from WebAppFactory.Services scope
   - Assert entity presence/absence after create/delete
5. Naming: ControllerName_Endpoint_Scenario_ExpectedResult
   Example: Ceremony_Create_ByAdmin_Returns201AndPersistedInDb
            Instrument_GetByCategory_WithValidCategory_ReturnsFilteredList
            EthnicGroup_Delete_ReferencedByRecording_Returns400
            District_GetByProvince_WithNoDistricts_ReturnsEmptyList
            MusicalScale_Create_WithDuplicateName_Returns409
6. Shared generic helper to reduce boilerplate:
   Create a private generic method used across all controller test classes:

   async Task<Guid> CreateEntity(string url, object payload, string token)
   {
       var response = await PostAsync(url, payload, token);
       response.StatusCode.Should().Be(HttpStatusCode.Created);
       var body = await response.Content.ReadFromJsonAsync<JsonElement>();
       return body.GetProperty("id").GetGuid();
   }

   async Task AssertGetById(string url, Guid id, HttpStatusCode expected)
   {
       var response = await GetAsync($"{url}/{id}");
       response.StatusCode.Should().Be(expected);
   }

7. Role rule discovery: if controller has no [Authorize] attribute,
   test anonymous POST/PUT/DELETE — document whether they are open or protected
   Do NOT assume — read the controller file
8. Duplicate name test: create entity, then POST same name again → assert 409/400
9. For referential integrity: seed Recording FK reference via DbContext directly
   (not via full submission flow) to keep test fast and isolated
10. Assert response shape spot-check for each controller:
    At minimum assert: id (Guid), name (string), expected entity-specific field

## VERIFICATION
Run: dotnet test --filter "ReferenceDataTests"
All tests must be green. Fix errors before proceeding.

Check coverage delta:
- All 9 reference controllers → ≥ 75% line coverage each
- Combined reference services gain meaningful branch coverage

## REPORT
Create: VietTuneArchive.Tests/Report/REFERENCE_DATA_API_TEST_REPORT.md

Include:
- Date generated
- Total tests written, pass/fail count
- Tests per controller (table: Controller → test count)
- Route paths confirmed per controller (list all including extra endpoints)
- Auth rules discovered per controller:
  (table: Controller × Role → Allowed/Forbidden for POST/PUT/DELETE)
- Open endpoints found (no auth required for write operations — flag these)
- Referential integrity behavior observed per entity:
  (table: Entity → FK delete behavior → 400 / Cascade / Allowed)
- Duplicate name handling per controller (409 / 400 / allowed)
- Generic helper methods created (signatures)
- Uncovered scenarios and reason
- Estimated coverage delta per controller
- Flagged issues:
  (any controller missing auth on write endpoints — security concern)
- Deferred cases:
  (bulk import of reference data, province/district/commune hierarchy
   validation, ethnic group ↔ instrument many-to-many endpoint tests)

Keep concise — no fluff.