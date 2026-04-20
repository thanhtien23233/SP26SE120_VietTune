using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Hubs;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
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

        public async Task<Result<PagedList<NotificationDto>>> GetUserNotificationsPaginatedAsync(Guid userId, int page = 1, int pageSize = 20, bool? unreadOnly = null)
        {
            try
            {
                var query = _context.Notifications
                    .Where(n => n.UserId == userId);

                if (unreadOnly == true)
                {
                    query = query.Where(n => !n.IsRead);
                }

                var total = await query.CountAsync();

                var notifications = await query
                    .OrderByDescending(n => n.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(n => new NotificationDto
                    {
                        Id = n.Id.ToString(),
                        Title = n.Title,
                        Message = n.Message,
                        Type = n.Type,
                        IsRead = n.IsRead,
                        CreatedAt = n.CreatedAt,
                        RelatedId = n.RelatedEntityId.HasValue ? n.RelatedEntityId.Value.ToString() : null,
                        Icon = ""
                    })
                    .ToListAsync();

                var result = new PagedList<NotificationDto>
                {
                    Items = notifications,
                    Page = page,
                    PageSize = pageSize,
                    Total = total
                };

                return Result<PagedList<NotificationDto>>.Success(result);
            }
            catch (Exception ex)
            {
                return Result<PagedList<NotificationDto>>.Failure($"Lỗi khi lấy danh sách thông báo: {ex.Message}");
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

        public async Task<Result<NotificationDto.UnreadCountDto>> GetUnreadCountAsync(Guid userId)
        {
            try
            {
                var unread = await _context.Notifications
                    .CountAsync(n => n.UserId == userId && !n.IsRead);

                var total = await _context.Notifications
                    .CountAsync(n => n.UserId == userId);

                var dto = new NotificationDto.UnreadCountDto
                {
                    Unread = unread,
                    Total = total
                };

                return Result<NotificationDto.UnreadCountDto>.Success(dto);
            }
            catch (Exception ex)
            {
                return Result<NotificationDto.UnreadCountDto>.Failure($"Lỗi khi đếm thông báo: {ex.Message}");
            }
        }

        public async Task<Result<bool>> MarkAsReadAsync(Guid notificationId, Guid userId)
        {
            var notification = await _context.Notifications.FindAsync(notificationId);
            if (notification == null) return Result<bool>.Failure("Không tìm thấy thông báo.");

            // Kiểm tra quyền sở hữu: chỉ user sở hữu mới được đánh dấu
            if (notification.UserId != userId)
                return Result<bool>.Failure("Bạn không có quyền thực hiện thao tác này.");

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

        public async Task<Result<bool>> DeleteNotificationAsync(Guid notificationId, Guid userId)
        {
            try
            {
                var notification = await _context.Notifications.FindAsync(notificationId);
                if (notification == null)
                    return Result<bool>.Failure("Không tìm thấy thông báo.");

                // Kiểm tra quyền sở hữu
                if (notification.UserId != userId)
                    return Result<bool>.Failure("Bạn không có quyền thực hiện thao tác này.");

                _context.Notifications.Remove(notification);
                await _context.SaveChangesAsync();

                return Result<bool>.Success(true, "Đã xóa thông báo.");
            }
            catch (Exception ex)
            {
                return Result<bool>.Failure($"Lỗi khi xóa thông báo: {ex.Message}");
            }
        }
    }
}
