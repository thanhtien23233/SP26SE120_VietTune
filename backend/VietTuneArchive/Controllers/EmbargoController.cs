using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmbargoController : ControllerBase
    {
        private readonly IEmbargoService _embargoService;

        public EmbargoController(IEmbargoService embargoService)
        {
            _embargoService = embargoService;
        }

        [HttpGet("recording/{recordingId}")]
        public async Task<ActionResult<ServiceResponse<EmbargoDto>>> GetByRecording(Guid recordingId)
        {
            var result = await _embargoService.GetByRecordingIdAsync(recordingId);
            return result.Success ? Ok(result) : NotFound(result);
        }

        [HttpPut("recording/{recordingId}")]
        public async Task<ActionResult<ServiceResponse<EmbargoDto>>> CreateUpdate(Guid recordingId, [FromBody] EmbargoCreateUpdateDto dto)
        {
            // Assuming we get the user ID from the token claims
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                // Fallback for testing or if not authenticated (should be handled by [Authorize])
                userId = Guid.Empty; 
            }

            var result = await _embargoService.CreateOrUpdateAsync(recordingId, dto, userId);
            return Ok(result);
        }

        [HttpPost("recording/{recordingId}/lift")]
        public async Task<ActionResult<ServiceResponse<EmbargoDto>>> LiftEmbargo(Guid recordingId, [FromBody] EmbargoLiftDto dto)
        {
            var result = await _embargoService.LiftEmbargoAsync(recordingId, dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpGet]
        public async Task<ActionResult<PagedResponse<EmbargoDto>>> GetList(
            [FromQuery] EmbargoStatus? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            var result = await _embargoService.GetPagedEmbargoesAsync(status, page, pageSize, from, to);
            return Ok(result);
        }
    }
}
