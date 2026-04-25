using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Tests.Integration.Fixtures;

public class DatabaseFixture
{
    public static void SeedAsync(DBContext db)
    {
        // Seed some standard data required by the tests (users, lookups, etc.)
        
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Test@1234");
        
        if (!db.Users.Any(u => u.Email == "contrib@test.com"))
        {
            db.Users.Add(new User 
            { 
                Id = Guid.NewGuid(), 
                Email = "contrib@test.com", 
                PasswordHash = passwordHash,
                Role = "Contributor", 
                IsActive = true, 
                IsEmailConfirmed = true,
                FullName = "Contributor User" 
            });
            db.Users.Add(new User 
            { 
                Id = Guid.NewGuid(), 
                Email = "expert@test.com", 
                PasswordHash = passwordHash,
                Role = "Expert", 
                IsActive = true, 
                IsEmailConfirmed = true,
                FullName = "Expert User" 
            });
            db.Users.Add(new User 
            { 
                Id = Guid.NewGuid(), 
                Email = "admin@test.com", 
                PasswordHash = passwordHash,
                Role = "Admin", 
                IsActive = true, 
                IsEmailConfirmed = true,
                FullName = "Admin User" 
            });
        }
        
        if (!db.EthnicGroups.Any())
        {
            db.EthnicGroups.Add(new EthnicGroup { Id = Guid.NewGuid(), Name = "Kinh" });
        }
        
        if (!db.Instruments.Any())
        {
            db.Instruments.Add(new Instrument { Id = Guid.NewGuid(), Name = "Đàn Bầu", Description = "Test" });
        }
        
        if (!db.Ceremonies.Any())
        {
            db.Ceremonies.Add(new Ceremony { Id = Guid.NewGuid(), Name = "Tế Giao" });
        }
        
        if (!db.Provinces.Any())
        {
            db.Provinces.Add(new Province { Id = Guid.NewGuid(), Name = "Hà Nội" });
        }

        db.SaveChanges();
    }
}
