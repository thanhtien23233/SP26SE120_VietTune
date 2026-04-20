# VectorEmbeddings Implementation Guide — AI Agent Script

## Mục tiêu

Implement các service và API liên quan đến bảng `VectorEmbeddings` để hỗ trợ **semantic search** cho hệ thống VietTune Archive. Project sử dụng **.NET (C#) + EF Core + PostgreSQL**. Các API khác đã có sẵn, chỉ cần thêm phần liên quan đến vector embeddings.

---

## 1. Tổng quan Database Schema

Bảng `VectorEmbeddings` đã tồn tại trong database:

```sql
CREATE TABLE public."VectorEmbeddings" (
    "Id" uuid NOT NULL,
    "RecordingId" uuid NOT NULL,        -- FK → Recordings.Id (ON DELETE CASCADE)
    "EmbeddingJson" text NOT NULL,       -- JSON array of floats: "[0.012, -0.034, ...]"
    "ModelVersion" varchar(100) NOT NULL, -- e.g. "text-embedding-3-small"
    "CreatedAt" timestamp NOT NULL
);
```

Bảng liên quan cần Include khi build text:
- `Recordings` (Title, Description, LyricsVietnamese, PerformanceContext, PerformerName)
- `EthnicGroups` (Name) — qua `Recordings.EthnicGroupId`
- `Ceremonies` (Name) — qua `Recordings.CeremonyId`
- `Instruments` (Name) — qua junction table `RecordingInstruments`
- `VocalStyles` (Name) — qua `Recordings.VocalStyleId`
- `MusicalScales` (Name) — qua `Recordings.MusicalScaleId`
- `Communes` → `Districts` → `Provinces` — qua `Recordings.CommuneId`
- `Tags` (Name) — qua junction table `RecordingTags`

---

## 2. Entity Model

### 2.1. Kiểm tra Entity `VectorEmbedding` đã có chưa

Tìm trong folder `Entities/` hoặc `Models/`. Nếu chưa có, tạo mới:

```csharp
public class VectorEmbedding
{
    public Guid Id { get; set; }
    public Guid RecordingId { get; set; }
    public string EmbeddingJson { get; set; } = string.Empty;
    public string ModelVersion { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Navigation
    public Recording Recording { get; set; } = null!;
}
```

### 2.2. Kiểm tra DbContext đã có DbSet chưa

Trong `ApplicationDbContext` (hoặc tên tương đương), đảm bảo có:

```csharp
public DbSet<VectorEmbedding> VectorEmbeddings { get; set; }
```

Và cấu hình EF trong `OnModelCreating`:

```csharp
modelBuilder.Entity<VectorEmbedding>(entity =>
{
    entity.ToTable("VectorEmbeddings");
    entity.HasKey(e => e.Id);
    entity.HasOne(e => e.Recording)
          .WithMany()
          .HasForeignKey(e => e.RecordingId)
          .OnDelete(DeleteBehavior.Cascade);
    entity.HasIndex(e => e.RecordingId);
});
```

---

## 3. Cấu hình OpenAI

### 3.1. appsettings.json

Thêm section cấu hình:

```json
{
  "OpenAI": {
    "ApiKey": "sk-...",
    "EmbeddingModel": "text-embedding-3-small",
    "EmbeddingDimensions": 1536,
    "MaxTokensPerRequest": 8191
  }
}
```

### 3.2. Options class

```csharp
public class OpenAIOptions
{
    public const string SectionName = "OpenAI";
    public string ApiKey { get; set; } = string.Empty;
    public string EmbeddingModel { get; set; } = "text-embedding-3-small";
    public int EmbeddingDimensions { get; set; } = 1536;
    public int MaxTokensPerRequest { get; set; } = 8191;
}
```

### 3.3. Đăng ký trong Program.cs / Startup.cs

```csharp
builder.Services.Configure<OpenAIOptions>(
    builder.Configuration.GetSection(OpenAIOptions.SectionName));
```

---

## 4. Services cần tạo

### 4.1. IOpenAIEmbeddingService — Gọi OpenAI Embedding API

**File:** `Services/IOpenAIEmbeddingService.cs`

```csharp
public interface IOpenAIEmbeddingService
{
    /// <summary>
    /// Gọi OpenAI API để sinh embedding vector từ text.
    /// </summary>
    Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default);

    /// <summary>
    /// Sinh embedding cho nhiều text cùng lúc (batch).
    /// </summary>
    Task<List<float[]>> GetEmbeddingBatchAsync(List<string> texts, CancellationToken ct = default);
}
```

**File:** `Services/OpenAIEmbeddingService.cs`

Implement chi tiết:

```csharp
public class OpenAIEmbeddingService : IOpenAIEmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly OpenAIOptions _options;
    private readonly ILogger<OpenAIEmbeddingService> _logger;

    public OpenAIEmbeddingService(
        HttpClient httpClient,
        IOptions<OpenAIOptions> options,
        ILogger<OpenAIEmbeddingService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        _httpClient.BaseAddress = new Uri("https://api.openai.com/v1/");
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _options.ApiKey);
    }

    public async Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default)
    {
        var result = await GetEmbeddingBatchAsync(new List<string> { text }, ct);
        return result[0];
    }

    public async Task<List<float[]>> GetEmbeddingBatchAsync(
        List<string> texts, CancellationToken ct = default)
    {
        var requestBody = new
        {
            model = _options.EmbeddingModel,
            input = texts,
            dimensions = _options.EmbeddingDimensions
        };

        var response = await _httpClient.PostAsJsonAsync("embeddings", requestBody, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content
            .ReadFromJsonAsync<OpenAIEmbeddingResponse>(cancellationToken: ct);

        return result!.Data
            .OrderBy(d => d.Index)
            .Select(d => d.Embedding)
            .ToList();
    }
}

// Response DTOs
public class OpenAIEmbeddingResponse
{
    public List<OpenAIEmbeddingData> Data { get; set; } = new();
    public OpenAIUsage Usage { get; set; } = new();
}

public class OpenAIEmbeddingData
{
    public int Index { get; set; }
    public float[] Embedding { get; set; } = Array.Empty<float>();
}

public class OpenAIUsage
{
    public int PromptTokens { get; set; }
    public int TotalTokens { get; set; }
}
```

**Đăng ký DI:**

```csharp
builder.Services.AddHttpClient<IOpenAIEmbeddingService, OpenAIEmbeddingService>();
```

---

### 4.2. IEmbeddingTextBuilder — Build searchable text từ Recording

**File:** `Services/IEmbeddingTextBuilder.cs`

```csharp
public interface IEmbeddingTextBuilder
{
    /// <summary>
    /// Ghép metadata của Recording thành một chuỗi text tối ưu cho embedding.
    /// Recording phải được Include đầy đủ các navigation properties.
    /// </summary>
    string BuildSearchableText(Recording recording);
}
```

**File:** `Services/EmbeddingTextBuilder.cs`

```csharp
public class EmbeddingTextBuilder : IEmbeddingTextBuilder
{
    public string BuildSearchableText(Recording recording)
    {
        var parts = new List<string>();

        // Tiêu đề và mô tả
        if (!string.IsNullOrWhiteSpace(recording.Title))
            parts.Add($"Title: {recording.Title}");

        if (!string.IsNullOrWhiteSpace(recording.Description))
            parts.Add($"Description: {recording.Description}");

        // Dân tộc
        if (recording.EthnicGroup != null)
            parts.Add($"Ethnic group: {recording.EthnicGroup.Name}");

        // Nghi lễ / bối cảnh
        if (recording.Ceremony != null)
            parts.Add($"Ceremony: {recording.Ceremony.Name}");

        if (!string.IsNullOrWhiteSpace(recording.PerformanceContext))
            parts.Add($"Performance context: {recording.PerformanceContext}");

        // Nhạc cụ
        var instruments = recording.RecordingInstruments?
            .Select(ri => ri.Instrument?.Name)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .ToList();
        if (instruments?.Any() == true)
            parts.Add($"Instruments: {string.Join(", ", instruments)}");

        // Phong cách hát
        if (recording.VocalStyle != null)
            parts.Add($"Vocal style: {recording.VocalStyle.Name}");

        // Thang âm
        if (recording.MusicalScale != null)
            parts.Add($"Musical scale: {recording.MusicalScale.Name}");

        // Địa lý
        var location = BuildLocationString(recording);
        if (!string.IsNullOrWhiteSpace(location))
            parts.Add($"Location: {location}");

        // Người biểu diễn
        if (!string.IsNullOrWhiteSpace(recording.PerformerName))
            parts.Add($"Performer: {recording.PerformerName}");

        // Lời bài hát (tiếng Việt — giới hạn 500 ký tự để không vượt token limit)
        if (!string.IsNullOrWhiteSpace(recording.LyricsVietnamese))
        {
            var lyrics = recording.LyricsVietnamese.Length > 500
                ? recording.LyricsVietnamese[..500]
                : recording.LyricsVietnamese;
            parts.Add($"Lyrics: {lyrics}");
        }

        // Tags
        var tags = recording.RecordingTags?
            .Select(rt => rt.Tag?.Name)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .ToList();
        if (tags?.Any() == true)
            parts.Add($"Tags: {string.Join(", ", tags)}");

        return string.Join(". ", parts);
    }

    private string BuildLocationString(Recording recording)
    {
        var locationParts = new List<string>();

        if (recording.Commune != null)
        {
            locationParts.Add(recording.Commune.Name);

            if (recording.Commune.District != null)
            {
                locationParts.Add(recording.Commune.District.Name);

                if (recording.Commune.District.Province != null)
                    locationParts.Add(recording.Commune.District.Province.Name);
            }
        }

        return string.Join(", ", locationParts);
    }
}
```

**Đăng ký DI:**

```csharp
builder.Services.AddScoped<IEmbeddingTextBuilder, EmbeddingTextBuilder>();
```

---

### 4.3. IVectorEmbeddingService — CRUD + Sync logic

**File:** `Services/IVectorEmbeddingService.cs`

```csharp
public interface IVectorEmbeddingService
{
    /// <summary>
    /// Sinh embedding cho 1 Recording và lưu vào DB.
    /// Nếu đã có embedding cũ thì thay thế.
    /// </summary>
    Task<VectorEmbedding> GenerateAndSaveAsync(Guid recordingId, CancellationToken ct = default);

    /// <summary>
    /// Sync embedding cho tất cả Recording chưa có embedding.
    /// Trả về số lượng đã sync.
    /// </summary>
    Task<int> SyncAllMissingAsync(CancellationToken ct = default);

    /// <summary>
    /// Sync lại embedding cho tất cả Recording (kể cả đã có).
    /// Dùng khi đổi model version.
    /// </summary>
    Task<int> ResyncAllAsync(string? modelVersion = null, CancellationToken ct = default);

    /// <summary>
    /// Xóa embedding của 1 Recording.
    /// </summary>
    Task DeleteByRecordingIdAsync(Guid recordingId, CancellationToken ct = default);

    /// <summary>
    /// Lấy thống kê: tổng recordings, đã có embedding, chưa có.
    /// </summary>
    Task<EmbeddingSyncStatus> GetSyncStatusAsync(CancellationToken ct = default);
}

public class EmbeddingSyncStatus
{
    public int TotalRecordings { get; set; }
    public int WithEmbedding { get; set; }
    public int WithoutEmbedding { get; set; }
    public string CurrentModelVersion { get; set; } = string.Empty;
}
```

**File:** `Services/VectorEmbeddingService.cs`

```csharp
public class VectorEmbeddingService : IVectorEmbeddingService
{
    private readonly ApplicationDbContext _db;
    private readonly IOpenAIEmbeddingService _embeddingService;
    private readonly IEmbeddingTextBuilder _textBuilder;
    private readonly OpenAIOptions _options;
    private readonly ILogger<VectorEmbeddingService> _logger;

    public VectorEmbeddingService(
        ApplicationDbContext db,
        IOpenAIEmbeddingService embeddingService,
        IEmbeddingTextBuilder textBuilder,
        IOptions<OpenAIOptions> options,
        ILogger<VectorEmbeddingService> logger)
    {
        _db = db;
        _embeddingService = embeddingService;
        _textBuilder = textBuilder;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<VectorEmbedding> GenerateAndSaveAsync(
        Guid recordingId, CancellationToken ct = default)
    {
        // 1. Load recording với đầy đủ navigation properties
        var recording = await GetRecordingWithIncludes(recordingId, ct);
        if (recording == null)
            throw new KeyNotFoundException($"Recording {recordingId} not found.");

        // 2. Build text
        var text = _textBuilder.BuildSearchableText(recording);
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException(
                $"Recording {recordingId} has no metadata to generate embedding.");

        // 3. Gọi OpenAI
        var embeddingVector = await _embeddingService.GetEmbeddingAsync(text, ct);

        // 4. Xóa embedding cũ nếu có
        var existing = await _db.VectorEmbeddings
            .FirstOrDefaultAsync(v => v.RecordingId == recordingId, ct);
        if (existing != null)
            _db.VectorEmbeddings.Remove(existing);

        // 5. Tạo mới
        var vectorEmbedding = new VectorEmbedding
        {
            Id = Guid.NewGuid(),
            RecordingId = recordingId,
            EmbeddingJson = JsonSerializer.Serialize(embeddingVector),
            ModelVersion = _options.EmbeddingModel,
            CreatedAt = DateTime.UtcNow
        };

        _db.VectorEmbeddings.Add(vectorEmbedding);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Generated embedding for Recording {RecordingId}, vector dim={Dim}",
            recordingId, embeddingVector.Length);

        return vectorEmbedding;
    }

    public async Task<int> SyncAllMissingAsync(CancellationToken ct = default)
    {
        // Lấy các Recording chưa có embedding
        var recordingIds = await _db.Recordings
            .Where(r => r.Status == 1) // chỉ sync recording đã published
            .Where(r => !_db.VectorEmbeddings.Any(v => v.RecordingId == r.Id))
            .Select(r => r.Id)
            .ToListAsync(ct);

        _logger.LogInformation("Found {Count} recordings without embeddings", recordingIds.Count);

        int synced = 0;
        foreach (var id in recordingIds)
        {
            try
            {
                await GenerateAndSaveAsync(id, ct);
                synced++;

                // Rate limit: delay 200ms giữa các request
                await Task.Delay(200, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Failed to generate embedding for Recording {RecordingId}", id);
            }
        }

        return synced;
    }

    public async Task<int> ResyncAllAsync(
        string? modelVersion = null, CancellationToken ct = default)
    {
        var recordingIds = await _db.Recordings
            .Where(r => r.Status == 1)
            .Select(r => r.Id)
            .ToListAsync(ct);

        int synced = 0;
        foreach (var id in recordingIds)
        {
            try
            {
                await GenerateAndSaveAsync(id, ct);
                synced++;
                await Task.Delay(200, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Failed to resync embedding for Recording {RecordingId}", id);
            }
        }

        return synced;
    }

    public async Task DeleteByRecordingIdAsync(
        Guid recordingId, CancellationToken ct = default)
    {
        var existing = await _db.VectorEmbeddings
            .FirstOrDefaultAsync(v => v.RecordingId == recordingId, ct);
        if (existing != null)
        {
            _db.VectorEmbeddings.Remove(existing);
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<EmbeddingSyncStatus> GetSyncStatusAsync(
        CancellationToken ct = default)
    {
        var totalRecordings = await _db.Recordings.CountAsync(ct);
        var withEmbedding = await _db.VectorEmbeddings.CountAsync(ct);

        return new EmbeddingSyncStatus
        {
            TotalRecordings = totalRecordings,
            WithEmbedding = withEmbedding,
            WithoutEmbedding = totalRecordings - withEmbedding,
            CurrentModelVersion = _options.EmbeddingModel
        };
    }

    private async Task<Recording?> GetRecordingWithIncludes(
        Guid recordingId, CancellationToken ct)
    {
        return await _db.Recordings
            .Include(r => r.EthnicGroup)
            .Include(r => r.Ceremony)
            .Include(r => r.VocalStyle)
            .Include(r => r.MusicalScale)
            .Include(r => r.Commune)
                .ThenInclude(c => c!.District)
                    .ThenInclude(d => d.Province)
            .Include(r => r.RecordingInstruments)
                .ThenInclude(ri => ri.Instrument)
            .Include(r => r.RecordingTags)
                .ThenInclude(rt => rt.Tag)
            .FirstOrDefaultAsync(r => r.Id == recordingId, ct);
    }
}
```

**Đăng ký DI:**

```csharp
builder.Services.AddScoped<IVectorEmbeddingService, VectorEmbeddingService>();
```

---

### 4.4. ISemanticSearchService — Tìm kiếm ngữ nghĩa

**File:** `Services/ISemanticSearchService.cs`

```csharp
public interface ISemanticSearchService
{
    /// <summary>
    /// Tìm kiếm Recording theo ngữ nghĩa.
    /// Trả về danh sách Recording kèm điểm similarity, sắp xếp từ cao đến thấp.
    /// </summary>
    Task<List<SemanticSearchResult>> SearchAsync(
        string query,
        int topK = 10,
        float minScore = 0.5f,
        CancellationToken ct = default);
}

public class SemanticSearchResult
{
    public Guid RecordingId { get; set; }
    public string Title { get; set; } = string.Empty;
    public float SimilarityScore { get; set; }

    // Thêm các field hiển thị cần thiết
    public string? EthnicGroupName { get; set; }
    public string? CeremonyName { get; set; }
    public string? PerformerName { get; set; }
    public List<string> InstrumentNames { get; set; } = new();
}
```

**File:** `Services/SemanticSearchService.cs`

```csharp
public class SemanticSearchService : ISemanticSearchService
{
    private readonly ApplicationDbContext _db;
    private readonly IOpenAIEmbeddingService _embeddingService;
    private readonly ILogger<SemanticSearchService> _logger;

    public SemanticSearchService(
        ApplicationDbContext db,
        IOpenAIEmbeddingService embeddingService,
        ILogger<SemanticSearchService> logger)
    {
        _db = db;
        _embeddingService = embeddingService;
        _logger = logger;
    }

    public async Task<List<SemanticSearchResult>> SearchAsync(
        string query,
        int topK = 10,
        float minScore = 0.5f,
        CancellationToken ct = default)
    {
        // 1. Sinh embedding cho query
        var queryVector = await _embeddingService.GetEmbeddingAsync(query, ct);

        // 2. Load tất cả embeddings từ DB
        //    (Với dữ liệu lớn nên dùng pgvector hoặc vector DB riêng)
        var allEmbeddings = await _db.VectorEmbeddings
            .Select(v => new { v.RecordingId, v.EmbeddingJson })
            .ToListAsync(ct);

        // 3. Tính cosine similarity
        var scored = new List<(Guid RecordingId, float Score)>();
        foreach (var item in allEmbeddings)
        {
            var vector = JsonSerializer.Deserialize<float[]>(item.EmbeddingJson);
            if (vector == null) continue;

            var score = CosineSimilarity(queryVector, vector);
            if (score >= minScore)
                scored.Add((item.RecordingId, score));
        }

        // 4. Sắp xếp và lấy top K
        var topResults = scored
            .OrderByDescending(s => s.Score)
            .Take(topK)
            .ToList();

        if (!topResults.Any())
            return new List<SemanticSearchResult>();

        // 5. Load recording details cho kết quả
        var recordingIds = topResults.Select(r => r.RecordingId).ToList();
        var recordings = await _db.Recordings
            .Include(r => r.EthnicGroup)
            .Include(r => r.Ceremony)
            .Include(r => r.RecordingInstruments)
                .ThenInclude(ri => ri.Instrument)
            .Where(r => recordingIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, ct);

        // 6. Map kết quả
        return topResults
            .Where(t => recordings.ContainsKey(t.RecordingId))
            .Select(t =>
            {
                var rec = recordings[t.RecordingId];
                return new SemanticSearchResult
                {
                    RecordingId = t.RecordingId,
                    Title = rec.Title ?? "Untitled",
                    SimilarityScore = t.Score,
                    EthnicGroupName = rec.EthnicGroup?.Name,
                    CeremonyName = rec.Ceremony?.Name,
                    PerformerName = rec.PerformerName,
                    InstrumentNames = rec.RecordingInstruments?
                        .Select(ri => ri.Instrument?.Name ?? "")
                        .Where(n => !string.IsNullOrEmpty(n))
                        .ToList() ?? new()
                };
            })
            .ToList();
    }

    /// <summary>
    /// Tính cosine similarity giữa 2 vector.
    /// Kết quả từ -1 đến 1, càng gần 1 càng giống nhau.
    /// </summary>
    private static float CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0f;

        float dotProduct = 0f, normA = 0f, normB = 0f;
        for (int i = 0; i < a.Length; i++)
        {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        var denominator = MathF.Sqrt(normA) * MathF.Sqrt(normB);
        return denominator == 0 ? 0f : dotProduct / denominator;
    }
}
```

**Đăng ký DI:**

```csharp
builder.Services.AddScoped<ISemanticSearchService, SemanticSearchService>();
```

---

## 5. API Controllers

### 5.1. VectorSyncController — Admin quản lý sync

**File:** `Controllers/VectorSyncController.cs`

```csharp
[ApiController]
[Route("api/vector-sync")]
[Authorize(Roles = "Admin")]
public class VectorSyncController : ControllerBase
{
    private readonly IVectorEmbeddingService _vectorService;

    public VectorSyncController(IVectorEmbeddingService vectorService)
    {
        _vectorService = vectorService;
    }

    /// <summary>
    /// GET /api/vector-sync/status
    /// Xem trạng thái sync: bao nhiêu recording đã/chưa có embedding.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        var status = await _vectorService.GetSyncStatusAsync(ct);
        return Ok(status);
    }

    /// <summary>
    /// POST /api/vector-sync/all
    /// Sync embedding cho tất cả recording chưa có. Chạy background nếu dữ liệu lớn.
    /// </summary>
    [HttpPost("all")]
    public async Task<IActionResult> SyncAllMissing(CancellationToken ct)
    {
        var count = await _vectorService.SyncAllMissingAsync(ct);
        return Ok(new { synced = count });
    }

    /// <summary>
    /// POST /api/vector-sync/resync
    /// Xóa tất cả embedding cũ và sinh lại. Dùng khi đổi model.
    /// </summary>
    [HttpPost("resync")]
    public async Task<IActionResult> ResyncAll(CancellationToken ct)
    {
        var count = await _vectorService.ResyncAllAsync(ct: ct);
        return Ok(new { resynced = count });
    }

    /// <summary>
    /// POST /api/vector-sync/{recordingId}
    /// Sinh embedding cho 1 recording cụ thể.
    /// </summary>
    [HttpPost("{recordingId:guid}")]
    public async Task<IActionResult> SyncOne(Guid recordingId, CancellationToken ct)
    {
        try
        {
            var result = await _vectorService.GenerateAndSaveAsync(recordingId, ct);
            return Ok(new
            {
                recordingId = result.RecordingId,
                modelVersion = result.ModelVersion,
                createdAt = result.CreatedAt
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// DELETE /api/vector-sync/{recordingId}
    /// Xóa embedding của 1 recording.
    /// </summary>
    [HttpDelete("{recordingId:guid}")]
    public async Task<IActionResult> Delete(Guid recordingId, CancellationToken ct)
    {
        await _vectorService.DeleteByRecordingIdAsync(recordingId, ct);
        return NoContent();
    }
}
```

### 5.2. SemanticSearchController — Public search API

**File:** `Controllers/SemanticSearchController.cs`

```csharp
[ApiController]
[Route("api/search")]
public class SemanticSearchController : ControllerBase
{
    private readonly ISemanticSearchService _searchService;

    public SemanticSearchController(ISemanticSearchService searchService)
    {
        _searchService = searchService;
    }

    /// <summary>
    /// GET /api/search/semantic?q=...&topK=10&minScore=0.5
    /// Tìm kiếm recording theo ngữ nghĩa.
    /// </summary>
    [HttpGet("semantic")]
    public async Task<IActionResult> SemanticSearch(
        [FromQuery(Name = "q")] string query,
        [FromQuery] int topK = 10,
        [FromQuery] float minScore = 0.5f,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest(new { message = "Query parameter 'q' is required." });

        topK = Math.Clamp(topK, 1, 50);
        minScore = Math.Clamp(minScore, 0f, 1f);

        var results = await _searchService.SearchAsync(query, topK, minScore, ct);

        return Ok(new
        {
            query,
            totalResults = results.Count,
            results
        });
    }
}
```

---

## 6. Hook vào flow hiện tại

### 6.1. Tự động sinh embedding khi Recording được publish

Tìm chỗ Recording thay đổi status sang Published (ví dụ trong `SubmissionService`, `ReviewService`, hoặc nơi gọi `SaveChangesAsync` sau khi update `Recording.Status`).

Thêm gọi `IVectorEmbeddingService.GenerateAndSaveAsync()` sau khi recording được approved/published:

```csharp
// Ví dụ: trong flow approve submission
public async Task ApproveSubmissionAsync(Guid submissionId, ...)
{
    // ... logic approve hiện tại ...

    recording.Status = (int)RecordingStatus.Published;
    await _db.SaveChangesAsync();

    // >>> THÊM: Sinh embedding sau khi publish <<<
    try
    {
        await _vectorEmbeddingService.GenerateAndSaveAsync(recording.Id);
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex,
            "Failed to generate embedding for newly published Recording {Id}",
            recording.Id);
        // Không throw — embedding thất bại không nên block flow chính
    }
}
```

### 6.2. Cập nhật embedding khi Recording metadata thay đổi

Tìm chỗ update Recording metadata (thường trong `RecordingService.UpdateAsync` hoặc tương đương):

```csharp
public async Task UpdateRecordingAsync(Guid recordingId, UpdateRecordingDto dto, ...)
{
    // ... logic update hiện tại ...

    await _db.SaveChangesAsync();

    // >>> THÊM: Re-generate embedding nếu recording đã published <<<
    if (recording.Status == (int)RecordingStatus.Published)
    {
        try
        {
            await _vectorEmbeddingService.GenerateAndSaveAsync(recording.Id);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to regenerate embedding for Recording {Id}", recording.Id);
        }
    }
}
```

---

## 7. Đăng ký toàn bộ DI — Tổng hợp

Thêm vào `Program.cs` (hoặc method đăng ký service):

```csharp
// === OpenAI & Vector Embedding Services ===
builder.Services.Configure<OpenAIOptions>(
    builder.Configuration.GetSection(OpenAIOptions.SectionName));

builder.Services.AddHttpClient<IOpenAIEmbeddingService, OpenAIEmbeddingService>();
builder.Services.AddScoped<IEmbeddingTextBuilder, EmbeddingTextBuilder>();
builder.Services.AddScoped<IVectorEmbeddingService, VectorEmbeddingService>();
builder.Services.AddScoped<ISemanticSearchService, SemanticSearchService>();
```

---

## 8. Thứ tự implement

| Bước | Task | Ghi chú |
|------|------|---------|
| 1 | Kiểm tra Entity `VectorEmbedding` và DbContext | Có thể đã có sẵn từ migration |
| 2 | Tạo `OpenAIOptions` + cấu hình `appsettings.json` | Cần OpenAI API key |
| 3 | Tạo `IOpenAIEmbeddingService` + implement | Service gọi OpenAI API |
| 4 | Tạo `IEmbeddingTextBuilder` + implement | Ghép metadata thành text |
| 5 | Tạo `IVectorEmbeddingService` + implement | Logic CRUD + sync |
| 6 | Tạo `ISemanticSearchService` + implement | Cosine similarity search |
| 7 | Tạo `VectorSyncController` | API admin sync |
| 8 | Tạo `SemanticSearchController` | API public search |
| 9 | Hook vào flow publish/update Recording | Auto-generate embedding |
| 10 | Đăng ký DI trong `Program.cs` | Tổng hợp tất cả service |
| 11 | Test thủ công | Gọi API sync → search |

---

## 9. Lưu ý quan trọng

### Performance
- `SemanticSearchService` hiện tại load **toàn bộ embedding vào memory** để tính cosine similarity. Cách này chỉ phù hợp khi có dưới ~10,000 recordings. Nếu dữ liệu lớn hơn, cần chuyển sang **pgvector** extension hoặc vector DB riêng (Pinecone/Weaviate).
- Bulk sync nên có delay giữa các request (đã thêm 200ms) để tránh rate limit OpenAI.

### Error handling
- Embedding thất bại **không được block** flow chính (submit/approve recording). Luôn wrap trong try-catch và log warning.
- OpenAI API có thể trả 429 (rate limit) — cần xử lý retry với exponential backoff.

### Giá trị Status của Recording
- Kiểm tra trong codebase giá trị enum `RecordingStatus.Published` là gì (thường là `1`). Chỉ sync embedding cho recording đã published.

### Navigation Properties
- Entity `Recording` cần có navigation properties cho `RecordingInstruments`, `RecordingTags`, `Commune.District.Province`. Kiểm tra trong entity class hiện tại.
