using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class KBCitationController : ControllerBase
    {
        private readonly IKBCitationService _service;

        public KBCitationController(IKBCitationService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResponse<KBCitationDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _service.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponse<KBCitationDto>>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        [HttpPost]
        public async Task<ActionResult<ServiceResponse<KBCitationDto>>> Create([FromBody] KBCitationDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return result.Success 
                ? CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result)
                : BadRequest(result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ServiceResponse<KBCitationDto>>> Update(Guid id, [FromBody] KBCitationDto dto)
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
