using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class AnnotationController : ControllerBase
    {
        private readonly IAnnotationService _annotationService;
        private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

        public AnnotationController(IAnnotationService annotationService)
        {
            _annotationService = annotationService;
        }

        // GET: /api/annotation
        [HttpGet]
        public async Task<ActionResult<PagedResponse<AnnotationDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _annotationService.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        // GET: /api/annotation/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponse<AnnotationDto>>> GetById(Guid id)
        {
            var result = await _annotationService.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // POST: /api/annotation
        [HttpPost]
        public async Task<ActionResult<ServiceResponse<AnnotationDto>>> Create([FromBody] AnnotationDto dto)
        {
            var result = await _annotationService.CreateAsync(dto);
            return result.Success
                ? CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result)
                : BadRequest(result);
        }

        // PUT: /api/annotation/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<ServiceResponse<AnnotationDto>>> Update(Guid id, [FromBody] AnnotationDto dto)
        {
            var result = await _annotationService.UpdateAsync(id, dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        // DELETE: /api/annotation/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult<ServiceResponse<bool>>> Delete(Guid id)
        {
            var result = await _annotationService.DeleteAsync(id);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        // GET: /api/annotation/recording/{recordingId}
        [HttpGet("recording/{recordingId}")]
        public async Task<ActionResult<ServiceResponse<List<AnnotationDto>>>> GetByRecording(Guid recordingId)
        {
            var result = await _annotationService.GetByRecordingAsync(recordingId);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/annotation/expert/{expertId}
        [HttpGet("expert/{expertId}")]
        public async Task<ActionResult<ServiceResponse<List<AnnotationDto>>>> GetByExpert(Guid expertId)
        {
            var result = await _annotationService.GetByExpertAsync(expertId);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/annotation/type/{type}
        [HttpGet("type/{type}")]
        public async Task<ActionResult<ServiceResponse<List<AnnotationDto>>>> GetByType(string type)
        {
            var result = await _annotationService.GetByTypeAsync(type);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/annotation/search
        [HttpGet("search")]
        public async Task<ActionResult<ServiceResponse<List<AnnotationDto>>>> Search([FromQuery] string keyword)
        {
            var result = await _annotationService.SearchAsync(keyword);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/annotation/time-range
        [HttpGet("time-range")]
        public async Task<ActionResult<ServiceResponse<List<AnnotationDto>>>> GetByTimeRange(
            [FromQuery] Guid recordingId,
            [FromQuery] int startTime,
            [FromQuery] int endTime)
        {
            var result = await _annotationService.GetByTimeRangeAsync(recordingId, startTime, endTime);
            return result.Success ? Ok(result) : NotFound(result);
        }
    }
}
