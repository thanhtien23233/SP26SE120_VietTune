using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using static VietTuneArchive.Application.Mapper.DTOs.AdminDto;
using static VietTuneArchive.Application.Mapper.DTOs.Request.AdminRequest;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ISubmissionService2 _submissionService;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService _notificationService;

        public AdminController(
            IUserService userService,
            ISubmissionService2 submissionService,
            IAuditLogService auditLogService,
            INotificationService notificationService)
        {
            _userService = userService;
            _submissionService = submissionService;
            _auditLogService = auditLogService;
            _notificationService = notificationService;
        }

        // ============================================================
        // USER MANAGEMENT
        // ============================================================

        /// <summary>
        /// Lấy danh sách users (phân trang, filter theo role/status)
        /// </summary>
        // GET: /api/Admin/users?page=1&pageSize=50&role=Expert&status=Active
        [HttpGet("users")]
        public async Task<ActionResult<PagedList<UserAdminDto>>> GetUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? role = null,
            [FromQuery] string? status = null)
        {
            var result = await _userService.GetAllAsync();
            if (!result.IsSuccess)
                return BadRequest(new BaseResponse { Success = false, Message = result.Message });

            var users = result.Data.AsQueryable();

            if (!string.IsNullOrEmpty(role))
                users = users.Where(u => u.Role.Equals(role, StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrEmpty(status))
            {
                bool isActive = status.Equals("Active", StringComparison.OrdinalIgnoreCase);
                users = users.Where(u => u.IsActive == isActive);
            }

            var total = users.Count();
            var paged = users
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new UserAdminDto
                {
                    Id = u.UserId.ToString(),
                    Email = u.Email,
                    FullName = u.FullName,
                    Role = u.Role,
                    Status = u.IsActive ? "Active" : "Inactive",
                    CreatedAt = u.CreatedAt
                })
                .ToList();

            return Ok(new PagedList<UserAdminDto>
            {
                Items = paged,
                Page = page,
                PageSize = pageSize,
                Total = total
            });
        }

        /// <summary>
        /// Lấy chi tiết user
        /// </summary>
        // GET: /api/Admin/users/{id}
        [HttpGet("users/{id}")]
        public async Task<ActionResult<UserDetailAdminDto>> GetUserDetail(Guid id)
        {
            var result = await _userService.GetByIdAsync(id);
            if (!result.IsSuccess)
                return NotFound(new BaseResponse { Success = false, Message = result.Message });

            var user = result.Data;
            var detail = new UserDetailAdminDto
            {
                Id = user.UserId.ToString(),
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                Status = user.IsActive ? "Active" : "Inactive",
                CreatedAt = user.CreatedAt,
                SongsContributed = 0,
                ReviewsCompleted = 0,
                LastLogin = null
            };

            return Ok(detail);
        }

        /// <summary>
        /// Cập nhật role của user + gửi notification
        /// </summary>
        // PUT: /api/Admin/users/{id}/role
        [HttpPut("users/{id}/role")]
        public async Task<ActionResult<BaseResponse>> UpdateUserRole(Guid id, [FromBody] UpdateRoleRequest request)
        {
            var result = await _userService.UpdateRoleAsync(id, request.Role);
            if (!result.IsSuccess)
                return BadRequest(new BaseResponse { Success = false, Message = result.Message });

            // Notification đã được gửi bên trong UserService.UpdateRoleAsync
            return Ok(new BaseResponse { Success = true, Message = result.Message });
        }

        /// <summary>
        /// Cập nhật trạng thái user (Active/Inactive) + gửi notification
        /// </summary>
        // PUT: /api/Admin/users/{id}/status
        [HttpPut("users/{id}/status")]
        public async Task<ActionResult<BaseResponse>> UpdateUserStatus(Guid id, [FromBody] UpdateStatusRequest request)
        {
            bool isActive = request.Status.Equals("Active", StringComparison.OrdinalIgnoreCase);

            var statusDto = new UpdateUserActiveStatusDTO
            {
                UserId = id,
                IsActive = isActive
            };

            var result = await _userService.UpdateUserActiveStatusAsync(statusDto);
            if (!result.IsSuccess)
                return BadRequest(new BaseResponse { Success = false, Message = result.Message });

            // Notification đã được gửi bên trong UserService.UpdateUserActiveStatusAsync
            return Ok(new BaseResponse { Success = true, Message = result.Message });
        }

        // ============================================================
        // SUBMISSION MANAGEMENT
        // ============================================================

        /// <summary>
        /// Lấy danh sách submissions (phân trang, filter theo status/reviewer)
        /// </summary>
        // GET: /api/Admin/submissions?page=1&pageSize=50&status=Pending&reviewer=xxx
        [HttpGet("submissions")]
        public async Task<ActionResult<PagedList<SubmissionAdminDto>>> GetSubmissions(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? status = null,
            [FromQuery] string? reviewer = null)
        {
            var result = await _submissionService.GetAllSubmissionsAsync();
            if (!result.IsSuccess)
                return BadRequest(new BaseResponse { Success = false, Message = result.Message });

            var submissions = result.Data.AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<Domain.Entities.Enum.SubmissionStatus>(status, true, out var parsedStatus))
                    submissions = submissions.Where(s => s.Status == parsedStatus);
            }

            if (!string.IsNullOrEmpty(reviewer) && Guid.TryParse(reviewer, out var reviewerId))
                submissions = submissions.Where(s => s.ReviewerId.HasValue && s.ReviewerId.Value == reviewerId);

            var total = submissions.Count();
            var pagedSubmissions = submissions
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            var paged = pagedSubmissions
                .Select(s => new SubmissionAdminDto
                {
                    Id = s.Id.ToString(),
                    Title = s.Recording?.Title ?? "Untitled",
                    Status = s.Status.ToString(),
                    ReviewerId = s.ReviewerId?.ToString(),
                    SubmittedBy = s.ContributorId.ToString()
                })
                .ToList();

            return Ok(new PagedList<SubmissionAdminDto>
            {
                Items = paged,
                Page = page,
                PageSize = pageSize,
                Total = total
            });
        }

        /// <summary>
        /// Phân công reviewer cho submission + gửi notification
        /// </summary>
        // POST: /api/Admin/submissions/{id}/assign
        [HttpPost("submissions/{id}/assign")]
        public async Task<ActionResult<BaseResponse>> AssignReviewer(Guid id, [FromBody] AssignReviewerRequest request)
        {
            if (!Guid.TryParse(request.ReviewerId, out var reviewerId))
                return BadRequest(new BaseResponse { Success = false, Message = "ReviewerId không hợp lệ." });

            var result = await _submissionService.AssignReviewer(id, reviewerId);
            if (!result.IsSuccess)
                return BadRequest(new BaseResponse { Success = false, Message = result.Message });

            // Notification đã được gửi bên trong SubmissionService2.AssignReviewer
            return Ok(new BaseResponse { Success = true, Message = "Đã phân công reviewer thành công." });
        }

        // ============================================================
        // AUDIT LOGS
        // ============================================================

        /// <summary>
        /// Lấy audit logs (phân trang, filter theo khoảng thời gian)
        /// </summary>
        // GET: /api/Admin/audit-logs?page=1&pageSize=100&from=2026-01-01&to=2026-04-14
        [HttpGet("audit-logs")]
        public async Task<ActionResult<PagedList<AuditLogDto>>> GetAuditLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            var pagedResult = await _auditLogService.GetPaginatedAsync(page, pageSize);
            if (!pagedResult.Success)
                return BadRequest(new BaseResponse { Success = false, Message = pagedResult.Message });

            var logs = pagedResult.Data.AsQueryable();

            if (from.HasValue)
                logs = logs.Where(l => l.CreatedAt >= from.Value);
            if (to.HasValue)
                logs = logs.Where(l => l.CreatedAt <= to.Value);

            var filtered = logs.OrderByDescending(l => l.CreatedAt).ToList();

            return Ok(new PagedList<AuditLogDto>
            {
                Items = filtered,
                Page = page,
                PageSize = pageSize,
                Total = pagedResult.Total
            });
        }

        // ============================================================
        // SYSTEM HEALTH
        // ============================================================

        /// <summary>
        /// Lấy thông tin health của hệ thống
        /// </summary>
        // GET: /api/Admin/system-health
        [HttpGet("system-health")]
        public ActionResult<SystemHealthDto> GetSystemHealth()
        {
            var health = new SystemHealthDto
            {
                Status = "Healthy",
                Uptime = "N/A",
                DbConnections = 0,
                QueueLength = 0,
                Services = new Dictionary<string, string>
                {
                    ["Database"] = "OK",
                    ["SignalR"] = "OK"
                }
            };
            return Ok(health);
        }
    }
}
