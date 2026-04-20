// ============================================================
// Services/EnumProviderService.cs
// ============================================================
//
// Giờ inject DB context dạng:
//   EthnicGroups:
//     { "id": "uuid-1", "name": "Kinh" }
//     { "id": "uuid-2", "name": "Tày" }
//   Instruments:
//     { "id": "uuid-3", "name": "đàn bầu" }
//     ...
//
// Token budget ước tính:
//   Mỗi item ~25 tokens (uuid + name)
//   ~300 items × 25 = ~7,500 tokens
//   Vẫn nằm trong context window thoải mái.

using System.Text;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Context;

public class EnumProviderService : IEnumProviderService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache _cache;
    private readonly IHostEnvironment _env;
    private readonly ILogger<EnumProviderService> _logger;

    private const string CacheKey_DbContext = "AI_DbContext";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);

    public EnumProviderService(
        IServiceScopeFactory scopeFactory,
        IMemoryCache cache,
        IHostEnvironment env,
        ILogger<EnumProviderService> logger)
    {
        _scopeFactory = scopeFactory;
        _cache = cache;
        _env = env;
        _logger = logger;
    }

    // =================================================================
    // 1. SCHEMA & PROMPT
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

        var dbContext = BuildDbContext();
        return template.Replace("{DB_CONTEXT}", dbContext);
    }

    // =================================================================
    // 2. DB CONTEXT BUILDER — id + name format
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
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DBContext>();

        // Query Id + Name cho mỗi category
        var ethnicGroups = db.EthnicGroups
            .OrderBy(e => e.Name)
            .Select(e => new { e.Id, e.Name })
            .ToList();

        var instruments = db.Instruments
            .OrderBy(i => i.Name)
            .Select(i => new { i.Id, i.Name })
            .ToList();

        var vocalStyles = db.VocalStyles
            .OrderBy(v => v.Name)
            .Select(v => new { v.Id, v.Name })
            .ToList();

        var musicalScales = db.MusicalScales
            .OrderBy(m => m.Name)
            .Select(m => new { m.Id, m.Name })
            .ToList();

        var ceremonies = db.Ceremonies
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name })
            .ToList();

        var sb = new StringBuilder();

        sb.AppendLine("EthnicGroups:");
        foreach (var e in ethnicGroups)
            sb.AppendLine($"  {{ \"id\": \"{e.Id}\", \"name\": \"{e.Name}\" }}");

        sb.AppendLine("Instruments:");
        foreach (var i in instruments)
            sb.AppendLine($"  {{ \"id\": \"{i.Id}\", \"name\": \"{i.Name}\" }}");

        sb.AppendLine("VocalStyles:");
        foreach (var v in vocalStyles)
            sb.AppendLine($"  {{ \"id\": \"{v.Id}\", \"name\": \"{v.Name}\" }}");

        sb.AppendLine("MusicalScales:");
        foreach (var m in musicalScales)
            sb.AppendLine($"  {{ \"id\": \"{m.Id}\", \"name\": \"{m.Name}\" }}");

        sb.AppendLine("Ceremonies:");
        foreach (var c in ceremonies)
            sb.AppendLine($"  {{ \"id\": \"{c.Id}\", \"name\": \"{c.Name}\" }}");

        _logger.LogInformation(
            "Built DB context: {Ethnic} ethnic, {Inst} instruments, {Vocal} vocal, {Scale} scales, {Cere} ceremonies",
            ethnicGroups.Count, instruments.Count, vocalStyles.Count, musicalScales.Count, ceremonies.Count);

        return sb.ToString();
    }

    // =================================================================
    // 3. CACHE REFRESH
    // =================================================================

    public Task RefreshCacheAsync()
    {
        _cache.Remove(CacheKey_DbContext);
        BuildDbContext();
        _logger.LogInformation("AI DB context cache refreshed.");
        return Task.CompletedTask;
    }
}