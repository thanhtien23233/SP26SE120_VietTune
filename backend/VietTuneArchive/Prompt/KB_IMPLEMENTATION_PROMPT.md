# PROMPT: Implement Knowledge Base Feature — VietTune Archive

## Bối cảnh dự án

VietTune Archive là hệ thống lưu trữ thông minh âm nhạc cổ truyền Việt Nam. Backend sử dụng **C# .NET 8**, kiến trúc **Repository → Service → Controller (REST API)**, database **PostgreSQL** với **Entity Framework Core**. Dự án đã có sẵn khung sườn (authentication, user management, recording, submission...). Bạn chỉ cần **thêm chức năng Knowledge Base** theo đúng pattern hiện có.

---

## 1. DATABASE SCHEMA (đã tồn tại trong DB — KHÔNG tạo migration)

Các bảng đã có sẵn trong database, bạn chỉ cần tạo Entity class map đúng:

### Bảng `KBEntries`
```
Id              : Guid (PK)
Title           : string (max 500, required)
Slug            : string (max 500, required, UNIQUE index)
Content         : string (text, required) — rich-text HTML
Category        : string (max 50, required) — giá trị: "Instrument", "Ceremony", "MusicalTerm", "EthnicGroup", "VocalStyle"
AuthorId        : Guid (FK → Users.Id, ON DELETE RESTRICT)
Status          : int (required) — 0 = Draft, 1 = Published, 2 = Archived
CreatedAt       : DateTime (required)
UpdatedAt       : DateTime? (nullable)
```
Relationships: Author (User), Citations (List<KBCitation>), Revisions (List<KBRevision>)

### Bảng `KBCitations`
```
Id              : Guid (PK)
EntryId         : Guid (FK → KBEntries.Id, ON DELETE CASCADE)
Citation        : string (max 1000, required) — nội dung trích dẫn học thuật
Url             : string? (max 500, nullable) — link tham khảo
```

### Bảng `KBRevisions`
```
Id              : Guid (PK)
EntryId         : Guid (FK → KBEntries.Id, ON DELETE CASCADE)
EditorId        : Guid (FK → Users.Id, ON DELETE RESTRICT)
Content         : string (text, required) — snapshot toàn bộ content tại thời điểm revision
RevisionNote    : string? (max 500, nullable)
CreatedAt       : DateTime (required)
```

---

## 2. ENTITIES — Tạo trong folder `Entities/`

Tạo 3 entity class theo đúng convention dự án (PascalCase property, dùng data annotation hoặc Fluent API tùy pattern hiện có). Tham khảo entity `Recording`, `Submission` đã có để giữ consistency.

```csharp
// KBEntry.cs
public class KBEntry
{
    public Guid Id { get; set; }
    public string Title { get; set; }
    public string Slug { get; set; }
    public string Content { get; set; }
    public string Category { get; set; }
    public Guid AuthorId { get; set; }
    public int Status { get; set; }      // 0=Draft, 1=Published, 2=Archived
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User Author { get; set; }
    public ICollection<KBCitation> Citations { get; set; }
    public ICollection<KBRevision> Revisions { get; set; }
}

// KBCitation.cs
public class KBCitation
{
    public Guid Id { get; set; }
    public Guid EntryId { get; set; }
    public string Citation { get; set; }
    public string? Url { get; set; }

    public KBEntry Entry { get; set; }
}

// KBRevision.cs
public class KBRevision
{
    public Guid Id { get; set; }
    public Guid EntryId { get; set; }
    public Guid EditorId { get; set; }
    public string Content { get; set; }
    public string? RevisionNote { get; set; }
    public DateTime CreatedAt { get; set; }

    public KBEntry Entry { get; set; }
    public User Editor { get; set; }
}
```

Đăng ký DbSet trong `ApplicationDbContext`:
```csharp
public DbSet<KBEntry> KBEntries { get; set; }
public DbSet<KBCitation> KBCitations { get; set; }
public DbSet<KBRevision> KBRevisions { get; set; }
```

Cấu hình Fluent API trong `OnModelCreating` (hoặc file config riêng nếu dự án dùng `IEntityTypeConfiguration<T>`):
- `KBEntry`: HasIndex trên Slug (unique), FK tới Users (RESTRICT)
- `KBCitation`: FK tới KBEntries (CASCADE)
- `KBRevision`: FK tới KBEntries (CASCADE), FK tới Users (RESTRICT)
- Map tên bảng đúng: `.ToTable("KBEntries")`, `.ToTable("KBCitations")`, `.ToTable("KBRevisions")`

---

## 3. DTOs — Tạo trong folder `DTOs/KnowledgeBase/`

### Request DTOs

```csharp
// CreateKBEntryRequest.cs
public class CreateKBEntryRequest
{
    [Required, MaxLength(500)]
    public string Title { get; set; }

    [Required]
    public string Content { get; set; }   // rich-text HTML

    [Required]
    public string Category { get; set; }  // "Instrument"|"Ceremony"|"MusicalTerm"|"EthnicGroup"|"VocalStyle"

    public List<CreateKBCitationRequest>? Citations { get; set; }
}

// UpdateKBEntryRequest.cs
public class UpdateKBEntryRequest
{
    [Required, MaxLength(500)]
    public string Title { get; set; }

    [Required]
    public string Content { get; set; }

    public string Category { get; set; }

    [MaxLength(500)]
    public string? RevisionNote { get; set; }  // ghi chú cho revision
}

// CreateKBCitationRequest.cs
public class CreateKBCitationRequest
{
    [Required, MaxLength(1000)]
    public string Citation { get; set; }

    [MaxLength(500)]
    public string? Url { get; set; }
}

// UpdateKBCitationRequest.cs
public class UpdateKBCitationRequest
{
    [Required, MaxLength(1000)]
    public string Citation { get; set; }

    [MaxLength(500)]
    public string? Url { get; set; }
}

// UpdateKBEntryStatusRequest.cs
public class UpdateKBEntryStatusRequest
{
    [Required]
    public int Status { get; set; }  // 0=Draft, 1=Published, 2=Archived
}

// KBEntryQueryParams.cs  (dùng cho GET list, filter + pagination)
public class KBEntryQueryParams
{
    public string? Category { get; set; }
    public int? Status { get; set; }
    public string? Search { get; set; }       // tìm trên Title + Content
    public string? SortBy { get; set; }       // "title", "createdAt", "updatedAt" (default: "updatedAt")
    public string? SortOrder { get; set; }    // "asc" | "desc" (default: "desc")
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
```

### Response DTOs

```csharp
// KBEntryListItemResponse.cs (dùng cho danh sách, KHÔNG include content đầy đủ)
public class KBEntryListItemResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; }
    public string Slug { get; set; }
    public string Category { get; set; }
    public int Status { get; set; }
    public KBAuthorResponse Author { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

// KBEntryDetailResponse.cs (dùng cho chi tiết, include content + citations + revision info)
public class KBEntryDetailResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; }
    public string Slug { get; set; }
    public string Content { get; set; }
    public string Category { get; set; }
    public int Status { get; set; }
    public KBAuthorResponse Author { get; set; }
    public List<KBCitationResponse> Citations { get; set; }
    public KBRevisionResponse? LatestRevision { get; set; }
    public int RevisionCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

// KBAuthorResponse.cs
public class KBAuthorResponse
{
    public Guid Id { get; set; }
    public string FullName { get; set; }
    public string? AvatarUrl { get; set; }
    public string Role { get; set; }
}

// KBCitationResponse.cs
public class KBCitationResponse
{
    public Guid Id { get; set; }
    public string Citation { get; set; }
    public string? Url { get; set; }
}

// KBRevisionResponse.cs
public class KBRevisionResponse
{
    public Guid Id { get; set; }
    public Guid EntryId { get; set; }
    public KBAuthorResponse Editor { get; set; }
    public string? RevisionNote { get; set; }
    public DateTime CreatedAt { get; set; }
}

// KBRevisionDetailResponse.cs (khi xem content cụ thể của revision)
public class KBRevisionDetailResponse
{
    public Guid Id { get; set; }
    public Guid EntryId { get; set; }
    public string Content { get; set; }
    public string? RevisionNote { get; set; }
    public KBAuthorResponse Editor { get; set; }
    public DateTime CreatedAt { get; set; }
}

// PagedResponse<T> (dùng chung, nếu chưa có thì tạo)
public class PagedResponse<T>
{
    public List<T> Items { get; set; }
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
```

---

## 4. REPOSITORY LAYER — Tạo trong folder `Repositories/`

### Interface: `IKBEntryRepository.cs`

```csharp
public interface IKBEntryRepository
{
    // KBEntry CRUD
    Task<(List<KBEntry> Items, int TotalCount)> GetAllAsync(KBEntryQueryParams queryParams);
    Task<KBEntry?> GetByIdAsync(Guid id);
    Task<KBEntry?> GetBySlugAsync(string slug);
    Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null);
    Task<KBEntry> CreateAsync(KBEntry entry);
    Task UpdateAsync(KBEntry entry);
    Task DeleteAsync(Guid id);

    // KBCitation
    Task<List<KBCitation>> GetCitationsByEntryIdAsync(Guid entryId);
    Task<KBCitation?> GetCitationByIdAsync(Guid citationId);
    Task<KBCitation> CreateCitationAsync(KBCitation citation);
    Task UpdateCitationAsync(KBCitation citation);
    Task DeleteCitationAsync(Guid citationId);

    // KBRevision
    Task<List<KBRevision>> GetRevisionsByEntryIdAsync(Guid entryId);
    Task<KBRevision?> GetRevisionByIdAsync(Guid revisionId);
    Task<KBRevision> CreateRevisionAsync(KBRevision revision);
}
```

### Implementation: `KBEntryRepository.cs`

Logic quan trọng trong `GetAllAsync`:
- Filter theo `Category` (WHERE exact match), `Status` (WHERE exact match), `Search` (WHERE Title ILIKE '%search%' OR Content ILIKE '%search%' — dùng EF.Functions.ILike cho PostgreSQL)
- Sort theo SortBy/SortOrder
- Pagination: Skip/Take
- Include `Author` navigation property
- Return tuple (items, totalCount) để build PagedResponse

Logic cho `GetBySlugAsync`:
- Include Author, Citations, Revisions (với Revision.Editor)
- OrderByDescending Revisions by CreatedAt

---

## 5. SERVICE LAYER — Tạo trong folder `Services/`

### Interface: `IKBEntryService.cs`

```csharp
public interface IKBEntryService
{
    // Entry
    Task<PagedResponse<KBEntryListItemResponse>> GetEntriesAsync(KBEntryQueryParams queryParams);
    Task<KBEntryDetailResponse> GetEntryBySlugAsync(string slug);
    Task<KBEntryDetailResponse> GetEntryByIdAsync(Guid id);
    Task<KBEntryDetailResponse> CreateEntryAsync(Guid currentUserId, CreateKBEntryRequest request);
    Task<KBEntryDetailResponse> UpdateEntryAsync(Guid currentUserId, Guid entryId, UpdateKBEntryRequest request);
    Task UpdateEntryStatusAsync(Guid currentUserId, Guid entryId, UpdateKBEntryStatusRequest request);
    Task DeleteEntryAsync(Guid entryId);

    // Citation
    Task<KBCitationResponse> AddCitationAsync(Guid entryId, CreateKBCitationRequest request);
    Task<KBCitationResponse> UpdateCitationAsync(Guid citationId, UpdateKBCitationRequest request);
    Task DeleteCitationAsync(Guid citationId);

    // Revision
    Task<List<KBRevisionResponse>> GetRevisionsAsync(Guid entryId);
    Task<KBRevisionDetailResponse> GetRevisionDetailAsync(Guid revisionId);
}
```

### Implementation: `KBEntryService.cs`

**Business logic quan trọng:**

#### CreateEntryAsync:
1. Validate `Category` nằm trong danh sách cho phép
2. Generate `Slug` từ Title (dùng helper: lowercase, bỏ dấu tiếng Việt, thay space bằng `-`, loại ký tự đặc biệt). Nếu slug đã tồn tại → append `-2`, `-3`...
3. Tạo KBEntry với Status = 0 (Draft), CreatedAt = DateTime.UtcNow
4. Nếu có Citations trong request → tạo luôn các KBCitation
5. Tạo KBRevision đầu tiên (revision gốc): Content = request.Content, RevisionNote = "Tạo bài viết gốc", EditorId = currentUserId
6. Return KBEntryDetailResponse

#### UpdateEntryAsync:
1. Tìm entry, throw NotFoundException nếu không có
2. Lưu snapshot content hiện tại vào KBRevision MỚI trước khi update (Content = entry content CŨ, hoặc content MỚI — chọn 1 convention nhất quán, recommend lưu content MỚI)
3. Cập nhật entry: Title, Content, Category, UpdatedAt = UtcNow
4. Nếu Title thay đổi → regenerate Slug
5. Tạo KBRevision: Content = request.Content (nội dung mới), RevisionNote = request.RevisionNote, EditorId = currentUserId

#### UpdateEntryStatusAsync:
1. Chỉ Admin hoặc Expert mới được đổi status (kiểm tra role của currentUserId)
2. Validate status transition hợp lệ: Draft(0) → Published(1), Published(1) → Archived(2), Archived(2) → Draft(0)
3. Cập nhật Status, UpdatedAt

#### Slug generation helper:
```csharp
// Ví dụ: "Đàn Bầu - Độc huyền cầm" → "dan-bau-doc-huyen-cam"
private string GenerateSlug(string title)
{
    // 1. Lowercase
    // 2. Bỏ dấu tiếng Việt: dùng string.Normalize(NormalizationForm.FormD) rồi loại Unicode category NonSpacingMark
    // 3. Replace khoảng trắng & ký tự đặc biệt bằng "-"
    // 4. Remove consecutive "-"
    // 5. Trim "-" ở đầu/cuối
}
```

#### Mapping helper:
Tạo private method hoặc dùng AutoMapper (tùy convention dự án) để map Entity → Response DTO. Nếu dự án dùng manual mapping thì viết tay:
```csharp
private KBEntryDetailResponse MapToDetailResponse(KBEntry entry) { ... }
private KBEntryListItemResponse MapToListResponse(KBEntry entry) { ... }
private KBAuthorResponse MapToAuthorResponse(User user) { ... }
```

---

## 6. CONTROLLER — Tạo trong folder `Controllers/`

### `KBEntriesController.cs`

```
Route prefix: api/kb-entries
```

```csharp
[ApiController]
[Route("api/kb-entries")]
public class KBEntriesController : ControllerBase
{
    // GET api/kb-entries?category=Instrument&status=1&search=đàn&page=1&pageSize=20
    [HttpGet]
    [AllowAnonymous]                          // Ai cũng xem được bài Published
    GetEntries([FromQuery] KBEntryQueryParams queryParams)
    → Nếu user chưa login hoặc role = Researcher → tự động filter status=1 (Published only)
    → Nếu user là Expert/Admin → cho phép xem tất cả status
    → Return PagedResponse<KBEntryListItemResponse>

    // GET api/kb-entries/by-slug/{slug}
    [HttpGet("by-slug/{slug}")]
    [AllowAnonymous]
    GetEntryBySlug(string slug)
    → Return KBEntryDetailResponse
    → 404 nếu không tìm thấy
    → Nếu entry status = Draft và user không phải Expert/Admin → 403

    // GET api/kb-entries/{id}
    [HttpGet("{id:guid}")]
    [Authorize]
    GetEntryById(Guid id)
    → Return KBEntryDetailResponse

    // POST api/kb-entries
    [HttpPost]
    [Authorize(Roles = "Expert,Admin")]       // Chỉ Expert và Admin tạo bài
    CreateEntry([FromBody] CreateKBEntryRequest request)
    → Return 201 Created + KBEntryDetailResponse

    // PUT api/kb-entries/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Expert,Admin")]
    UpdateEntry(Guid id, [FromBody] UpdateKBEntryRequest request)
    → Return KBEntryDetailResponse

    // PATCH api/kb-entries/{id}/status
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Expert,Admin")]
    UpdateEntryStatus(Guid id, [FromBody] UpdateKBEntryStatusRequest request)
    → Return 204 NoContent

    // DELETE api/kb-entries/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]              // Chỉ Admin xóa
    DeleteEntry(Guid id)
    → Return 204 NoContent

    // === CITATIONS ===

    // GET api/kb-entries/{entryId}/citations
    [HttpGet("{entryId:guid}/citations")]
    [AllowAnonymous]
    GetCitations(Guid entryId)
    → Return List<KBCitationResponse>

    // POST api/kb-entries/{entryId}/citations
    [HttpPost("{entryId:guid}/citations")]
    [Authorize(Roles = "Expert,Admin")]
    AddCitation(Guid entryId, [FromBody] CreateKBCitationRequest request)
    → Return 201 Created + KBCitationResponse

    // PUT api/kb-entries/citations/{citationId}
    [HttpPut("citations/{citationId:guid}")]
    [Authorize(Roles = "Expert,Admin")]
    UpdateCitation(Guid citationId, [FromBody] UpdateKBCitationRequest request)
    → Return KBCitationResponse

    // DELETE api/kb-entries/citations/{citationId}
    [HttpDelete("citations/{citationId:guid}")]
    [Authorize(Roles = "Expert,Admin")]
    DeleteCitation(Guid citationId)
    → Return 204 NoContent

    // === REVISIONS ===

    // GET api/kb-entries/{entryId}/revisions
    [HttpGet("{entryId:guid}/revisions")]
    [Authorize(Roles = "Expert,Admin")]
    GetRevisions(Guid entryId)
    → Return List<KBRevisionResponse>

    // GET api/kb-entries/revisions/{revisionId}
    [HttpGet("revisions/{revisionId:guid}")]
    [Authorize(Roles = "Expert,Admin")]
    GetRevisionDetail(Guid revisionId)
    → Return KBRevisionDetailResponse (bao gồm Content để xem/so sánh)
}
```

---

## 7. ĐĂNG KÝ DEPENDENCY INJECTION

Trong `Program.cs` hoặc file DI configuration:

```csharp
builder.Services.AddScoped<IKBEntryRepository, KBEntryRepository>();
builder.Services.AddScoped<IKBEntryService, KBEntryService>();
```

---

## 8. VALIDATION & ERROR HANDLING

- Category phải nằm trong: `["Instrument", "Ceremony", "MusicalTerm", "EthnicGroup", "VocalStyle"]`
- Slug phải unique — nếu trùng thì auto-append suffix
- Status transition phải hợp lệ (không cho nhảy từ Draft thẳng sang Archived)
- Entry không tồn tại → return 404 với message rõ ràng
- User không có quyền → return 403
- Dùng exception handling middleware hoặc custom exception class theo pattern hiện có trong dự án (xem cách các controller khác throw NotFoundException, ForbiddenException...)

---

## 9. LƯU Ý PATTERN

- **Tham khảo code hiện có**: Xem cách `RecordingRepository`, `SubmissionService`, `RecordingsController` được implement để giữ đúng coding convention (naming, error handling, response format, authentication pattern)
- **Dùng đúng tên bảng**: EF Core cần map đúng `"KBEntries"`, `"KBCitations"`, `"KBRevisions"` (có dấu ngoặc kép trong PostgreSQL vì tên viết hoa)
- **UUID/Guid**: Tất cả Id dùng `Guid.NewGuid()` khi tạo mới
- **DateTime**: Dùng `DateTime.UtcNow` cho tất cả timestamps
- **Không tạo migration**: Bảng đã tồn tại trong DB, chỉ cần tạo Entity + DbSet + Fluent config map đúng schema

---

## 10. CẤU TRÚC FILE CẦN TẠO

```
Entities/
  ├── KBEntry.cs
  ├── KBCitation.cs
  └── KBRevision.cs

DTOs/KnowledgeBase/
  ├── CreateKBEntryRequest.cs
  ├── UpdateKBEntryRequest.cs
  ├── UpdateKBEntryStatusRequest.cs
  ├── CreateKBCitationRequest.cs
  ├── UpdateKBCitationRequest.cs
  ├── KBEntryQueryParams.cs
  ├── KBEntryListItemResponse.cs
  ├── KBEntryDetailResponse.cs
  ├── KBAuthorResponse.cs
  ├── KBCitationResponse.cs
  ├── KBRevisionResponse.cs
  └── KBRevisionDetailResponse.cs

Repositories/
  ├── IKBEntryRepository.cs
  └── KBEntryRepository.cs

Services/
  ├── IKBEntryService.cs
  └── KBEntryService.cs

Controllers/
  └── KBEntriesController.cs
```

Tổng cộng: 18 file cần tạo + sửa `ApplicationDbContext.cs` và `Program.cs`.
