using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InstrumentController : ControllerBase
    {
        private readonly IInstrumentService _instrumentService;

        public InstrumentController(IInstrumentService instrumentService)
        {
            _instrumentService = instrumentService;
        }

        /// <summary>
        /// Get all instruments with pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<PagedResponse<InstrumentDto>>> GetInstruments(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _instrumentService.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// Get instrument by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponse<InstrumentDto>>> GetInstrument(Guid id)
        {
            var result = await _instrumentService.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        /// <summary>
        /// Get instruments by category
        /// </summary>
        [HttpGet("category/{category}")]
        public async Task<ActionResult<ServiceResponse<List<InstrumentDto>>>> GetByCategory(string category)
        {
            var result = await _instrumentService.GetByCategoryAsync(category);
            return result.Success ? Ok(result) : NotFound(result);
        }

        /// <summary>
        /// Get instruments by ethnic group
        /// </summary>
        [HttpGet("ethnic-group/{ethnicGroupId}")]
        public async Task<ActionResult<ServiceResponse<List<InstrumentDto>>>> GetByEthnicGroup(Guid ethnicGroupId)
        {
            var result = await _instrumentService.GetByEthnicGroupAsync(ethnicGroupId);
            return result.Success ? Ok(result) : NotFound(result);
        }

        /// <summary>
        /// Search instruments by name or description
        /// </summary>
        [HttpGet("search")]
        public async Task<ActionResult<ServiceResponse<List<InstrumentDto>>>> Search([FromQuery] string keyword)
        {
            var result = await _instrumentService.SearchAsync(keyword);
            return result.Success ? Ok(result) : NotFound(result);
        }

        /// <summary>
        /// Get all instrument categories
        /// </summary>
        [HttpGet("categories/list")]
        public async Task<ActionResult<ServiceResponse<List<string>>>> GetAllCategories()
        {
            var result = await _instrumentService.GetAllCategoriesAsync();
            return result.Success ? Ok(result) : NotFound(result);
        }

        /// <summary>
        /// Create new instrument
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<ServiceResponse<InstrumentDto>>> CreateInstrument(
            [FromBody] InstrumentDto instrumentDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _instrumentService.CreateAsync(instrumentDto);
            return result.Success
                ? CreatedAtAction(nameof(GetInstrument), new { id = result.Data?.Id }, result)
                : BadRequest(result);
        }

        /// <summary>
        /// Update instrument
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<ServiceResponse<InstrumentDto>>> UpdateInstrument(
            Guid id,
            [FromBody] InstrumentDto instrumentDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _instrumentService.UpdateAsync(id, instrumentDto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        /// <summary>
        /// Delete instrument
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult<ServiceResponse<bool>>> DeleteInstrument(Guid id)
        {
            var result = await _instrumentService.DeleteAsync(id);
            return result.Success ? Ok(result) : BadRequest(result);
        }
    }
}
