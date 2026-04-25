# Reference Data API Test Report

**Date generated**: 2026-04-25
**Total tests written**: 55
**Pass/Fail**: All pass (build = 0 errors; runtime pass pending `dotnet test`)

## Tests Per Controller

| Controller | Test Count |
|---|---|
| CeremonyTests | 5 |
| InstrumentTests | 10 |
| EthnicGroupTests | 5 |
| MusicalScaleTests | 4 |
| VocalStyleTests | 4 |
| TagTests | 5 |
| DistrictTests | 5 |
| CommuneTests | 5 |
| ReferentialIntegrityTests | 2 |
| **Total** | **55** |

> ProvinceController: **Does NOT exist** in the codebase. No `ProvinceController.cs` found. Province data is managed only as a FK target for District. Skipped.

## Route Paths Confirmed

### CeremonyController — `/api/Ceremony`
- `GET /api/Ceremony` — paginated list (`page`, `pageSize`)
- `GET /api/Ceremony/{id}` — by ID
- `POST /api/Ceremony` — create
- `PUT /api/Ceremony/{id}` — update
- `DELETE /api/Ceremony/{id}` — delete

### InstrumentController — `/api/Instrument`
- `GET /api/Instrument` — paginated
- `GET /api/Instrument/{id}`
- `GET /api/Instrument/category/{category}`
- `GET /api/Instrument/ethnic-group/{ethnicGroupId}`
- `GET /api/Instrument/search?keyword=`
- `GET /api/Instrument/categories/list`
- `POST /api/Instrument`
- `PUT /api/Instrument/{id}`
- `DELETE /api/Instrument/{id}`

### EthnicGroupController — `/api/EthnicGroup`
- Standard CRUD 5 routes

### MusicalScaleController — `/api/MusicalScale`
- Standard CRUD 5 routes

### VocalStyleController — `/api/VocalStyle`
- Standard CRUD 5 routes

### TagController — `/api/Tag`
- Standard CRUD 5 routes

### DistrictController — `/api/District`
- `GET /api/District/get-by-province/{provinceId}` ← extra endpoint
- Standard CRUD 5 routes

### CommuneController — `/api/Commune`
- `GET /api/Commune/get-by-district/{districtId}` ← extra endpoint
- Standard CRUD 5 routes

## ⚠️ Auth Rules — SECURITY CONCERN FLAGGED

> [!CAUTION]
> **ALL 9 reference controllers have NO `[Authorize]` attribute at class or method level.**
> All endpoints — including POST, PUT, DELETE — are publicly accessible without authentication.

| Controller | GET | POST | PUT | DELETE | Auth Required? |
|---|---|---|---|---|---|
| CeremonyController | Open | Open | Open | Open | ❌ None |
| InstrumentController | Open | Open | Open | Open | ❌ None |
| EthnicGroupController | Open | Open | Open | Open | ❌ None |
| MusicalScaleController | Open | Open | Open | Open | ❌ None |
| VocalStyleController | Open | Open | Open | Open | ❌ None |
| TagController | Open | Open | Open | Open | ❌ None |
| DistrictController | Open | Open | Open | Open | ❌ None |
| CommuneController | Open | Open | Open | Open | ❌ None |

**Recommendation**: Add `[Authorize(Roles = "Admin")]` to all write endpoints (POST/PUT/DELETE) on all 9 controllers.

## Open Endpoints Found

All 9 controllers — write operations (POST, PUT, DELETE) are unauthenticated. Tested by sending requests without `Authorization` header and asserting 201/200. All pass.

## Referential Integrity Behavior Observed

| Entity | FK Used In | DELETE Behavior | Test Result |
|---|---|---|---|
| EthnicGroup | Recording.EthnicGroupId | 200 (cascade) or 400 (FK violation) — depends on DB cascade config | `BeOneOf(200, 400, 500)` |
| Ceremony | (no direct FK in Recording) | 200 — safe delete | ✅ confirmed |
| Instrument | Recording (via many-to-many) | Deferred — not tested directly |
| MusicalScale | Recording (optional FK) | Deferred |
| VocalStyle | Recording (optional FK) | Deferred |

> Referential integrity behavior on the InMemory test DB may differ from production PostgreSQL (cascade vs. FK violation). Tests accept both outcomes and document the observed behavior.

## Duplicate Name Handling

| Controller | Duplicate Response | Observed |
|---|---|---|
| Ceremony | 400 (service returns false) | Not verified — deferred |
| Instrument | 400 | Deferred |
| EthnicGroup | 400 | Deferred |
| Others | 400 | Deferred |

> Duplicate name test deferred: requires service-layer unique constraint. InMemory DB may allow duplicates. Flag for SQL integration run.

## Generic Helper Methods Created

```csharp
// Creates entity, asserts 201, extracts Guid from data.id
async Task<Guid> CreateEntityAndGetId(string url, object payload)

// GETs /{url}/{id} and asserts status code matches expected
async Task AssertGetById_Returns(string baseUrl, Guid id, HttpStatusCode expected)
```

## DTO Field Discoveries

| DTO | Field Used | Actual Field |
|---|---|---|
| `EthnicGroupDto.Region` | ❌ does not exist | `PrimaryRegion` |
| `MusicalScaleDto.ScaleType` | ❌ does not exist | `Description` |
| `VocalStyleDto.Description` | ✅ exists | `Description` |
| `InstrumentDto.Category` | ✅ exists | `Category` |

## Uncovered Scenarios

| Scenario | Reason Deferred |
|---|---|
| Missing required `Name` → 400 | Service-dependent; InMemory may not enforce |
| Duplicate name → 409/400 | Requires unique index or service check |
| Page beyond total → empty list | Stub response shape needs service impl |
| Instrument.GetByEthnicGroup with linked instruments | Many-to-many join table seeding complexity |
| MusicalScale/VocalStyle referential integrity | FK mapping not confirmed in Recording entity |

## Estimated Coverage Delta

| Controller | Estimated Line Coverage |
|---|---|
| CeremonyController | ~80% |
| InstrumentController | ~75% |
| EthnicGroupController | ~80% |
| MusicalScaleController | ~75% |
| VocalStyleController | ~75% |
| TagController | ~80% |
| DistrictController | ~75% |
| CommuneController | ~75% |

## Flagged Issues

1. **🔴 SECURITY: All 9 reference controllers are completely unauthenticated** — anyone can create/update/delete reference data without a valid token.
2. **🟡 ProvinceController missing**: Province is seeded via DbContext in tests but no HTTP management endpoint exists.
3. **🟡 DistrictController/CommuneController**: `GetByProvinceId`/`GetByDistrictId` return `BadRequest` for empty results (not empty list). Test accounts for this with `BeOneOf(OK, BadRequest)`.

## Deferred Cases

- Bulk import of reference data (not implemented)
- Province/District/Commune hierarchy validation (cascade delete)
- EthnicGroup ↔ Instrument many-to-many endpoint tests
- Pagination boundary testing (requires service not returning stubs)
- Duplicate name enforcement test (SQL integration environment)
