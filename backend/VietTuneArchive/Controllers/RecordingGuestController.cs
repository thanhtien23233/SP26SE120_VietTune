using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RecordingGuestController : ControllerBase
    {
        private readonly IRecordingService _service;
        public RecordingGuestController(IRecordingService service)
        {
            _service = service;
        }
        [HttpGet("search-by-title")]
        public async Task<IActionResult> SearchByTitle(string title)
        {
            var result = await _service.SearchByTitleAsync(title);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpGet("search-by-filter")]
        public async Task<IActionResult> SearchByFilter(
            [FromQuery] Guid? ethnicGroupId,
            [FromQuery] Guid? instrumentId,
            [FromQuery] Guid? ceremonyId,
            [FromQuery] string? regionCode,
            [FromQuery] Guid? communeId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortOrder = "desc")
        {
            var filter = new RecordingFilterDto
            {
                EthnicGroupId = ethnicGroupId,
                InstrumentId = instrumentId,
                CeremonyId = ceremonyId,
                RegionCode = regionCode,
                CommuneId = communeId,
                Page = page,
                PageSize = pageSize,
                SortOrder = sortOrder
            };

            var result = await _service.SearchByFilterAsync(filter);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpGet]
        public async Task<ActionResult<PagedResponse<RecordingDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _service.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }
        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponse<RecordingDto>>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }
    }
}
