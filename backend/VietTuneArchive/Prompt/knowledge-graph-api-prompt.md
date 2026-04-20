# PROMPT CHO AI AGENT: Thêm Knowledge Graph API vào Backend C#

> **Mục đích**: Thêm Knowledge Graph API cho VietTune Archive sử dụng PostgreSQL thuần (Hướng 1 — Graph-like queries). KHÔNG dùng Neo4j hay graph database riêng.
>
> **Cách hoạt động**: Truy vấn các bảng quan hệ hiện có (EthnicGroups, Instruments, Ceremonies, Recordings, VocalStyles, MusicalScales, Tags, Provinces/Districts/Communes, RecordingInstruments, InstrumentEthnicGroups, EthnicGroupCeremonies, RecordingTags) để trả về dữ liệu dạng nodes + edges cho frontend D3.js render.
>
> **KHÔNG tạo bảng mới, KHÔNG thay đổi schema, KHÔNG cần migration.**
>
> **QUAN TRỌNG**: Agent PHẢI đọc source code project TRƯỚC khi viết code.
> KHÔNG được giả định tên namespace, DbContext, entity class, folder structure.

---

## BƯỚC 0: KHẢO SÁT PROJECT (BẮT BUỘC — LÀM TRƯỚC KHI VIẾT CODE)

### 0.1. Tìm cấu trúc thư mục

```bash
find . -name "*.csproj" -o -name "*.sln" | head -20
find . -type f -name "*.cs" | grep -v "/bin/" | grep -v "/obj/" | head -80
```

Ghi nhớ:
- [ ] Thư mục Controllers, Services, DTOs/Models, Entities

### 0.2. Tìm DbContext

```bash
grep -rn ": DbContext" --include="*.cs"
grep -n "DbSet" --include="*.cs" -r | head -40
```

Ghi nhớ:
- [ ] Tên DbContext (có thể là `VietTuneDbContext` hoặc `ApplicationDbContext`)
- [ ] Danh sách DbSet — đặc biệt quan tâm: EthnicGroups, Instruments, Ceremonies, Recordings, VocalStyles, MusicalScales, Tags, Provinces, Districts, Communes
- [ ] Có DbSet cho bảng trung gian không (RecordingInstruments, InstrumentEthnicGroups, EthnicGroupCeremonies, RecordingTags)?

### 0.3. Tìm Entity classes liên quan

```bash
grep -rn "class EthnicGroup " --include="*.cs"
grep -rn "class Instrument " --include="*.cs"
grep -rn "class Ceremony " --include="*.cs"
grep -rn "class Recording " --include="*.cs"
grep -rn "class VocalStyle " --include="*.cs"
grep -rn "class MusicalScale " --include="*.cs"
grep -rn "class Tag " --include="*.cs"
grep -rn "class Province " --include="*.cs"
grep -rn "class Commune " --include="*.cs"
```

Đọc từng entity class để biết:
- [ ] Properties chính xác (tên, kiểu)
- [ ] Navigation properties (có ICollection hay List cho quan hệ nhiều-nhiều không?)
- [ ] Có entity cho bảng trung gian không (RecordingInstrument, InstrumentEthnicGroup...)?

### 0.4. Tìm conventions

```bash
# Controller mẫu
find . -name "*Controller.cs" -not -path "*/bin/*" | head -5
# Đọc 1-2 controller để học convention

# Service mẫu
find . -name "*Service.cs" -not -path "*/bin/*" | head -5

# Program.cs
find . -name "Program.cs" -not -path "*/bin/*" | head -3

# Auth pattern
grep -rn "\[Authorize\]" --include="*.cs" | head -5

# Response wrapper
grep -rn "ApiResponse\|ErrorResponse\|Result<" --include="*.cs" | head -10
```

Ghi nhớ:
- [ ] Root namespace
- [ ] Route convention (`[Route("api/[controller]")]`?)
- [ ] Dùng interface cho service? (`IXxxService` + `XxxService`)
- [ ] Return type convention (IActionResult? ActionResult<T>? custom wrapper?)
- [ ] Service registration cách nào (Program.cs trực tiếp? extension method?)

---

## BƯỚC 1: TẠO DTOs (Response Models)

Tạo file DTOs cho Knowledge Graph. Đặt file theo convention của project (thường là thư mục `DTOs/` hoặc `Models/`).

**MATCH CONVENTION** — nếu project dùng folder `DTOs/KnowledgeGraph/` thì tạo ở đó. Nếu project dùng flat `DTOs/` thì prefix tên file.

```csharp
// DTOs/KnowledgeGraph/GraphNodeDto.cs (hoặc theo convention project)

/// <summary>
/// Một node trong Knowledge Graph — đại diện cho một entity 
/// (EthnicGroup, Instrument, Ceremony, Recording, VocalStyle, MusicalScale, Tag, Province)
/// </summary>
public class GraphNodeDto
{
    public string Id { get; set; } = string.Empty;
    
    /// <summary>
    /// Loại entity: "EthnicGroup", "Instrument", "Ceremony", "Recording", 
    /// "VocalStyle", "MusicalScale", "Tag", "Province"
    /// </summary>
    public string Type { get; set; } = string.Empty;
    
    public string Label { get; set; } = string.Empty;
    
    /// <summary>
    /// Metadata bổ sung tuỳ theo Type.
    /// VD: Instrument có Category, TuningSystem; EthnicGroup có LanguageFamily, PrimaryRegion...
    /// </summary>
    public Dictionary<string, object?> Properties { get; set; } = new();
}
```

```csharp
// DTOs/KnowledgeGraph/GraphEdgeDto.cs

/// <summary>
/// Một cạnh (edge) trong Knowledge Graph — quan hệ giữa 2 nodes.
/// </summary>
public class GraphEdgeDto
{
    public string SourceId { get; set; } = string.Empty;
    public string TargetId { get; set; } = string.Empty;
    
    /// <summary>
    /// Loại quan hệ: "USES_INSTRUMENT", "BELONGS_TO_ETHNIC_GROUP", "PERFORMED_IN_CEREMONY",
    /// "HAS_VOCAL_STYLE", "HAS_SCALE", "HAS_TAG", "LOCATED_IN", "ORIGIN_ETHNIC_GROUP",
    /// "ETHNIC_GROUP_HAS_CEREMONY", "ETHNIC_GROUP_HAS_INSTRUMENT"
    /// </summary>
    public string Relation { get; set; } = string.Empty;
    
    /// <summary>
    /// Metadata bổ sung (VD: PlayingTechnique cho Recording-Instrument)
    /// </summary>
    public Dictionary<string, object?>? Properties { get; set; }
}
```

```csharp
// DTOs/KnowledgeGraph/GraphResponseDto.cs

/// <summary>
/// Response chứa subgraph — danh sách nodes và edges.
/// Frontend D3.js sẽ dùng trực tiếp data này để render force-directed graph.
/// </summary>
public class GraphResponseDto
{
    public List<GraphNodeDto> Nodes { get; set; } = new();
    public List<GraphEdgeDto> Edges { get; set; } = new();
    
    /// <summary>
    /// Tổng số nodes có thể có (trước khi limit), dùng cho pagination.
    /// </summary>
    public int TotalNodes { get; set; }
}
```

```csharp
// DTOs/KnowledgeGraph/GraphExploreRequest.cs

/// <summary>
/// Request explore graph từ một node trung tâm.
/// </summary>
public class GraphExploreRequest
{
    /// <summary>
    /// ID của node trung tâm (UUID dạng string)
    /// </summary>
    public string NodeId { get; set; } = string.Empty;
    
    /// <summary>
    /// Loại node: "EthnicGroup", "Instrument", "Ceremony", "Recording"...
    /// </summary>
    public string NodeType { get; set; } = string.Empty;
    
    /// <summary>
    /// Số bước (hop) tối đa từ node trung tâm. Mặc định 1, tối đa 3.
    /// </summary>
    public int Depth { get; set; } = 1;
    
    /// <summary>
    /// Giới hạn số nodes trả về. Mặc định 50, tối đa 200.
    /// </summary>
    public int MaxNodes { get; set; } = 50;
    
    /// <summary>
    /// Lọc theo loại node cụ thể (null = tất cả).
    /// VD: ["Instrument", "Ceremony"] chỉ lấy instruments và ceremonies liên quan.
    /// </summary>
    public List<string>? FilterTypes { get; set; }
}
```

```csharp
// DTOs/KnowledgeGraph/GraphSearchRequest.cs

/// <summary>
/// Tìm kiếm nodes trong graph theo keyword.
/// </summary>
public class GraphSearchRequest
{
    public string Query { get; set; } = string.Empty;
    
    /// <summary>
    /// Lọc theo loại (null = tìm tất cả types)
    /// </summary>
    public List<string>? Types { get; set; }
    
    public int Limit { get; set; } = 20;
}
```

```csharp
// DTOs/KnowledgeGraph/GraphStatsDto.cs

/// <summary>
/// Thống kê tổng quan Knowledge Graph.
/// </summary>
public class GraphStatsDto
{
    public int TotalEthnicGroups { get; set; }
    public int TotalInstruments { get; set; }
    public int TotalCeremonies { get; set; }
    public int TotalRecordings { get; set; }
    public int TotalVocalStyles { get; set; }
    public int TotalMusicalScales { get; set; }
    public int TotalTags { get; set; }
    public int TotalProvinces { get; set; }
    public int TotalEdges { get; set; }
}
```

---

## BƯỚC 2: TẠO SERVICE — IKnowledgeGraphService + KnowledgeGraphService

Tạo interface + implementation. **Đây là phần QUAN TRỌNG NHẤT.**

### 2.1. Interface

```csharp
// Services/IKnowledgeGraphService.cs (hoặc theo convention project)

public interface IKnowledgeGraphService
{
    /// <summary>
    /// Lấy subgraph xung quanh một node (explore/expand).
    /// </summary>
    Task<GraphResponseDto> ExploreNodeAsync(GraphExploreRequest request);
    
    /// <summary>
    /// Tìm kiếm nodes theo keyword.
    /// </summary>
    Task<List<GraphNodeDto>> SearchNodesAsync(GraphSearchRequest request);
    
    /// <summary>
    /// Lấy overview graph — top entities và quan hệ chính (cho trang chủ knowledge graph).
    /// </summary>
    Task<GraphResponseDto> GetOverviewGraphAsync(int maxNodes = 100);
    
    /// <summary>
    /// Lấy thống kê tổng quan graph.
    /// </summary>
    Task<GraphStatsDto> GetStatsAsync();
    
    /// <summary>
    /// Lấy subgraph giữa 2 entity types cụ thể.
    /// VD: Tất cả Instrument ↔ EthnicGroup relationships.
    /// </summary>
    Task<GraphResponseDto> GetRelationshipGraphAsync(string sourceType, string targetType, int limit = 100);
}
```

### 2.2. Implementation

```csharp
// Services/KnowledgeGraphService.cs

using Microsoft.EntityFrameworkCore;

public class KnowledgeGraphService : IKnowledgeGraphService
{
    private readonly VietTuneDbContext _db; // ← THAY BẰNG TÊN DBCONTEXT THỰC TẾ
    private readonly ILogger<KnowledgeGraphService> _logger;

    public KnowledgeGraphService(VietTuneDbContext db, ILogger<KnowledgeGraphService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ================================================================
    // EXPLORE NODE — Lấy subgraph xung quanh một node trung tâm
    // ================================================================
    public async Task<GraphResponseDto> ExploreNodeAsync(GraphExploreRequest request)
    {
        // Validate
        request.Depth = Math.Clamp(request.Depth, 1, 3);
        request.MaxNodes = Math.Clamp(request.MaxNodes, 1, 200);

        var nodeId = Guid.Parse(request.NodeId);
        var nodes = new Dictionary<string, GraphNodeDto>();
        var edges = new List<GraphEdgeDto>();

        // BFS: bắt đầu từ node trung tâm, mở rộng theo depth
        var visited = new HashSet<string>();
        var queue = new Queue<(Guid Id, string Type, int CurrentDepth)>();
        queue.Enqueue((nodeId, request.NodeType, 0));

        while (queue.Count > 0 && nodes.Count < request.MaxNodes)
        {
            var (currentId, currentType, currentDepth) = queue.Dequeue();
            var key = $"{currentType}:{currentId}";

            if (visited.Contains(key)) continue;
            visited.Add(key);

            // Lấy node data
            var node = await GetNodeByIdAsync(currentId, currentType);
            if (node == null) continue;
            nodes[key] = node;

            // Nếu chưa đạt max depth, tìm neighbors
            if (currentDepth < request.Depth)
            {
                var neighbors = await GetNeighborsAsync(currentId, currentType, request.FilterTypes);
                foreach (var (neighborNode, edge) in neighbors)
                {
                    var neighborKey = $"{neighborNode.Type}:{neighborNode.Id}";

                    // Thêm edge
                    edges.Add(edge);

                    // Thêm neighbor vào queue nếu chưa visit
                    if (!visited.Contains(neighborKey) && nodes.Count < request.MaxNodes)
                    {
                        queue.Enqueue((Guid.Parse(neighborNode.Id), neighborNode.Type, currentDepth + 1));
                    }

                    // Thêm node neighbor (dù không expand tiếp)
                    if (!nodes.ContainsKey(neighborKey))
                    {
                        nodes[neighborKey] = neighborNode;
                    }
                }
            }
        }

        return new GraphResponseDto
        {
            Nodes = nodes.Values.ToList(),
            Edges = DeduplicateEdges(edges),
            TotalNodes = nodes.Count
        };
    }

    // ================================================================
    // SEARCH NODES — Tìm kiếm node theo keyword
    // ================================================================
    public async Task<List<GraphNodeDto>> SearchNodesAsync(GraphSearchRequest request)
    {
        var query = request.Query.ToLower().Trim();
        var limit = Math.Clamp(request.Limit, 1, 50);
        var results = new List<GraphNodeDto>();
        var types = request.Types ?? new List<string> 
        { 
            "EthnicGroup", "Instrument", "Ceremony", "Recording", 
            "VocalStyle", "MusicalScale", "Tag", "Province" 
        };

        if (types.Contains("EthnicGroup"))
        {
            var items = await _db.EthnicGroups
                .Where(e => EF.Functions.ILike(e.Name, $"%{query}%"))
                .Take(limit)
                .Select(e => new GraphNodeDto
                {
                    Id = e.Id.ToString(),
                    Type = "EthnicGroup",
                    Label = e.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["languageFamily"] = e.LanguageFamily,
                        ["primaryRegion"] = e.PrimaryRegion,
                        ["imageUrl"] = e.ImageUrl
                    }
                })
                .ToListAsync();
            results.AddRange(items);
        }

        if (types.Contains("Instrument"))
        {
            var items = await _db.Instruments
                .Where(i => EF.Functions.ILike(i.Name, $"%{query}%"))
                .Take(limit)
                .Select(i => new GraphNodeDto
                {
                    Id = i.Id.ToString(),
                    Type = "Instrument",
                    Label = i.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["category"] = i.Category,
                        ["tuningSystem"] = i.TuningSystem,
                        ["imageUrl"] = i.ImageUrl
                    }
                })
                .ToListAsync();
            results.AddRange(items);
        }

        if (types.Contains("Ceremony"))
        {
            var items = await _db.Ceremonies
                .Where(c => EF.Functions.ILike(c.Name, $"%{query}%"))
                .Take(limit)
                .Select(c => new GraphNodeDto
                {
                    Id = c.Id.ToString(),
                    Type = "Ceremony",
                    Label = c.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["type"] = c.Type,
                        ["season"] = c.Season
                    }
                })
                .ToListAsync();
            results.AddRange(items);
        }

        if (types.Contains("Recording"))
        {
            var items = await _db.Recordings
                .Where(r => r.Title != null && EF.Functions.ILike(r.Title, $"%{query}%")
                            && r.Status == 2) // Chỉ lấy recordings đã published — KIỂM TRA ENUM STATUS THỰC TẾ
                .Take(limit)
                .Select(r => new GraphNodeDto
                {
                    Id = r.Id.ToString(),
                    Type = "Recording",
                    Label = r.Title ?? "Untitled",
                    Properties = new Dictionary<string, object?>
                    {
                        ["performerName"] = r.PerformerName,
                        ["durationSeconds"] = r.DurationSeconds,
                        ["performanceContext"] = r.PerformanceContext
                    }
                })
                .ToListAsync();
            results.AddRange(items);
        }

        if (types.Contains("VocalStyle"))
        {
            var items = await _db.VocalStyles
                .Where(v => EF.Functions.ILike(v.Name, $"%{query}%"))
                .Take(limit)
                .Select(v => new GraphNodeDto
                {
                    Id = v.Id.ToString(),
                    Type = "VocalStyle",
                    Label = v.Name
                })
                .ToListAsync();
            results.AddRange(items);
        }

        if (types.Contains("MusicalScale"))
        {
            var items = await _db.MusicalScales
                .Where(m => EF.Functions.ILike(m.Name, $"%{query}%"))
                .Take(limit)
                .Select(m => new GraphNodeDto
                {
                    Id = m.Id.ToString(),
                    Type = "MusicalScale",
                    Label = m.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["notePattern"] = m.NotePattern
                    }
                })
                .ToListAsync();
            results.AddRange(items);
        }

        if (types.Contains("Tag"))
        {
            var items = await _db.Tags
                .Where(t => EF.Functions.ILike(t.Name, $"%{query}%"))
                .Take(limit)
                .Select(t => new GraphNodeDto
                {
                    Id = t.Id.ToString(),
                    Type = "Tag",
                    Label = t.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["category"] = t.Category
                    }
                })
                .ToListAsync();
            results.AddRange(items);
        }

        if (types.Contains("Province"))
        {
            var items = await _db.Provinces
                .Where(p => EF.Functions.ILike(p.Name, $"%{query}%"))
                .Take(limit)
                .Select(p => new GraphNodeDto
                {
                    Id = p.Id.ToString(),
                    Type = "Province",
                    Label = p.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["regionCode"] = p.RegionCode
                    }
                })
                .ToListAsync();
            results.AddRange(items);
        }

        return results.Take(limit).ToList();
    }

    // ================================================================
    // OVERVIEW GRAPH — Graph tổng quan cho trang chủ
    // ================================================================
    public async Task<GraphResponseDto> GetOverviewGraphAsync(int maxNodes = 100)
    {
        var nodes = new Dictionary<string, GraphNodeDto>();
        var edges = new List<GraphEdgeDto>();

        // Lấy tất cả EthnicGroups (54 dân tộc — core nodes)
        var ethnicGroups = await _db.EthnicGroups
            .Select(e => new GraphNodeDto
            {
                Id = e.Id.ToString(),
                Type = "EthnicGroup",
                Label = e.Name,
                Properties = new Dictionary<string, object?>
                {
                    ["languageFamily"] = e.LanguageFamily,
                    ["primaryRegion"] = e.PrimaryRegion,
                    ["imageUrl"] = e.ImageUrl
                }
            })
            .ToListAsync();

        foreach (var eg in ethnicGroups)
            nodes[$"EthnicGroup:{eg.Id}"] = eg;

        // Lấy tất cả Instruments
        var instruments = await _db.Instruments
            .Select(i => new GraphNodeDto
            {
                Id = i.Id.ToString(),
                Type = "Instrument",
                Label = i.Name,
                Properties = new Dictionary<string, object?>
                {
                    ["category"] = i.Category,
                    ["imageUrl"] = i.ImageUrl
                }
            })
            .ToListAsync();

        foreach (var inst in instruments)
            nodes[$"Instrument:{inst.Id}"] = inst;

        // Lấy tất cả Ceremonies
        var ceremonies = await _db.Ceremonies
            .Select(c => new GraphNodeDto
            {
                Id = c.Id.ToString(),
                Type = "Ceremony",
                Label = c.Name,
                Properties = new Dictionary<string, object?>
                {
                    ["type"] = c.Type,
                    ["season"] = c.Season
                }
            })
            .ToListAsync();

        foreach (var cer in ceremonies)
            nodes[$"Ceremony:{cer.Id}"] = cer;

        // Lấy edges: InstrumentEthnicGroups
        var instEthnicEdges = await _db.Set<InstrumentEthnicGroup>() // ← THAY BẰNG TÊN ENTITY/DBSET THỰC TẾ
            .Select(ie => new GraphEdgeDto
            {
                SourceId = ie.InstrumentId.ToString(),
                TargetId = ie.EthnicGroupId.ToString(),
                Relation = "BELONGS_TO_ETHNIC_GROUP"
            })
            .ToListAsync();
        edges.AddRange(instEthnicEdges);

        // Lấy edges: EthnicGroupCeremonies
        var ethCerEdges = await _db.Set<EthnicGroupCeremony>() // ← THAY BẰNG TÊN ENTITY/DBSET THỰC TẾ
            .Select(ec => new GraphEdgeDto
            {
                SourceId = ec.EthnicGroupId.ToString(),
                TargetId = ec.CeremonyId.ToString(),
                Relation = "HAS_CEREMONY"
            })
            .ToListAsync();
        edges.AddRange(ethCerEdges);

        // Lấy edges: Instruments → OriginEthnicGroup (nếu có)
        var originEdges = await _db.Instruments
            .Where(i => i.OriginEthnicGroupId != null)
            .Select(i => new GraphEdgeDto
            {
                SourceId = i.Id.ToString(),
                TargetId = i.OriginEthnicGroupId.ToString()!,
                Relation = "ORIGIN_ETHNIC_GROUP"
            })
            .ToListAsync();
        edges.AddRange(originEdges);

        // Trim nếu vượt maxNodes
        var result = new GraphResponseDto
        {
            Nodes = nodes.Values.Take(maxNodes).ToList(),
            Edges = DeduplicateEdges(edges),
            TotalNodes = nodes.Count
        };

        return result;
    }

    // ================================================================
    // STATS — Thống kê tổng quan
    // ================================================================
    public async Task<GraphStatsDto> GetStatsAsync()
    {
        var stats = new GraphStatsDto
        {
            TotalEthnicGroups = await _db.EthnicGroups.CountAsync(),
            TotalInstruments = await _db.Instruments.CountAsync(),
            TotalCeremonies = await _db.Ceremonies.CountAsync(),
            TotalRecordings = await _db.Recordings.CountAsync(),
            TotalVocalStyles = await _db.VocalStyles.CountAsync(),
            TotalMusicalScales = await _db.MusicalScales.CountAsync(),
            TotalTags = await _db.Tags.CountAsync(),
            TotalProvinces = await _db.Provinces.CountAsync()
        };

        // Đếm tổng edges (quan hệ)
        var instrumentEthnicCount = await _db.Set<InstrumentEthnicGroup>().CountAsync(); // ← THAY TÊN
        var ethnicCeremonyCount = await _db.Set<EthnicGroupCeremony>().CountAsync();     // ← THAY TÊN
        var recordingInstrumentCount = await _db.Set<RecordingInstrument>().CountAsync(); // ← THAY TÊN
        var recordingTagCount = await _db.Set<RecordingTag>().CountAsync();               // ← THAY TÊN

        stats.TotalEdges = instrumentEthnicCount + ethnicCeremonyCount 
                         + recordingInstrumentCount + recordingTagCount;

        return stats;
    }

    // ================================================================
    // RELATIONSHIP GRAPH — Graph giữa 2 entity types
    // ================================================================
    public async Task<GraphResponseDto> GetRelationshipGraphAsync(
        string sourceType, string targetType, int limit = 100)
    {
        var nodes = new Dictionary<string, GraphNodeDto>();
        var edges = new List<GraphEdgeDto>();

        // Xác định bảng trung gian dựa trên sourceType + targetType
        var pair = $"{sourceType}-{targetType}";
        var reversePair = $"{targetType}-{sourceType}";

        switch (pair)
        {
            case "Instrument-EthnicGroup":
            case "EthnicGroup-Instrument":
            {
                var rels = await _db.Set<InstrumentEthnicGroup>() // ← THAY TÊN
                    .Include(ie => ie.Instrument)       // ← KIỂM TRA navigation property
                    .Include(ie => ie.EthnicGroup)      // ← KIỂM TRA navigation property
                    .Take(limit)
                    .ToListAsync();

                foreach (var rel in rels)
                {
                    var instKey = $"Instrument:{rel.InstrumentId}";
                    var ethKey = $"EthnicGroup:{rel.EthnicGroupId}";

                    if (!nodes.ContainsKey(instKey))
                        nodes[instKey] = ToNode(rel.Instrument, "Instrument");
                    if (!nodes.ContainsKey(ethKey))
                        nodes[ethKey] = ToNode(rel.EthnicGroup, "EthnicGroup");

                    edges.Add(new GraphEdgeDto
                    {
                        SourceId = rel.InstrumentId.ToString(),
                        TargetId = rel.EthnicGroupId.ToString(),
                        Relation = "BELONGS_TO_ETHNIC_GROUP"
                    });
                }
                break;
            }

            case "EthnicGroup-Ceremony":
            case "Ceremony-EthnicGroup":
            {
                var rels = await _db.Set<EthnicGroupCeremony>() // ← THAY TÊN
                    .Include(ec => ec.EthnicGroup)
                    .Include(ec => ec.Ceremony)
                    .Take(limit)
                    .ToListAsync();

                foreach (var rel in rels)
                {
                    var ethKey = $"EthnicGroup:{rel.EthnicGroupId}";
                    var cerKey = $"Ceremony:{rel.CeremonyId}";

                    if (!nodes.ContainsKey(ethKey))
                        nodes[ethKey] = ToNode(rel.EthnicGroup, "EthnicGroup");
                    if (!nodes.ContainsKey(cerKey))
                        nodes[cerKey] = ToNode(rel.Ceremony, "Ceremony");

                    edges.Add(new GraphEdgeDto
                    {
                        SourceId = rel.EthnicGroupId.ToString(),
                        TargetId = rel.CeremonyId.ToString(),
                        Relation = "HAS_CEREMONY"
                    });
                }
                break;
            }

            case "Recording-Instrument":
            case "Instrument-Recording":
            {
                var rels = await _db.Set<RecordingInstrument>() // ← THAY TÊN
                    .Include(ri => ri.Recording)
                    .Include(ri => ri.Instrument)
                    .Take(limit)
                    .ToListAsync();

                foreach (var rel in rels)
                {
                    var recKey = $"Recording:{rel.RecordingId}";
                    var instKey = $"Instrument:{rel.InstrumentId}";

                    if (!nodes.ContainsKey(recKey))
                        nodes[recKey] = ToNode(rel.Recording, "Recording");
                    if (!nodes.ContainsKey(instKey))
                        nodes[instKey] = ToNode(rel.Instrument, "Instrument");

                    edges.Add(new GraphEdgeDto
                    {
                        SourceId = rel.RecordingId.ToString(),
                        TargetId = rel.InstrumentId.ToString(),
                        Relation = "USES_INSTRUMENT",
                        Properties = new Dictionary<string, object?>
                        {
                            ["playingTechnique"] = rel.PlayingTechnique
                        }
                    });
                }
                break;
            }

            default:
                _logger.LogWarning("Unsupported relationship pair: {Pair}", pair);
                break;
        }

        return new GraphResponseDto
        {
            Nodes = nodes.Values.ToList(),
            Edges = DeduplicateEdges(edges),
            TotalNodes = nodes.Count
        };
    }

    // ================================================================
    // PRIVATE HELPERS
    // ================================================================

    /// <summary>
    /// Lấy một node theo ID và Type.
    /// </summary>
    private async Task<GraphNodeDto?> GetNodeByIdAsync(Guid id, string type)
    {
        return type switch
        {
            "EthnicGroup" => await _db.EthnicGroups
                .Where(e => e.Id == id)
                .Select(e => new GraphNodeDto
                {
                    Id = e.Id.ToString(), Type = "EthnicGroup", Label = e.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["languageFamily"] = e.LanguageFamily,
                        ["primaryRegion"] = e.PrimaryRegion,
                        ["imageUrl"] = e.ImageUrl
                    }
                })
                .FirstOrDefaultAsync(),

            "Instrument" => await _db.Instruments
                .Where(i => i.Id == id)
                .Select(i => new GraphNodeDto
                {
                    Id = i.Id.ToString(), Type = "Instrument", Label = i.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["category"] = i.Category,
                        ["tuningSystem"] = i.TuningSystem,
                        ["imageUrl"] = i.ImageUrl
                    }
                })
                .FirstOrDefaultAsync(),

            "Ceremony" => await _db.Ceremonies
                .Where(c => c.Id == id)
                .Select(c => new GraphNodeDto
                {
                    Id = c.Id.ToString(), Type = "Ceremony", Label = c.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["type"] = c.Type,
                        ["season"] = c.Season
                    }
                })
                .FirstOrDefaultAsync(),

            "Recording" => await _db.Recordings
                .Where(r => r.Id == id)
                .Select(r => new GraphNodeDto
                {
                    Id = r.Id.ToString(), Type = "Recording", Label = r.Title ?? "Untitled",
                    Properties = new Dictionary<string, object?>
                    {
                        ["performerName"] = r.PerformerName,
                        ["durationSeconds"] = r.DurationSeconds,
                        ["performanceContext"] = r.PerformanceContext
                    }
                })
                .FirstOrDefaultAsync(),

            "VocalStyle" => await _db.VocalStyles
                .Where(v => v.Id == id)
                .Select(v => new GraphNodeDto
                {
                    Id = v.Id.ToString(), Type = "VocalStyle", Label = v.Name
                })
                .FirstOrDefaultAsync(),

            "MusicalScale" => await _db.MusicalScales
                .Where(m => m.Id == id)
                .Select(m => new GraphNodeDto
                {
                    Id = m.Id.ToString(), Type = "MusicalScale", Label = m.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["notePattern"] = m.NotePattern
                    }
                })
                .FirstOrDefaultAsync(),

            "Tag" => await _db.Tags
                .Where(t => t.Id == id)
                .Select(t => new GraphNodeDto
                {
                    Id = t.Id.ToString(), Type = "Tag", Label = t.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["category"] = t.Category
                    }
                })
                .FirstOrDefaultAsync(),

            "Province" => await _db.Provinces
                .Where(p => p.Id == id)
                .Select(p => new GraphNodeDto
                {
                    Id = p.Id.ToString(), Type = "Province", Label = p.Name,
                    Properties = new Dictionary<string, object?>
                    {
                        ["regionCode"] = p.RegionCode
                    }
                })
                .FirstOrDefaultAsync(),

            _ => null
        };
    }

    /// <summary>
    /// Tìm tất cả neighbors (nodes liền kề) của một node.
    /// Trả về list (neighborNode, edge).
    /// </summary>
    private async Task<List<(GraphNodeDto Node, GraphEdgeDto Edge)>> GetNeighborsAsync(
        Guid nodeId, string nodeType, List<string>? filterTypes)
    {
        var neighbors = new List<(GraphNodeDto, GraphEdgeDto)>();
        bool includeType(string t) => filterTypes == null || filterTypes.Contains(t);

        switch (nodeType)
        {
            case "EthnicGroup":
            {
                // → Instruments (qua InstrumentEthnicGroups)
                if (includeType("Instrument"))
                {
                    var instruments = await _db.Set<InstrumentEthnicGroup>()  // ← THAY TÊN
                        .Where(ie => ie.EthnicGroupId == nodeId)
                        .Include(ie => ie.Instrument)
                        .ToListAsync();

                    foreach (var ie in instruments)
                    {
                        neighbors.Add((
                            ToNode(ie.Instrument, "Instrument"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = ie.InstrumentId.ToString(),
                                Relation = "ETHNIC_GROUP_HAS_INSTRUMENT"
                            }
                        ));
                    }
                }

                // → Ceremonies (qua EthnicGroupCeremonies)
                if (includeType("Ceremony"))
                {
                    var ceremonies = await _db.Set<EthnicGroupCeremony>()  // ← THAY TÊN
                        .Where(ec => ec.EthnicGroupId == nodeId)
                        .Include(ec => ec.Ceremony)
                        .ToListAsync();

                    foreach (var ec in ceremonies)
                    {
                        neighbors.Add((
                            ToNode(ec.Ceremony, "Ceremony"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = ec.CeremonyId.ToString(),
                                Relation = "HAS_CEREMONY"
                            }
                        ));
                    }
                }

                // → Recordings (FK trực tiếp Recordings.EthnicGroupId)
                if (includeType("Recording"))
                {
                    var recordings = await _db.Recordings
                        .Where(r => r.EthnicGroupId == nodeId && r.Status == 2) // ← KIỂM TRA ENUM
                        .Take(20) // Limit recordings per ethnic group
                        .ToListAsync();

                    foreach (var r in recordings)
                    {
                        neighbors.Add((
                            ToNode(r, "Recording"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = r.Id.ToString(),
                                Relation = "HAS_RECORDING"
                            }
                        ));
                    }
                }

                // → VocalStyles (FK trực tiếp VocalStyles.EthnicGroupId)
                if (includeType("VocalStyle"))
                {
                    var styles = await _db.VocalStyles
                        .Where(v => v.EthnicGroupId == nodeId)
                        .ToListAsync();

                    foreach (var v in styles)
                    {
                        neighbors.Add((
                            ToNode(v, "VocalStyle"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = v.Id.ToString(),
                                Relation = "HAS_VOCAL_STYLE"
                            }
                        ));
                    }
                }
                break;
            }

            case "Instrument":
            {
                // → EthnicGroups
                if (includeType("EthnicGroup"))
                {
                    var ethnicGroups = await _db.Set<InstrumentEthnicGroup>()
                        .Where(ie => ie.InstrumentId == nodeId)
                        .Include(ie => ie.EthnicGroup)
                        .ToListAsync();

                    foreach (var ie in ethnicGroups)
                    {
                        neighbors.Add((
                            ToNode(ie.EthnicGroup, "EthnicGroup"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = ie.EthnicGroupId.ToString(),
                                Relation = "BELONGS_TO_ETHNIC_GROUP"
                            }
                        ));
                    }
                }

                // → Recordings (qua RecordingInstruments)
                if (includeType("Recording"))
                {
                    var recordings = await _db.Set<RecordingInstrument>()
                        .Where(ri => ri.InstrumentId == nodeId)
                        .Include(ri => ri.Recording)
                        .Take(20)
                        .ToListAsync();

                    foreach (var ri in recordings)
                    {
                        neighbors.Add((
                            ToNode(ri.Recording, "Recording"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = ri.RecordingId.ToString(),
                                Relation = "USED_IN_RECORDING",
                                Properties = new Dictionary<string, object?>
                                {
                                    ["playingTechnique"] = ri.PlayingTechnique
                                }
                            }
                        ));
                    }
                }
                break;
            }

            case "Ceremony":
            {
                // → EthnicGroups
                if (includeType("EthnicGroup"))
                {
                    var ethnicGroups = await _db.Set<EthnicGroupCeremony>()
                        .Where(ec => ec.CeremonyId == nodeId)
                        .Include(ec => ec.EthnicGroup)
                        .ToListAsync();

                    foreach (var ec in ethnicGroups)
                    {
                        neighbors.Add((
                            ToNode(ec.EthnicGroup, "EthnicGroup"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = ec.EthnicGroupId.ToString(),
                                Relation = "PERFORMED_BY_ETHNIC_GROUP"
                            }
                        ));
                    }
                }

                // → Recordings
                if (includeType("Recording"))
                {
                    var recordings = await _db.Recordings
                        .Where(r => r.CeremonyId == nodeId && r.Status == 2)
                        .Take(20)
                        .ToListAsync();

                    foreach (var r in recordings)
                    {
                        neighbors.Add((
                            ToNode(r, "Recording"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = r.Id.ToString(),
                                Relation = "FEATURED_IN_RECORDING"
                            }
                        ));
                    }
                }
                break;
            }

            case "Recording":
            {
                // → EthnicGroup (FK trực tiếp)
                if (includeType("EthnicGroup"))
                {
                    var recording = await _db.Recordings
                        .Include(r => r.EthnicGroup) // ← KIỂM TRA navigation property
                        .FirstOrDefaultAsync(r => r.Id == nodeId);

                    if (recording?.EthnicGroup != null)
                    {
                        neighbors.Add((
                            ToNode(recording.EthnicGroup, "EthnicGroup"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = recording.EthnicGroupId.ToString()!,
                                Relation = "BELONGS_TO_ETHNIC_GROUP"
                            }
                        ));
                    }
                }

                // → Instruments (qua RecordingInstruments)
                if (includeType("Instrument"))
                {
                    var instruments = await _db.Set<RecordingInstrument>()
                        .Where(ri => ri.RecordingId == nodeId)
                        .Include(ri => ri.Instrument)
                        .ToListAsync();

                    foreach (var ri in instruments)
                    {
                        neighbors.Add((
                            ToNode(ri.Instrument, "Instrument"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = ri.InstrumentId.ToString(),
                                Relation = "USES_INSTRUMENT",
                                Properties = new Dictionary<string, object?>
                                {
                                    ["playingTechnique"] = ri.PlayingTechnique
                                }
                            }
                        ));
                    }
                }

                // → Ceremony (FK trực tiếp)
                if (includeType("Ceremony"))
                {
                    var recording = await _db.Recordings
                        .Include(r => r.Ceremony) // ← KIỂM TRA navigation property
                        .FirstOrDefaultAsync(r => r.Id == nodeId);

                    if (recording?.Ceremony != null)
                    {
                        neighbors.Add((
                            ToNode(recording.Ceremony, "Ceremony"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = recording.CeremonyId.ToString()!,
                                Relation = "PERFORMED_IN_CEREMONY"
                            }
                        ));
                    }
                }

                // → Tags (qua RecordingTags)
                if (includeType("Tag"))
                {
                    var tags = await _db.Set<RecordingTag>()
                        .Where(rt => rt.RecordingId == nodeId)
                        .Include(rt => rt.Tag)
                        .ToListAsync();

                    foreach (var rt in tags)
                    {
                        neighbors.Add((
                            ToNode(rt.Tag, "Tag"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = rt.TagId.ToString(),
                                Relation = "HAS_TAG"
                            }
                        ));
                    }
                }

                // → VocalStyle (FK trực tiếp)
                if (includeType("VocalStyle"))
                {
                    var recording = await _db.Recordings
                        .Include(r => r.VocalStyle)
                        .FirstOrDefaultAsync(r => r.Id == nodeId);

                    if (recording?.VocalStyle != null)
                    {
                        neighbors.Add((
                            ToNode(recording.VocalStyle, "VocalStyle"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = recording.VocalStyleId.ToString()!,
                                Relation = "HAS_VOCAL_STYLE"
                            }
                        ));
                    }
                }

                // → MusicalScale (FK trực tiếp)
                if (includeType("MusicalScale"))
                {
                    var recording = await _db.Recordings
                        .Include(r => r.MusicalScale)
                        .FirstOrDefaultAsync(r => r.Id == nodeId);

                    if (recording?.MusicalScale != null)
                    {
                        neighbors.Add((
                            ToNode(recording.MusicalScale, "MusicalScale"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = recording.MusicalScaleId.ToString()!,
                                Relation = "HAS_SCALE"
                            }
                        ));
                    }
                }
                break;
            }

            // Tag, VocalStyle, MusicalScale, Province — reverse lookups
            case "Tag":
            {
                if (includeType("Recording"))
                {
                    var recordings = await _db.Set<RecordingTag>()
                        .Where(rt => rt.TagId == nodeId)
                        .Include(rt => rt.Recording)
                        .Take(20)
                        .ToListAsync();

                    foreach (var rt in recordings)
                    {
                        neighbors.Add((
                            ToNode(rt.Recording, "Recording"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = rt.RecordingId.ToString(),
                                Relation = "TAGGED_RECORDING"
                            }
                        ));
                    }
                }
                break;
            }

            case "VocalStyle":
            {
                // → EthnicGroup (FK trực tiếp)
                if (includeType("EthnicGroup"))
                {
                    var style = await _db.VocalStyles
                        .Include(v => v.EthnicGroup) // ← KIỂM TRA
                        .FirstOrDefaultAsync(v => v.Id == nodeId);

                    if (style?.EthnicGroup != null)
                    {
                        neighbors.Add((
                            ToNode(style.EthnicGroup, "EthnicGroup"),
                            new GraphEdgeDto
                            {
                                SourceId = nodeId.ToString(),
                                TargetId = style.EthnicGroupId.ToString()!,
                                Relation = "BELONGS_TO_ETHNIC_GROUP"
                            }
                        ));
                    }
                }
                break;
            }
        }

        return neighbors;
    }

    // ================================================================
    // HELPER: Convert entity → GraphNodeDto
    // Agent: PHẢI điều chỉnh tham số theo entity class thực tế
    // ================================================================

    private GraphNodeDto ToNode(dynamic entity, string type)
    {
        // ⚠️ AGENT: Thay dynamic bằng overloads cho từng entity type.
        // Dùng dynamic ở đây chỉ để minh hoạ. Production code nên dùng strongly-typed.
        
        var node = new GraphNodeDto
        {
            Id = entity.Id.ToString(),
            Type = type,
            Label = type switch
            {
                "Recording" => entity.Title ?? "Untitled",
                _ => entity.Name
            },
            Properties = new Dictionary<string, object?>()
        };

        // Thêm properties tuỳ type
        switch (type)
        {
            case "EthnicGroup":
                node.Properties["languageFamily"] = entity.LanguageFamily;
                node.Properties["primaryRegion"] = entity.PrimaryRegion;
                node.Properties["imageUrl"] = entity.ImageUrl;
                break;
            case "Instrument":
                node.Properties["category"] = entity.Category;
                node.Properties["tuningSystem"] = entity.TuningSystem;
                node.Properties["imageUrl"] = entity.ImageUrl;
                break;
            case "Ceremony":
                node.Properties["type"] = entity.Type;
                node.Properties["season"] = entity.Season;
                break;
            case "Recording":
                node.Properties["performerName"] = entity.PerformerName;
                node.Properties["durationSeconds"] = entity.DurationSeconds;
                break;
            case "VocalStyle":
                node.Properties["description"] = entity.Description;
                break;
            case "MusicalScale":
                node.Properties["notePattern"] = entity.NotePattern;
                break;
            case "Tag":
                node.Properties["category"] = entity.Category;
                break;
            case "Province":
                node.Properties["regionCode"] = entity.RegionCode;
                break;
        }

        return node;
    }

    /// <summary>
    /// Loại bỏ edges trùng (cùng source, target, relation).
    /// </summary>
    private List<GraphEdgeDto> DeduplicateEdges(List<GraphEdgeDto> edges)
    {
        return edges
            .GroupBy(e => $"{e.SourceId}-{e.TargetId}-{e.Relation}")
            .Select(g => g.First())
            .ToList();
    }
}
```

---

## BƯỚC 3: TẠO CONTROLLER

```csharp
// Controllers/KnowledgeGraphController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class KnowledgeGraphController : ControllerBase
{
    private readonly IKnowledgeGraphService _graphService;

    public KnowledgeGraphController(IKnowledgeGraphService graphService)
    {
        _graphService = graphService;
    }

    /// <summary>
    /// Explore graph từ một node trung tâm — trả về subgraph xung quanh node đó.
    /// Frontend gọi khi user click vào 1 node để expand.
    /// </summary>
    [HttpPost("explore")]
    [AllowAnonymous] // Hoặc [Authorize] tuỳ project — knowledge graph là public hay cần login?
    public async Task<IActionResult> ExploreNode([FromBody] GraphExploreRequest request)
    {
        if (string.IsNullOrEmpty(request.NodeId) || string.IsNullOrEmpty(request.NodeType))
            return BadRequest("NodeId and NodeType are required.");

        var result = await _graphService.ExploreNodeAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm nodes theo keyword — cho search bar trong knowledge graph page.
    /// </summary>
    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> SearchNodes(
        [FromQuery] string query,
        [FromQuery] string? types = null,
        [FromQuery] int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest("Query is required.");

        var request = new GraphSearchRequest
        {
            Query = query,
            Limit = limit,
            Types = types?.Split(',').Select(t => t.Trim()).ToList()
        };

        var results = await _graphService.SearchNodesAsync(request);
        return Ok(results);
    }

    /// <summary>
    /// Overview graph — trang chủ knowledge graph hiển thị EthnicGroups ↔ Instruments ↔ Ceremonies.
    /// </summary>
    [HttpGet("overview")]
    [AllowAnonymous]
    public async Task<IActionResult> GetOverview([FromQuery] int maxNodes = 100)
    {
        var result = await _graphService.GetOverviewGraphAsync(maxNodes);
        return Ok(result);
    }

    /// <summary>
    /// Thống kê tổng quan graph.
    /// </summary>
    [HttpGet("stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _graphService.GetStatsAsync();
        return Ok(stats);
    }

    /// <summary>
    /// Lấy graph giữa 2 entity types cụ thể.
    /// VD: GET /api/knowledgegraph/relationship?source=Instrument&target=EthnicGroup
    /// </summary>
    [HttpGet("relationship")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRelationship(
        [FromQuery] string source,
        [FromQuery] string target,
        [FromQuery] int limit = 100)
    {
        if (string.IsNullOrWhiteSpace(source) || string.IsNullOrWhiteSpace(target))
            return BadRequest("Source and target types are required.");

        var result = await _graphService.GetRelationshipGraphAsync(source, target, limit);
        return Ok(result);
    }
}
```

---

## BƯỚC 4: ĐĂNG KÝ DI (Dependency Injection)

Thêm vào `Program.cs` (hoặc file extension method đăng ký services):

```csharp
// Thêm dòng này cùng chỗ đăng ký các service khác
builder.Services.AddScoped<IKnowledgeGraphService, KnowledgeGraphService>();
```

**KHÔNG CẦN thêm NuGet package nào — tất cả dùng EF Core và LINQ sẵn có.**

---

## BƯỚC 5: KIỂM TRA ENTITY + DBSET CHO BẢNG TRUNG GIAN

Knowledge Graph service cần truy cập các bảng trung gian. Kiểm tra xem DbContext có DbSet cho chúng không:

```bash
grep -rn "InstrumentEthnicGroup\|EthnicGroupCeremony\|RecordingInstrument\|RecordingTag" --include="*.cs"
```

**Trường hợp 1: Đã có Entity class + DbSet** → Dùng `_db.InstrumentEthnicGroups` trực tiếp.

**Trường hợp 2: Có Entity class nhưng KHÔNG có DbSet** → Dùng `_db.Set<InstrumentEthnicGroup>()`.

**Trường hợp 3: KHÔNG có Entity class (dùng implicit join table)** → Cần tạo entity class cho bảng trung gian và config trong DbContext:

```csharp
// Entities/InstrumentEthnicGroup.cs (nếu chưa có)
public class InstrumentEthnicGroup
{
    public Guid InstrumentId { get; set; }
    public Instrument Instrument { get; set; } = null!;
    public Guid EthnicGroupId { get; set; }
    public EthnicGroup EthnicGroup { get; set; } = null!;
}

// Trong DbContext OnModelCreating:
modelBuilder.Entity<InstrumentEthnicGroup>(e =>
{
    e.ToTable("InstrumentEthnicGroups");
    e.HasKey(ie => new { ie.InstrumentId, ie.EthnicGroupId });
    e.HasOne(ie => ie.Instrument).WithMany().HasForeignKey(ie => ie.InstrumentId);
    e.HasOne(ie => ie.EthnicGroup).WithMany().HasForeignKey(ie => ie.EthnicGroupId);
});

// Tương tự cho: EthnicGroupCeremony, RecordingInstrument, RecordingTag
```

**LƯU Ý cho RecordingInstrument**: bảng này có thêm cột `PlayingTechnique`:

```csharp
public class RecordingInstrument
{
    public Guid RecordingId { get; set; }
    public Recording Recording { get; set; } = null!;
    public Guid InstrumentId { get; set; }
    public Instrument Instrument { get; set; } = null!;
    public string? PlayingTechnique { get; set; }
}
```

---

## BƯỚC 6: KIỂM TRA BUILD VÀ TEST

```bash
dotnet build
```

Test endpoints:

```bash
# Stats
curl http://localhost:5000/api/knowledgegraph/stats

# Overview
curl http://localhost:5000/api/knowledgegraph/overview?maxNodes=50

# Search
curl "http://localhost:5000/api/knowledgegraph/search?query=tay&types=EthnicGroup,Instrument"

# Explore (thay UUID thật)
curl -X POST http://localhost:5000/api/knowledgegraph/explore \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"<UUID>","nodeType":"EthnicGroup","depth":2,"maxNodes":50}'

# Relationship
curl "http://localhost:5000/api/knowledgegraph/relationship?source=Instrument&target=EthnicGroup&limit=50"
```

---

## API ENDPOINTS TÓM TẮT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/knowledgegraph/stats` | Thống kê tổng quan |
| GET | `/api/knowledgegraph/overview?maxNodes=100` | Graph tổng quan (EthnicGroup ↔ Instrument ↔ Ceremony) |
| GET | `/api/knowledgegraph/search?query=...&types=...&limit=20` | Tìm kiếm nodes |
| POST | `/api/knowledgegraph/explore` | Explore subgraph từ 1 node |
| GET | `/api/knowledgegraph/relationship?source=...&target=...&limit=100` | Graph giữa 2 entity types |

---

## RESPONSE FORMAT MẪU

### GET /api/knowledgegraph/stats
```json
{
  "totalEthnicGroups": 54,
  "totalInstruments": 187,
  "totalCeremonies": 42,
  "totalRecordings": 1250,
  "totalVocalStyles": 35,
  "totalMusicalScales": 12,
  "totalTags": 89,
  "totalProvinces": 63,
  "totalEdges": 2340
}
```

### POST /api/knowledgegraph/explore
```json
{
  "nodes": [
    {
      "id": "abc-123",
      "type": "EthnicGroup",
      "label": "Tày",
      "properties": {
        "languageFamily": "Tai-Kadai",
        "primaryRegion": "Đông Bắc",
        "imageUrl": "https://..."
      }
    },
    {
      "id": "def-456",
      "type": "Instrument",
      "label": "Đàn tính",
      "properties": {
        "category": "String",
        "tuningSystem": "Pentatonic"
      }
    }
  ],
  "edges": [
    {
      "sourceId": "abc-123",
      "targetId": "def-456",
      "relation": "ETHNIC_GROUP_HAS_INSTRUMENT",
      "properties": null
    }
  ],
  "totalNodes": 2
}
```

---

## LƯU Ý QUAN TRỌNG

1. **MATCH CONVENTION** — code mới PHẢI theo phong cách project hiện có
2. **THAY TÊN DbContext** — `VietTuneDbContext` chỉ là ví dụ, thay bằng tên thực tế
3. **THAY TÊN Entity bảng trung gian** — kiểm tra tên class thực tế
4. **KIỂM TRA Navigation Properties** — `.Include(x => x.SomeProp)` chỉ hoạt động nếu entity đã config navigation property
5. **KIỂM TRA Status enum** — `r.Status == 2` giả định 2 = Published. Tìm enum thực tế trong project
6. **KHÔNG tạo bảng mới** — chỉ dùng bảng hiện có
7. **KHÔNG cần NuGet package mới** — tất cả dùng EF Core sẵn có
8. **dynamic trong ToNode()** — Production code nên thay bằng strongly-typed overloads. Dynamic chỉ để giữ prompt ngắn gọn.
9. **ILike** — cần PostgreSQL provider (`Npgsql.EntityFrameworkCore.PostgreSQL`), project đã có sẵn
10. **`dotnet build` PHẢI pass** sau khi thêm code
