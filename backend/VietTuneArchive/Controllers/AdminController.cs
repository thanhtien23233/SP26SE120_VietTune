using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.Mapper.DTOs;
using static VietTuneArchive.Application.Mapper.DTOs.AdminDto;
using static VietTuneArchive.Application.Mapper.DTOs.CommonDto;
using static VietTuneArchive.Application.Mapper.DTOs.Request.AdminRequest;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]


    public class AdminController : ControllerBase
    {
        // GET: /api/admin/users
        [HttpGet("users")]
        public ActionResult<PagedList<UserAdminDto>> GetUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? role = null,
            [FromQuery] string? status = null)
        {
            var users = new PagedList<UserAdminDto>();
            return Ok(users);
        }

        // GET: /api/admin/users/{id}
        [HttpGet("users/{id}")]
        public ActionResult<UserDetailAdminDto> GetUserDetail(string id)
        {
            var user = new UserDetailAdminDto
            {
                Id = id,
                Email = "admin@example.com",
                FullName = "Admin User",
                Role = "Admin",
                Status = "Active",
                SongsContributed = 45,
                ReviewsCompleted = 120,
                LastLogin = DateTime.UtcNow.AddDays(-1)
            };
            return Ok(user);
        }

        // PUT: /api/admin/users/{id}/role
        [HttpPut("users/{id}/role")]
        public ActionResult<BaseResponse> UpdateUserRole(string id, [FromBody] UpdateRoleRequest request)
        {
            return Ok(new BaseResponse { Success = true, Message = "Role updated" });
        }

        // PUT: /api/admin/users/{id}/status
        [HttpPut("users/{id}/status")]
        public ActionResult<BaseResponse> UpdateUserStatus(string id, [FromBody] UpdateStatusRequest request)
        {
            return Ok(new BaseResponse { Success = true, Message = "Status updated" });
        }

        // GET: /api/admin/submissions
        [HttpGet("submissions")]
        public ActionResult<PagedList<SubmissionAdminDto>> GetSubmissions(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? status = null,
            [FromQuery] string? reviewer = null)
        {
            var submissions = new PagedList<SubmissionAdminDto>();
            return Ok(submissions);
        }

        // POST: /api/admin/submissions/{id}/assign
        [HttpPost("submissions/{id}/assign")]
        public ActionResult<BaseResponse> AssignReviewer(string id, [FromBody] AssignReviewerRequest request)
        {
            return Ok(new BaseResponse { Success = true, Message = "Reviewer assigned" });
        }

        // GET: /api/admin/audit-logs
        [HttpGet("audit-logs")]
        public ActionResult<PagedList<Application.Mapper.DTOs.AuditLogDto>> GetAuditLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            var logs = new PagedList<Application.Mapper.DTOs.AuditLogDto>();
            return Ok(logs);
        }

        // GET: /api/admin/system-health
        [HttpGet("system-health")]
        public ActionResult<SystemHealthDto> GetSystemHealth()
        {
            var health = new SystemHealthDto
            {
                Status = "Healthy",
                Uptime = "99.95%",
                DbConnections = 25,
                QueueLength = 3,
                Services = new Dictionary<string, string>
                {
                    ["Database"] = "OK",
                    ["Redis"] = "OK",
                    ["AI Service"] = "OK"
                }
            };
            return Ok(health);
        }

        // POST: /api/admin/reference-data/{type}
        [HttpPost("reference-data/{type}")]
        public ActionResult<BaseResponse> AddReferenceData(string type, [FromBody] ReferenceDataRequest request)
        {
            return Ok(new BaseResponse { Success = true, Message = $"{type} added" });
        }

        // PUT: /api/admin/reference-data/{type}/{id}
        [HttpPut("reference-data/{type}/{id}")]
        public ActionResult<BaseResponse> UpdateReferenceData(string type, string id, [FromBody] ReferenceDataRequest request)
        {
            return Ok(new BaseResponse { Success = true, Message = $"{type} updated" });
        }
    }
}
