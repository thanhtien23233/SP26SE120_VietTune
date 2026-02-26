using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class KBEntryController : ControllerBase
    {
        private readonly IKBEntryService _service;

        public KBEntryController(IKBEntryService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResponse<KBEntryDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _service.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponse<KBEntryDto>>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        [HttpPost]
        public async Task<ActionResult<ServiceResponse<KBEntryDto>>> Create([FromBody] KBEntryDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return result.Success 
                ? CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result)
                : BadRequest(result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ServiceResponse<KBEntryDto>>> Update(Guid id, [FromBody] KBEntryDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ServiceResponse<bool>>> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            return result.Success ? Ok(result) : BadRequest(result);
        }
    }
}
