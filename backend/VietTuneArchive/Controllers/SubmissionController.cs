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
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAllSubmissions (
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
