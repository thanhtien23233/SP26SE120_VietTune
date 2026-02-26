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
    public class ReviewController : ControllerBase
    {
        private readonly IReviewService _reviewService;
        private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

        public ReviewController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        // GET: /api/review
        [HttpGet]
        public async Task<ActionResult<PagedResponse<ReviewDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _reviewService.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        // GET: /api/review/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponse<ReviewDto>>> GetById(Guid id)
        {
            var result = await _reviewService.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // POST: /api/review
        [HttpPost]
        public async Task<ActionResult<ServiceResponse<ReviewDto>>> Create([FromBody] ReviewDto dto)
        {
            var result = await _reviewService.CreateAsync(dto);
            return result.Success
                ? CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result)
                : BadRequest(result);
        }

        // PUT: /api/review/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<ServiceResponse<ReviewDto>>> Update(Guid id, [FromBody] ReviewDto dto)
        {
            var result = await _reviewService.UpdateAsync(id, dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        // DELETE: /api/review/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult<ServiceResponse<bool>>> Delete(Guid id)
        {
            var result = await _reviewService.DeleteAsync(id);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        // GET: /api/review/submission/{submissionId}
        [HttpGet("submission/{submissionId}")]
        public async Task<ActionResult<ServiceResponse<List<ReviewDto>>>> GetBySubmission(Guid submissionId)
        {
            var result = await _reviewService.GetBySubmissionAsync(submissionId);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/review/reviewer/{reviewerId}
        [HttpGet("reviewer/{reviewerId}")]
        public async Task<ActionResult<ServiceResponse<List<ReviewDto>>>> GetByReviewer(Guid reviewerId)
        {
            var result = await _reviewService.GetByReviewerAsync(reviewerId);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/review/decision/{decision}
        [HttpGet("decision/{decision}")]
        public async Task<ActionResult<ServiceResponse<List<ReviewDto>>>> GetByDecision(int decision)
        {
            var result = await _reviewService.GetByDecisionAsync(decision);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/review/stage/{stage}
        [HttpGet("stage/{stage}")]
        public async Task<ActionResult<ServiceResponse<List<ReviewDto>>>> GetByStage(int stage)
        {
            var result = await _reviewService.GetByStageAsync(stage);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/review/recent
        [HttpGet("recent")]
        public async Task<ActionResult<ServiceResponse<List<ReviewDto>>>> GetRecent([FromQuery] int count = 10)
        {
            var result = await _reviewService.GetRecentAsync(count);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/review/pending-count
        [HttpGet("pending-count")]
        public async Task<ActionResult<ServiceResponse<int>>> GetPendingCount()
        {
            var result = await _reviewService.GetPendingCountAsync();
            return result.Success ? Ok(result) : NotFound(result);
        }
    }
}
