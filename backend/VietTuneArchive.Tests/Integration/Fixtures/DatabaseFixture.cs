using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Tests.Integration.Fixtures;

public class DatabaseFixture
{
    // Fixed IDs — use these in tests instead of querying DB
    public static readonly Guid ContributorId  = new("aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa");
    public static readonly Guid ExpertId       = new("bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb");
    public static readonly Guid AdminId        = new("cccccccc-0003-0003-0003-cccccccccccc");
    public static readonly Guid ResearcherId   = new("dddddddd-0004-0004-0004-dddddddddddd");
    public static readonly Guid EthnicGroupId  = new("11111111-1111-1111-1111-111111111111");
    public static readonly Guid InstrumentId   = new("22222222-2222-2222-2222-222222222222");
    public static readonly Guid CeremonyId     = new("33333333-3333-3333-3333-333333333333");
    public static readonly Guid ProvinceId     = new("44444444-4444-4444-4444-444444444444");

    public static void SeedAsync(DBContext db)
    {
        // Seed some standard data required by the tests (users, lookups, etc.)
        
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Test@1234");
        
        if (!db.Users.Any(u => u.Email == "contrib@test.com"))
        {
            var rawPassword = "Test@1234";
            db.Users.Add(new User
            {
                Id = new Guid("aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa"),
                Email = "contrib@test.com",
                PasswordHash = passwordHash,
                Password = rawPassword,
                Role = "Contributor",
                IsActive = true,
                IsEmailConfirmed = true,
                FullName = "Contributor User",
                ContributionScore = 0,
                CreatedAt = DateTime.UtcNow
            });
            db.Users.Add(new User
            {
                Id = new Guid("bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb"),
                Email = "expert@test.com",
                PasswordHash = passwordHash,
                Password = rawPassword,
                Role = "Expert",
                IsActive = true,
                IsEmailConfirmed = true,
                FullName = "Expert User",
                ContributionScore = 0,
                CreatedAt = DateTime.UtcNow
            });
            db.Users.Add(new User
            {
                Id = new Guid("cccccccc-0003-0003-0003-cccccccccccc"),
                Email = "admin@test.com",
                PasswordHash = passwordHash,
                Password = rawPassword,
                Role = "Admin",
                IsActive = true,
                IsEmailConfirmed = true,
                FullName = "Admin User",
                ContributionScore = 0,
                CreatedAt = DateTime.UtcNow
            });
            db.Users.Add(new User
            {
                Id = new Guid("dddddddd-0004-0004-0004-dddddddddddd"),
                Email = "researcher@test.com",
                PasswordHash = passwordHash,
                Password = rawPassword,
                Role = "Researcher",
                IsActive = true,
                IsEmailConfirmed = true,
                FullName = "Researcher User",
                ContributionScore = 0,
                CreatedAt = DateTime.UtcNow
            });
        }
        
        // Check by specific ID (not Any()) to handle reused containers with old random-Guid data
        if (!db.EthnicGroups.Any(e => e.Id == EthnicGroupId))
        {
            db.EthnicGroups.Add(new EthnicGroup
            {
                Id = EthnicGroupId,
                Name = "Kinh",
                Description = "Dân tộc Kinh",
                PrimaryRegion = "Toàn quốc"
            });
        }

        if (!db.Instruments.Any(i => i.Id == InstrumentId))
        {
            db.Instruments.Add(new Instrument
            {
                Id = InstrumentId,
                Name = "Đàn Bầu",
                Category = "String",
                Description = "Đàn bầu một dây"
            });
        }

        if (!db.Ceremonies.Any(c => c.Id == CeremonyId))
        {
            db.Ceremonies.Add(new Ceremony
            {
                Id = CeremonyId,
                Name = "Tế Giao",
                Type = "Ritual",
                Description = "Lễ tế giao"
            });
        }

        if (!db.Provinces.Any(p => p.Id == ProvinceId))
        {
            db.Provinces.Add(new Province
            {
                Id = ProvinceId,
                Name = "Hà Nội",
                RegionCode = "Bac"
            });
        }

        db.SaveChanges();
    }
}
