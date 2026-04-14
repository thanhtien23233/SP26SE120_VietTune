using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using static VietTuneArchive.Application.Mapper.DTOs.NotificationDto;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        private Guid CurrentUserId
        {
            get
            {
                var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
            }
        }

        // GET: /api/Notification?page=1&pageSize=20&unreadOnly=false
        [HttpGet]
        public async Task<ActionResult<PagedList<NotificationDto>>> GetNotifications(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] bool? unreadOnly = null)
        {
            var userId = CurrentUserId;
            if (userId == Guid.Empty)
                return Unauthorized(new BaseResponse { Success = false, Message = "Không xác định được người dùng." });

            var result = await _notificationService.GetUserNotificationsPaginatedAsync(userId, page, pageSize, unreadOnly);
            if (!result.IsSuccess)
                return BadRequest(new BaseResponse { Success = false, Message = result.Message });

            return Ok(result.Data);
        }

        // GET: /api/Notification/unread-count
        [HttpGet("unread-count")]
        public async Task<ActionResult<UnreadCountDto>> GetUnreadCount()
        {
            var userId = CurrentUserId;
            if (userId == Guid.Empty)
                return Unauthorized(new BaseResponse { Success = false, Message = "Không xác định được người dùng." });

            var result = await _notificationService.GetUnreadCountAsync(userId);
            if (!result.IsSuccess)
                return BadRequest(new BaseResponse { Success = false, Message = result.Message });

            return Ok(result.Data);
        }

        // PUT: /api/Notification/{id}/read
        [HttpPut("{id}/read")]
        public async Task<ActionResult<BaseResponse>> MarkAsRead(Guid id)
        {
            var userId = CurrentUserId;
            if (userId == Guid.Empty)
                return Unauthorized(new BaseResponse { Success = false, Message = "Không xác định được người dùng." });

            var result = await _notificationService.MarkAsReadAsync(id, userId);
            if (!result.IsSuccess)
                return BadRequest(new BaseResponse { Success = false, Message = result.Message });

            return Ok(new BaseResponse { Success = true, Message = "Đã đánh dấu là đã đọc." });
        }

        // PUT: /api/Notification/read-all
        [HttpPut("read-all")]
        public async Task<ActionResult<BaseResponse>> MarkAllAsRead()
        {
            var userId = CurrentUserId;
            if (userId == Guid.Empty)
                return Unauthorized(new BaseResponse { Success = false, Message = "Không xác định được người dùng." });

            var result = await _notificationService.MarkAllAsReadAsync(userId);
            if (!result.IsSuccess)
                return BadRequest(new BaseResponse { Success = false, Message = result.Message });

            return Ok(new BaseResponse { Success = true, Message = "Đã đánh dấu tất cả là đã đọc." });
        }

        // DELETE: /api/Notification/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult<BaseResponse>> DeleteNotification(Guid id)
        {
            var userId = CurrentUserId;
            if (userId == Guid.Empty)
                return Unauthorized(new BaseResponse { Success = false, Message = "Không xác định được người dùng." });

            var result = await _notificationService.DeleteNotificationAsync(id, userId);
            if (!result.IsSuccess)
                return BadRequest(new BaseResponse { Success = false, Message = result.Message });

            return Ok(new BaseResponse { Success = true, Message = "Đã xóa thông báo." });
        }
    }
}
