using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RecordingController : ControllerBase
    {
        private readonly IRecordingService _service;

        public RecordingController(IRecordingService service)
        {
            _service = service;
        }

        [HttpGet("search-by-title")]
        [Authorize(Roles = "Admin,Contributor,Expert,Researcher")]
        public async Task<IActionResult> SearchByTitle(string title)
        {
            var result = await _service.SearchByTitleAsync(title);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Contributor,Expert,Researcher")]
        public async Task<ActionResult<PagedResponse<RecordingDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _service.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Contributor,Expert,Researcher")]
        public async Task<ActionResult<ServiceResponse<RecordingDto>>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        [HttpPut("{id}/upload")]
        [Authorize(Roles = "Admin,Contributor,Expert")]
        public async Task<ActionResult<ServiceResponse<RecordingDto>>> UploadRecordInfo(Guid id, [FromBody] RecordingDto dto)
        {
            var result = await _service.UploadRecordInfo(dto, id);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }
    }
}
