using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Hubs;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Application.Services
{
    public class NotificationService : INotificationService
    {
        private readonly DBContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationService(DBContext context, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public async Task<Result<Guid>> SendNotificationAsync(Guid userId, string title, string message, string type, string? relatedEntityType = null, Guid? relatedEntityId = null)
        {
            try
            {
                // 1. Lưu vào Database
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Title = title,
                    Message = message,
                    Type = type,
                    RelatedEntityType = relatedEntityType,
                    RelatedEntityId = relatedEntityId,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                // 2. Gửi Real-time qua SignalR
                // Gửi tới tất cả các ConnectionId của người dùng này
                await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", new
                {
                    notification.Id,
                    notification.Title,
                    notification.Message,
                    notification.Type,
                    notification.RelatedEntityType,
                    notification.RelatedEntityId,
                    notification.CreatedAt,
                    notification.IsRead
                });

                return Result<Guid>.Success(notification.Id, "Gửi thông báo thành công.");
            }
            catch (Exception ex)
            {
                return Result<Guid>.Failure($"Lỗi khi gửi thông báo: {ex.Message}");
            }
        }

        public async Task<Result<bool>> SendToAllAsync(string title, string message, string type)
        {
            try
            {
                // Lấy tất cả User Id
                var userIds = await _context.Users.Select(u => u.Id).ToListAsync();

                // Lưu vào DB cho tất cả user (Có thể tối ưu bằng bulk insert nếu số lượng user lớn)
                var notifications = userIds.Select(userId => new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Title = title,
                    Message = message,
                    Type = type,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                _context.Notifications.AddRange(notifications);
                await _context.SaveChangesAsync();

                // Gửi Real-time tới tất cả client đang online
                await _hubContext.Clients.All.SendAsync("ReceiveNotification", new
                {
                    Title = title,
                    Message = message,
                    Type = type,
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false
                });

                return Result<bool>.Success(true, "Gửi thông báo tới tất cả người dùng thành công.");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure($"Lỗi khi gửi thông báo tới tất cả: {ex.Message}");
            }
        }

        public async Task<Result<IEnumerable<Notification>>> GetUserNotificationsAsync(Guid userId, int limit = 20)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(limit)
                .ToListAsync();

            return Result<IEnumerable<Notification>>.Success(notifications);
        }

        public async Task<Result<bool>> MarkAsReadAsync(Guid notificationId)
        {
            var notification = await _context.Notifications.FindAsync(notificationId);
            if (notification == null) return Result<bool>.Failure("Không tìm thấy thông báo.");

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return Result<bool>.Success(true, "Đã đánh dấu là đã đọc.");
        }

        public async Task<Result<bool>> MarkAllAsReadAsync(Guid userId)
        {
            var unreadNotifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var n in unreadNotifications)
            {
                n.IsRead = true;
            }

            await _context.SaveChangesAsync();
            return Result<bool>.Success(true, "Đã đánh dấu tất cả là đã đọc.");
        }
    }
}
