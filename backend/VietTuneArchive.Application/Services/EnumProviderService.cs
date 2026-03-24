// ============================================================
// Services/EnumProviderService.cs
// ============================================================
//
// Service này chịu trách nhiệm:
//   1. Đọc file schema + prompt từ Assets
//   2. Query DB lấy danh sách EthnicGroups, Instruments, VocalStyles, MusicalScales
//   3. Cache lại để không query mỗi request
//   4. Inject DB context vào system prompt
//
// Token budget ước tính:
//   ~54 ethnic groups  × ~15 chars  = ~200 tokens
//   ~200 instruments   × ~20 chars  = ~1000 tokens
//   ~30 vocal styles   × ~20 chars  = ~150 tokens
//   ~20 musical scales × ~20 chars  = ~100 tokens
//   ─────────────────────────────────────────────
//   Tổng thêm: ~1,500 tokens/request (chấp nhận được)

using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Context;

public class EnumProviderService : IEnumProviderService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache _cache;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<EnumProviderService> _logger;

    // Cache keys
    private const string CacheKey_DbContext = "AI_DbContext";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);

    public EnumProviderService(
        IServiceScopeFactory scopeFactory,
        IMemoryCache cache,
        IWebHostEnvironment env,
        ILogger<EnumProviderService> logger)
    {
        _scopeFactory = scopeFactory;
        _cache = cache;
        _env = env;
        _logger = logger;
    }

    // =================================================================
    // 1. SCHEMA & PROMPT (đọc file tĩnh)
    // =================================================================

    public string GetJsonSchema()
    {
        var path = Path.Combine(_env.ContentRootPath, "Assets", "music_schema.txt");
        return File.ReadAllText(path);
    }

    public string GetSystemPrompt()
    {
        var path = Path.Combine(_env.ContentRootPath, "Assets", "system_prompt.txt");
        var template = File.ReadAllText(path);

        // Inject DB context vào placeholder {DB_CONTEXT}
        var dbContext = BuildDbContext();
        return template.Replace("{DB_CONTEXT}", dbContext);
    }

    // =================================================================
    // 2. DB CONTEXT BUILDER (cached)
    // =================================================================

    public string BuildDbContext()
    {
        return _cache.GetOrCreate(CacheKey_DbContext, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return BuildDbContextFromDatabase();
        })!;
    }

    private string BuildDbContextFromDatabase()
    {
        // Tạo scope mới vì service này có thể là Singleton
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DBContext>();

        // Query chỉ Name — không lấy Description, ImageUrl... để tiết kiệm token
        var ethnicGroups = db.EthnicGroups
            .OrderBy(e => e.Name)
            .Select(e => e.Name)
            .ToList();

        var instruments = db.Instruments
            .OrderBy(i => i.Name)
            .Select(i => i.Name)
            .ToList();

        var vocalStyles = db.VocalStyles
            .OrderBy(v => v.Name)
            .Select(v => v.Name)
            .ToList();

        var musicalScales = db.MusicalScales
            .OrderBy(m => m.Name)
            .Select(m => m.Name)
            .ToList();

        // Format compact: mỗi category 1 dòng, phân cách bằng " | "
        // Tối ưu token hơn so với JSON array
        var sb = new System.Text.StringBuilder();

        sb.AppendLine($"EthnicGroups: {string.Join(" | ", ethnicGroups)}");
        sb.AppendLine($"Instruments: {string.Join(" | ", instruments)}");
        sb.AppendLine($"VocalStyles: {string.Join(" | ", vocalStyles)}");
        sb.AppendLine($"MusicalScales: {string.Join(" | ", musicalScales)}");

        _logger.LogInformation(
            "Built DB context: {EthnicCount} ethnicGroups, {InstrumentCount} instruments, " +
            "{VocalCount} vocalStyles, {ScaleCount} musicalScales",
            ethnicGroups.Count, instruments.Count, vocalStyles.Count, musicalScales.Count);

        return sb.ToString();
    }

    // =================================================================
    // 3. CACHE REFRESH (gọi khi admin cập nhật data)
    // =================================================================

    public Task RefreshCacheAsync()
    {
        _cache.Remove(CacheKey_DbContext);
        // Pre-warm cache
        BuildDbContext();
        _logger.LogInformation("AI DB context cache refreshed.");
        return Task.CompletedTask;
    }
}