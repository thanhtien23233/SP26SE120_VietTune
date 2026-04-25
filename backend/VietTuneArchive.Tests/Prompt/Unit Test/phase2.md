You are implementing unit tests for Phase 1 of VietTuneArchive.Tests.
Focus: RecordingService — specifically UploadRecordInfo which has 
Crap Score 3192 / Cyclomatic Complexity 56. This is the highest-risk 
untested method in the codebase.

## CONTEXT — read these files first before writing any test
- VietTuneArchive.Application/Services/RecordingService.cs  ← PRIMARY
- VietTuneArchive.Application/IServices/IRecordingService.cs
- VietTuneArchive.Application/DTOs/Recording/ (all files)
- VietTuneArchive.Domain/Entities/Recording.cs
- VietTuneArchive.Domain/Enums/ (RecordingStatus, ApprovalStatus, or equivalent)
- VietTuneArchive.Application/IRepositories/IRecordingRepository.cs
- VietTuneArchive.Application/IRepositories/ (IEthnicGroupRepository,
  IInstrumentRepository, ICeremonyRepository, IProvinceRepository,
  IMusicalScaleRepository, IVocalStyleRepository — whichever are used)
- VietTuneArchive.Application/IServices/IEmbeddingService.cs

IMPORTANT: UploadRecordInfo has cyclomatic complexity 56 — meaning ~56 
independent branches. Read the full method carefully, map every if/switch/
null-check branch, then write tests to cover each path.

## TARGET FILE
VietTuneArchive.Tests/Unit/Services/RecordingServiceTests.cs

## TEST CASES TO IMPLEMENT

### UploadRecordInfo — Happy Path
- Valid full input → Recording persisted with all fields mapped correctly
- Valid input with optional fields null → persisted without error
- After successful upload → IEmbeddingService.GenerateEmbeddingForRecordingAsync
  called exactly once with correct recordingId
- Returned DTO matches input data (title, description, ethnicGroupId, etc.)

### UploadRecordInfo — FK Validation (mock repo returns null = not found)
- Invalid EthnicGroupId → returns not found / validation error
- Invalid InstrumentId (one or more in list) → returns error
- Invalid CeremonyId → returns error
- Invalid ProvinceId / DistrictId / CommuneId → returns error
- Invalid MusicalScaleId → returns error
- Invalid VocalStyleId → returns error
- Invalid SubmissionId (if linked) → returns error
- All FK valid → passes through without error

### UploadRecordInfo — Field Validation
- Missing required Title → validation error
- Missing RecordingDate → validation error
- Missing EthnicGroupId → validation error
- Duration <= 0 → validation error (if rule exists)
- GPS coordinates out of range → validation error (if rule exists)
- Tags list empty vs populated → both handled without error

### UploadRecordInfo — Duplicate Detection
- Same title + same EthnicGroupId already exists → rejected (if rule exists)
- Same title + different EthnicGroupId → allowed
- If no duplicate rule → document this assumption in test comment

### UploadRecordInfo — Instrument List Handling
(High complexity — likely has loops/branches per instrument)
- Empty instrument list → accepted or rejected per rule
- Single instrument → persisted correctly
- Multiple instruments → all persisted as junction records
- Duplicate instrumentId in list → deduplicated or rejected

### UploadRecordInfo — Status Initialization
- New recording created with correct initial RecordingStatus
- New recording created with correct initial ApprovalStatus
- IsPublic defaults to correct value

### UploadRecordInfo — Embedding Failure Resilience
- EmbeddingService throws exception → recording still saved (if fire-and-forget)
- OR → recording save rolled back (if transactional) — assert per actual impl

### RecordingService — Other Methods
After covering UploadRecordInfo, cover remaining methods in priority order:

GetRecordingById:
- Existing id → returns correct DTO
- Non-existent id → not found error
- Soft-deleted recording → not returned (if soft delete exists)

SearchRecordings / GetAll:
- Filter by ethnicGroupId → correct subset
- Filter by instrumentId → correct subset
- Filter by ceremonyId → correct subset
- Filter by province → correct subset
- Filter by approvalStatus → correct subset
- Combined filters → intersection returned
- No filter → all returned with pagination
- Empty result → empty list, not error
- Pagination: page/size respected

UpdateRecording:
- Valid update → fields changed, updatedAt refreshed
- Non-existent id → not found error
- Unauthorized user (not owner, not admin) → forbidden

DeleteRecording:
- Soft delete → isDeleted=true, not removed from DB
- Hard delete (if exists) → removed
- Non-existent id → not found error
- Unauthorized → forbidden

## IMPLEMENTATION RULES

1. Use xUnit + Moq + FluentAssertions only
2. Mock ALL external dependencies:
   - IRecordingRepository
   - IEthnicGroupRepository, IInstrumentRepository, ICeremonyRepository
   - IProvinceRepository (+ District/Commune if separate)
   - IMusicalScaleRepository, IVocalStyleRepository
   - IEmbeddingService
   - ISubmissionRepository (if FK checked)
   - IUserRepository (for ownership/role checks)
3. Arrange / Act / Assert with comments
4. Naming: MethodName_Scenario_ExpectedResult
   Example: UploadRecordInfo_WithInvalidEthnicGroupId_ReturnsNotFoundError
            UploadRecordInfo_WithMultipleInstruments_PersistsAllJunctionRecords
            UploadRecordInfo_WhenEmbeddingThrows_RecordingStillSaved
5. Group by nested classes:
   - HappyPath
   - FKValidation
   - FieldValidation
   - DuplicateDetection
   - InstrumentListHandling
   - StatusInitialization
   - EmbeddingResilience
   - GetById / Search / Update / Delete
6. Create RecordingBuilder helper in TestHelpers/Builders/RecordingBuilder.cs
   for constructing valid UploadRecordingRequest and Recording entities
7. For branch coverage: after writing tests, count how many of the 56 
   cyclomatic branches are covered. Target ≥ 70% branch coverage on 
   UploadRecordInfo specifically.

## VERIFICATION STEP
After all tests written and passing:

Run coverage specifically for RecordingService:
  dotnet test --collect:"XPlat Code Coverage"
  
Then run reportgenerator and check:
- RecordingService line coverage %
- RecordingService branch coverage %
- UploadRecordInfo branch coverage specifically

All tests must be green before proceeding.

## REPORT
Create VietTuneArchive.Tests/Report/RECORDING_TEST_REPORT.md

Include:
- Date generated
- Total tests written
- UploadRecordInfo: branches identified vs branches covered
- Line coverage delta (before vs after this phase)
- All test method names grouped by category
- Assumptions made (FK rules, duplicate logic, embedding resilience)
- Uncovered branches and reason (too complex to mock, external dep, etc.)
- Estimated overall solution coverage after this phase
- Suggested Phase 2 targets based on remaining Risk Hotspots

Keep report concise — no fluff.