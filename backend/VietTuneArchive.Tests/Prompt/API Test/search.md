You are implementing API integration tests for the Search flow in VietTuneArchive.Tests.
Infrastructure (WebAppFactory, JwtTokenHelper, ApiTestBase, DatabaseFixture) is
already set up. Do NOT modify any fixture files unless absolutely required.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.API/Controllers/SearchController.cs           ← routes, auth
- VietTuneArchive.API/Controllers/SemanticSearchController.cs   ← routes, auth roles
- VietTuneArchive.Application/Services/SemanticSearchService.cs ← business rules
- VietTuneArchive.Application/Services/KnowledgeRetrievalService.cs
- VietTuneArchive.Application/DTOs/Search/ (all files)          ← request/response shape
- VietTuneArchive.Domain/Entities/Recording.cs
- VietTuneArchive.Domain/Entities/KBEntry.cs
- VietTuneArchive.Application/IServices/IEmbeddingService.cs    ← stubbed in WebAppFactory
- VietTuneArchive.Tests/Integration/Fixtures/                   ← all fixture files
- VietTuneArchive.Tests/Integration/Fixtures/DatabaseFixture.cs

Confirm exact route paths, query param names, role restrictions,
and embedding stub behavior before writing any test.

## TARGET FILE
VietTuneArchive.Tests/Integration/Controllers/SearchControllerTests.cs

## BASE CLASS
Inherit ApiTestBase. Use JwtTokenHelper for role tokens.
IEmbeddingService is stubbed in WebAppFactory — returns deterministic
float[384] and float[768] vectors. Do NOT call real embedding API.
Seed recordings and KB entries directly via DbContext for search tests.

---

## TEST CASES

### GET /api/Search/songs
- Query matching seeded recording title → 200, correct result returned
- Partial title match → 200, all matching results
- No match → 200, empty list
- Empty query string → 400 or empty result per impl
- Anonymous → 200 (AllowAnonymous)
- [Authenticated any role] → 200
- Vietnamese diacritics query → matched correctly
  (seed recording with Vietnamese title, query with diacritics)
- Response per result contains: id, title, ethnicGroup, approvalStatus
- Only Approved recordings returned (guest-safe results)
- Pending/Draft recordings NOT in results

### GET /api/Search/instruments
- Query matching seeded instrument name → 200, correct result
- Partial match → 200, all matches
- No match → 200, empty list
- Anonymous → 200
- Response contains: id, name, category, ethnicGroups

### GET /api/Search/knowledge-base
- Query matching seeded KB entry title → 200, correct result
- Only Published KB entries returned (not Draft)
- No match → 200, empty list
- Anonymous → 200
- Response contains: id, title, slug, snippet

### GET /api/Search/all (unified search)
- Query matches recordings AND KB entries → 200, both types in results
- Results include sourceType field (Recording / KBEntry)
- Query matches only recordings → KB section empty or absent
- Query matches only KB → recording section empty or absent
- No match for any type → 200 empty or grouped empty response
- Anonymous → 200
- Results ordered by relevance score desc (if score in response)
- Response structure: { recordings: [...], instruments: [...], knowledgeBase: [...] }
  or flat array with sourceType — verify actual shape from DTO

### GET /api/Search/suggestions
- Short query (2+ chars) → 200, array of suggestion strings
- Single char query → 200 empty or 400 per impl
- Empty query → 200 empty or 400
- Anonymous → 200
- Suggestions drawn from recording titles + KB entry titles
- Response is array of strings or objects — verify from DTO

---

### GET /api/search/semantic (384-dim) [Authorize(Roles = "Admin,Expert,Researcher")]
- Valid query [Expert] → 200, results returned
- Valid query [Researcher] → 200
- Valid query [Admin] → 200
- [Contributor] → 403
- Unauthenticated → 401
- IEmbeddingService stub called with query string → verify via spy
- Stub returns float[384] → repository vector search called
- Results ordered by similarity score desc
- No semantic matches → 200 empty list
- Response per result contains: id, title, score, sourceType
- q param missing → 400

### GET /api/search/semantic-768 (768-dim) [Authorize(Roles = "Admin,Expert,Researcher")]
- Valid query [Expert] → 200
- Valid query [Researcher] → 200
- [Contributor] → 403
- Unauthenticated → 401
- IEmbeddingService stub called → verify float[768] dimension used
  (NOT float[384] — assert correct overload/method called)
- Results returned same shape as 384-dim endpoint
- Different embedding method called vs semantic (384) → verify via spy

---

### Seeding Strategy for Search Tests
Before tests run, seed via DbContext:
- 3 Approved recordings with distinct titles including Vietnamese chars
  e.g., "Đàn Tranh Huế", "Đàn Bầu Bắc", "Trống Cơm Nam"
- 1 Pending recording (should NOT appear in keyword search results)
- 1 Draft recording (should NOT appear)
- 2 Published KB entries with searchable titles
- 1 Draft KB entry (should NOT appear in KB search)
- 3 Instruments with distinct names
- Set vector embeddings on seeded recordings to stub float[] values
  so semantic search returns them

### Cross-Endpoint Consistency
- Recording visible in GET /api/Search/songs →
  same recording visible in GET /api/Search/all
- Draft recording absent from /songs → also absent from /all
- Published KB entry in /knowledge-base → also in /all
- Draft KB entry absent from /knowledge-base → also absent from /all

### Pagination (if supported)
- Seed 10+ recordings, query matches all → page/size respected
- Page 1 returns first N, page 2 returns next N
- Beyond last page → empty list

### Relevance Ordering
- Seed recording with title "Đàn Tranh" and another "Đàn Tranh Huế"
- Query "Đàn Tranh" → exact match ranked above partial
  (assert first result id matches exact title recording)

---

## IMPLEMENTATION RULES

1. Inherit ApiTestBase — use GetAsync helpers with query string params
2. Build query strings correctly:
   var url = $"/api/Search/songs?q={Uri.EscapeDataString("Đàn Tranh")}";
   var response = await GetAsync(url);
3. Seed all test data directly via DbContext in test class constructor
   or IAsyncLifetime.InitializeAsync — NOT via API calls
4. IEmbeddingService spy:
   - Expose mock from WebAppFactory
   - For semantic tests: verify .GenerateEmbeddingAsync(query) called once
   - Verify dimension of returned vector matches endpoint (384 vs 768)
   - Reset mock between tests if return value changed
5. Each test independent:
   - Seed fresh data per test OR use shared class-level seed
   - If shared seed: only use read operations, no mutations
6. Naming: Endpoint_Scenario_ExpectedResult
   Example: SearchSongs_WithVietnameseDiacritics_ReturnsMatchingRecording
            SearchAll_WithQueryMatchingBothTypes_ReturnsBothInResponse
            SemanticSearch384_ByContributor_Returns403
            SemanticSearch768_VerifiesCorrectEmbeddingDimensionUsed
            SearchSongs_WithPendingRecording_NotReturnedInResults
            GetSuggestions_WithShortQuery_ReturnsNonEmptyArray
7. Group by nested classes:
   - SearchSongsTests
   - SearchInstrumentsTests
   - SearchKnowledgeBaseTests
   - UnifiedSearchTests
   - SuggestionsTests
   - SemanticSearch384Tests
   - SemanticSearch768Tests
   - ConsistencyTests
   - PaginationTests
   - RelevanceOrderingTests
8. For Vietnamese diacritic test — seed recording with exact title,
   query with same string, assert result id matches:
   body[0].Id.Should().Be(seededRecordingId);
9. For unified search response shape — read raw JSON first:
   var json = await response.Content.ReadAsStringAsync();
   Inspect structure before writing typed deserialization assertion
10. For semantic: stub embedding returns same vector for all queries
    (float[384] filled with 0.1f) — all seeded recordings with non-null
    embedding will be returned; assert count and shape not specific scores

## VERIFICATION
Run: dotnet test --filter "SearchControllerTests"
All tests must be green. Fix errors before proceeding.

Check coverage delta:
- SearchController → ≥ 80% line coverage
- SemanticSearchController → ≥ 80% line coverage
- SemanticSearchService + KnowledgeRetrievalService gain additional coverage

## REPORT
Create: VietTuneArchive.Tests/Report/SEARCH_API_TEST_REPORT.md

Include:
- Date generated
- Total tests written, pass/fail count
- All test method names grouped by category
- Route paths confirmed (list all endpoints from both controllers)
- Role permission matrix:
  (Role × Endpoint → Allowed/Forbidden)
- Seeding strategy used (list what was seeded and why)
- Vietnamese diacritic handling — observed behavior (matched / not matched)
- Approval/status filter verified (table: Status → Visible in which endpoint)
- Embedding spy approach (384 vs 768 dimension verification)
- Unified search response shape observed (document actual JSON structure)
- Relevance ordering approach (how tested)
- Uncovered scenarios and reason
- Estimated SearchController + SemanticSearchController coverage delta
- Deferred cases:
    (real pgvector integration test, fuzzy match threshold tuning,
     search analytics/logging, autocomplete latency test)

Keep concise — no fluff.