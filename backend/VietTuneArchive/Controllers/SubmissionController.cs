using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SubmissionController : ControllerBase
    {
        private readonly ISubmissionService2 _submissionService;

        public SubmissionController(ISubmissionService2 submissionService)
        {
            _submissionService = submissionService;
        }

        [HttpGet("get-by-status")]
        public async Task<IActionResult> GetSubmissionsByStatus(SubmissionStatus status,
    [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _submissionService.GetSubmissionsByStatusAsync(status);

            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPost("create-submission")]
        [Authorize(Roles = "Admin,Contributor,Expert")]
        public async Task<IActionResult> CreateSubmission([FromBody] SubmissionDto dto)
        {
            var result = await _submissionService.CreateAsync(dto);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPut("confirm-submit-submission")]
        [Authorize(Roles = "Admin,Expert,Contributor")]
        public async Task<IActionResult> ConfirmSubmitSubmission(Guid submissionId)
        {
            var result = await _submissionService.ConfirmSubmit(submissionId);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPut("edit-request-submission")]
        [Authorize(Roles = "Admin,Expert,Contributor")]
        public async Task<IActionResult> EditRequestSubmission(Guid submissionId)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var result = await _submissionService.EditRequest(submissionId, userId);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPut("confirm-edit-submission")]
        [Authorize(Roles = "Admin,Expert,Contributor")]
        public async Task<IActionResult> ConfirmEditSubmission(Guid submissionId)
        {
            var result = await _submissionService.ConfirmEdit(submissionId);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPut("approve-submission")]
        [Authorize(Roles = "Admin,Expert")]
        public async Task<IActionResult> ApproveSubmission(Guid submissionId)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var result = await _submissionService.ApproveSubmission(submissionId, userId);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPut("reject-submission")]
        [Authorize(Roles = "Admin,Expert,Contributor")]
        public async Task<IActionResult> RejectSubmission(Guid submissionId)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var result = await _submissionService.RejectSubmission(submissionId, userId);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMySubmissions(Guid userId,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _submissionService.GetSubmissionsByUserIdAsync(userId);

            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _submissionService.GetSubmissionByIdAsync(id);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        // DELETE: /api/submissions/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult<ServiceResponse<bool>>> Delete(Guid id)
        {
            var result = await _submissionService.DeleteSubmissionAsync(id);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPut("assign-reviewer-submission")]
        [Authorize(Roles = "Admin,Expert")]
        public async Task<IActionResult> AssignReviewerSubmission(Guid submissionId, Guid reviewerId)
        {
            var result = await _submissionService.AssignReviewer(submissionId, reviewerId);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPut("unassign-reviewer-submission")]
        [Authorize(Roles = "Admin,Expert")]
        public async Task<IActionResult> UnassignReviewerSubmission(Guid submissionId)
        {
            var result = await _submissionService.UnassignReviewer(submissionId);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpGet("get-by-reviewer")]
        [Authorize(Roles = "Admin,Expert")]
        public async Task<IActionResult> GetSubmissionsByReviewer(Guid reviewerId)
        {
            var result = await _submissionService.GetSubmissionByExpertIdAsync(reviewerId);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAllSubmissions(
    [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _submissionService.GetAllSubmissionsAsync();

            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }
    }
}
