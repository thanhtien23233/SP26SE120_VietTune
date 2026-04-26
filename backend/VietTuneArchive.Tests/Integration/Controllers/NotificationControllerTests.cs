using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;

namespace VietTuneArchive.Tests.Integration.Controllers;

public class NotificationControllerTests : ApiTestBase
{
    public NotificationControllerTests(WebAppFactory factory) : base(factory) { }

    // ─── Shared Helpers ───────────────────────────────────────────────────────

    protected async Task<(Guid userId, string token)> CreateUserWithToken(string role)
    {
        var email = $"{role.ToLower()}_{Guid.NewGuid():N}@test.com";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Test@1234");
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = passwordHash,
            Password = passwordHash,
            Role = role,
            IsActive = true,
            IsEmailConfirmed = true,
            FullName = $"Notif {role}",
            ContributionScore = 0,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync();
        var token = JwtTokenHelper.GenerateToken(user.Id.ToString(), email, role);
        return (user.Id, token);
    }

    protected async Task<Guid> SeedNotification(Guid userId, bool isRead = false, string type = "General")
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = $"Test Notification {type}",
            Message = "Test notification message",
            Type = type,
            IsRead = isRead,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Notifications.Add(notification);
        await DbContext.SaveChangesAsync();
        return notification.Id;
    }

    protected async Task<List<Guid>> SeedNotifications(Guid userId, int count, bool isRead = false)
    {
        var ids = new List<Guid>();
        for (int i = 0; i < count; i++)
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = $"Notification {i}",
                Message = $"Message {i}",
                Type = "General",
                IsRead = isRead,
                CreatedAt = DateTime.UtcNow.AddSeconds(-i)
            };
            DbContext.Notifications.Add(notification);
            ids.Add(notification.Id);
        }
        await DbContext.SaveChangesAsync();
        return ids;
    }

    protected void SetToken(string token) =>
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

    // ─── GetNotificationsTests ────────────────────────────────────────────────

    public class GetNotificationsTests : NotificationControllerTests
    {
        public GetNotificationsTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetNotifications_AuthenticatedUser_Returns200OwnNotificationsOnly()
        {
            var (userAId, tokenA) = await CreateUserWithToken("Contributor");
            var (userBId, _) = await CreateUserWithToken("Expert");
            await SeedNotifications(userAId, 3);
            await SeedNotifications(userBId, 2);

            SetToken(tokenA);
            var response = await GetAsync("/api/Notification");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<NotificationDto>>();
            body.Should().NotBeNull();
            // We can assert count by checking DB directly since DTO has no UserId
            var dbNotifs = await DbContext.Notifications
                .Where(n => n.UserId == userAId).ToListAsync();
            dbNotifs.Should().HaveCount(3);
        }

        [Fact]
        public async Task GetNotifications_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Notification");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetNotifications_NoNotifications_Returns200EmptyList()
        {
            var (_, token) = await CreateUserWithToken("Researcher");
            SetToken(token);
            var response = await GetAsync("/api/Notification");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<NotificationDto>>();
            body!.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task GetNotifications_FilterUnreadOnly_ReturnsOnlyUnread()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            await SeedNotification(userId, isRead: false);
            await SeedNotification(userId, isRead: true);

            SetToken(token);
            var response = await GetAsync("/api/Notification?unreadOnly=true");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<NotificationDto>>();
            body!.Items.Should().OnlyContain(n => !n.IsRead);
        }
    }

    // ─── GetUnreadCountTests ──────────────────────────────────────────────────

    public class GetUnreadCountTests : NotificationControllerTests
    {
        public GetUnreadCountTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetUnreadCount_With3UnreadSeeded_Returns3()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            await SeedNotifications(userId, 3, isRead: false);
            await SeedNotifications(userId, 2, isRead: true);

            SetToken(token);
            var response = await GetAsync("/api/Notification/unread-count");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<NotificationDto.UnreadCountDto>();
            body!.Unread.Should().Be(3);
        }

        [Fact]
        public async Task GetUnreadCount_NoNotifications_Returns0()
        {
            var (_, token) = await CreateUserWithToken("Expert");
            SetToken(token);
            var response = await GetAsync("/api/Notification/unread-count");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<NotificationDto.UnreadCountDto>();
            body!.Unread.Should().Be(0);
        }

        [Fact]
        public async Task GetUnreadCount_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Notification/unread-count");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetUnreadCount_AfterMarkingOneAsRead_DecreasesBy1()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            var notifIds = await SeedNotifications(userId, 3, isRead: false);

            SetToken(token);
            await PutAsync($"/api/Notification/{notifIds[0]}/read", new { });

            var response = await GetAsync("/api/Notification/unread-count");
            var body = await response.Content.ReadFromJsonAsync<NotificationDto.UnreadCountDto>();
            body!.Unread.Should().Be(2);
        }
    }

    // ─── MarkAsReadTests ──────────────────────────────────────────────────────

    public class MarkAsReadTests : NotificationControllerTests
    {
        public MarkAsReadTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task MarkAsRead_OwnUnreadNotification_Returns200AndUpdatesDb()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            var notifId = await SeedNotification(userId, isRead: false);

            SetToken(token);
            var response = await PutAsync($"/api/Notification/{notifId}/read", new { });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            DbContext.ChangeTracker.Clear(); // avoid stale tracked entity from seeding
            var dbNotif = await DbContext.Notifications.FindAsync(notifId);
            dbNotif!.IsRead.Should().BeTrue();
        }

        [Fact]
        public async Task MarkAsRead_AlreadyRead_Returns200Idempotent()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            var notifId = await SeedNotification(userId, isRead: true);

            SetToken(token);
            var response = await PutAsync($"/api/Notification/{notifId}/read", new { });
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task MarkAsRead_AnotherUsersNotification_ReturnsError()
        {
            var (userAId, _) = await CreateUserWithToken("Contributor");
            var (_, tokenB) = await CreateUserWithToken("Expert");
            var notifId = await SeedNotification(userAId, isRead: false);

            SetToken(tokenB);
            var response = await PutAsync($"/api/Notification/{notifId}/read", new { });
            response.IsSuccessStatusCode.Should().BeFalse();
        }

        [Fact]
        public async Task MarkAsRead_NonExistentId_Returns400()
        {
            var (_, token) = await CreateUserWithToken("Contributor");
            SetToken(token);
            var response = await PutAsync($"/api/Notification/{Guid.NewGuid()}/read", new { });
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task MarkAsRead_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await PutAsync($"/api/Notification/{Guid.NewGuid()}/read", new { });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── MarkAllAsReadTests ───────────────────────────────────────────────────

    public class MarkAllAsReadTests : NotificationControllerTests
    {
        public MarkAllAsReadTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task MarkAllAsRead_With5Unread_SetsAllToReadInDb()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            await SeedNotifications(userId, 5, isRead: false);

            SetToken(token);
            var response = await PutAsync("/api/Notification/read-all", new { });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            DbContext.ChangeTracker.Clear(); // avoid stale tracked entities from seeding
            var dbNotifs = await DbContext.Notifications
                .Where(n => n.UserId == userId).ToListAsync();
            dbNotifs.Should().OnlyContain(n => n.IsRead);
        }

        [Fact]
        public async Task MarkAllAsRead_NoNotifications_Returns200NoOp()
        {
            var (_, token) = await CreateUserWithToken("Expert");
            SetToken(token);
            var response = await PutAsync("/api/Notification/read-all", new { });
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task MarkAllAsRead_DoesNotAffectOtherUsersNotifications()
        {
            var (userAId, tokenA) = await CreateUserWithToken("Contributor");
            var (userBId, _) = await CreateUserWithToken("Expert");
            await SeedNotifications(userAId, 3, isRead: false);
            await SeedNotifications(userBId, 2, isRead: false);

            SetToken(tokenA);
            await PutAsync("/api/Notification/read-all", new { });

            var bNotifs = await DbContext.Notifications
                .Where(n => n.UserId == userBId).ToListAsync();
            bNotifs.Should().OnlyContain(n => !n.IsRead);
        }

        [Fact]
        public async Task MarkAllAsRead_AfterReadAll_UnreadCountIsZero()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            await SeedNotifications(userId, 3, isRead: false);

            SetToken(token);
            await PutAsync("/api/Notification/read-all", new { });

            var countResp = await GetAsync("/api/Notification/unread-count");
            var body = await countResp.Content.ReadFromJsonAsync<NotificationDto.UnreadCountDto>();
            body!.Unread.Should().Be(0);
        }

        [Fact]
        public async Task MarkAllAsRead_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await PutAsync("/api/Notification/read-all", new { });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── DeleteNotificationTests ──────────────────────────────────────────────

    public class DeleteNotificationTests : NotificationControllerTests
    {
        public DeleteNotificationTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task DeleteNotification_OwnNotification_Returns200AndRemovedFromDb()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            var notifId = await SeedNotification(userId, isRead: false);

            SetToken(token);
            var response = await Client.DeleteAsync($"/api/Notification/{notifId}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            DbContext.ChangeTracker.Clear(); // avoid stale tracked entity from seeding
            var dbNotif = await DbContext.Notifications.FindAsync(notifId);
            dbNotif.Should().BeNull();
        }

        [Fact]
        public async Task DeleteNotification_AnotherUsersNotification_ReturnsError()
        {
            var (userAId, _) = await CreateUserWithToken("Contributor");
            var (_, tokenB) = await CreateUserWithToken("Expert");
            var notifId = await SeedNotification(userAId);

            SetToken(tokenB);
            var response = await Client.DeleteAsync($"/api/Notification/{notifId}");
            response.IsSuccessStatusCode.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteNotification_NonExistentId_Returns400()
        {
            var (_, token) = await CreateUserWithToken("Contributor");
            SetToken(token);
            var response = await Client.DeleteAsync($"/api/Notification/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task DeleteNotification_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await Client.DeleteAsync($"/api/Notification/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task DeleteNotification_AfterDelete_UnreadCountDecreased()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            var notifIds = await SeedNotifications(userId, 3, isRead: false);

            SetToken(token);
            await Client.DeleteAsync($"/api/Notification/{notifIds[0]}");

            var countResp = await GetAsync("/api/Notification/unread-count");
            var body = await countResp.Content.ReadFromJsonAsync<NotificationDto.UnreadCountDto>();
            body!.Unread.Should().Be(2);
        }
    }

    // ─── UserIsolationTests ───────────────────────────────────────────────────

    public class UserIsolationTests : NotificationControllerTests
    {
        public UserIsolationTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetNotifications_ByUserA_DoesNotReturnUserBNotifications()
        {
            var (userAId, tokenA) = await CreateUserWithToken("Contributor");
            var (userBId, _) = await CreateUserWithToken("Expert");
            await SeedNotifications(userAId, 3);
            await SeedNotifications(userBId, 2);

            SetToken(tokenA);
            var response = await GetAsync("/api/Notification");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify via DB that counts are correct per user
            var aDbNotifs = await DbContext.Notifications.Where(n => n.UserId == userAId).ToListAsync();
            var bDbNotifs = await DbContext.Notifications.Where(n => n.UserId == userBId).ToListAsync();
            aDbNotifs.Should().HaveCount(3);
            bDbNotifs.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetUnreadCount_IsIsolatedPerUser()
        {
            var (userAId, tokenA) = await CreateUserWithToken("Contributor");
            var (userBId, _) = await CreateUserWithToken("Expert");
            await SeedNotifications(userAId, 4, isRead: false);
            await SeedNotifications(userBId, 1, isRead: false);

            SetToken(tokenA);
            var countResp = await GetAsync("/api/Notification/unread-count");
            var count = await countResp.Content.ReadFromJsonAsync<NotificationDto.UnreadCountDto>();
            count!.Unread.Should().Be(4);
        }
    }

    // ─── PaginationTests ─────────────────────────────────────────────────────

    public class PaginationTests : NotificationControllerTests
    {
        public PaginationTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetNotifications_Page1Size5_Returns5Results()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            await SeedNotifications(userId, 10, isRead: false);

            SetToken(token);
            var response = await GetAsync("/api/Notification?page=1&pageSize=5");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<NotificationDto>>();
            body!.Items.Should().HaveCount(5);
        }

        [Fact]
        public async Task GetNotifications_Page3Size5_ReturnsEmptyForOnly10Notifications()
        {
            var (userId, token) = await CreateUserWithToken("Contributor");
            await SeedNotifications(userId, 10, isRead: false);

            SetToken(token);
            var response = await GetAsync("/api/Notification?page=3&pageSize=5");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<NotificationDto>>();
            body!.Items.Should().BeEmpty();
        }
    }
}
