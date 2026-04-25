using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Entities.DTO.KnowledgeBase;

namespace VietTuneArchive.API.Controllers
{
    [ApiController]
    [Route("api/kb-entries")]
    public class KBEntriesController : ControllerBase
    {
        private readonly IKBEntryService _kbEntryService;

        public KBEntriesController(IKBEntryService kbEntryService)
        {
            _kbEntryService = kbEntryService;
        }

        private Guid GetCurrentUserId()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(userIdStr, out var id) ? id : Guid.Empty;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetEntries([FromQuery] KBEntryQueryParams queryParams)
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (!User.Identity.IsAuthenticated || role == "Researcher" || role == "User")
            {
                queryParams.Status = 1; // Published only
            }
            var result = await _kbEntryService.GetEntriesAsync(queryParams);
            return Ok(result);
        }

        [HttpGet("by-slug/{slug}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetEntryBySlug(string slug)
        {
            try
            {
                var entry = await _kbEntryService.GetEntryBySlugAsync(slug);
                var role = User.FindFirstValue(ClaimTypes.Role);
                if (entry.Status == 0 && (role != "Expert" && role != "Admin"))
                    return Forbid();
                return Ok(entry);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("{id:guid}")]
        [Authorize]
        public async Task<IActionResult> GetEntryById(Guid id)
        {
            try
            {
                return Ok(await _kbEntryService.GetEntryByIdAsync(id));
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Expert,Admin")]
        public async Task<IActionResult> CreateEntry([FromBody] CreateKBEntryRequest request)
        {
            try
            {
                var entry = await _kbEntryService.CreateEntryAsync(GetCurrentUserId(), request);
                return CreatedAtAction(nameof(GetEntryById), new { id = entry.Id }, entry);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:guid}")]
        [Authorize(Roles = "Expert,Admin")]
        public async Task<IActionResult> UpdateEntry(Guid id, [FromBody] UpdateKBEntryRequest request)
        {
            try
            {
                return Ok(await _kbEntryService.UpdateEntryAsync(GetCurrentUserId(), id, request));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id:guid}/status")]
        [Authorize(Roles = "Expert,Admin")]
        public async Task<IActionResult> UpdateEntryStatus(Guid id, [FromBody] UpdateKBEntryStatusRequest request)
        {
            try
            {
                await _kbEntryService.UpdateEntryStatusAsync(GetCurrentUserId(), id, request);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteEntry(Guid id)
        {
            await _kbEntryService.DeleteEntryAsync(id, GetCurrentUserId());
            return NoContent();
        }

        [HttpGet("{entryId:guid}/citations")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCitations(Guid entryId)
        {
            try
            {
                var entry = await _kbEntryService.GetEntryByIdAsync(entryId);
                return Ok(entry.Citations);
            }
            catch (Exception ex) { return NotFound(new { message = ex.Message }); }
        }

        [HttpPost("{entryId:guid}/citations")]
        [Authorize(Roles = "Expert,Admin")]
        public async Task<IActionResult> AddCitation(Guid entryId, [FromBody] CreateKBCitationRequest request)
        {
            try
            {
                var citation = await _kbEntryService.AddCitationAsync(entryId, request);
                return StatusCode(201, citation);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("citations/{citationId:guid}")]
        [Authorize(Roles = "Expert,Admin")]
        public async Task<IActionResult> UpdateCitation(Guid citationId, [FromBody] UpdateKBCitationRequest request)
        {
            try
            {
                var citation = await _kbEntryService.UpdateCitationAsync(citationId, request);
                return Ok(citation);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("citations/{citationId:guid}")]
        [Authorize(Roles = "Expert,Admin")]
        public async Task<IActionResult> DeleteCitation(Guid citationId)
        {
            await _kbEntryService.DeleteCitationAsync(citationId);
            return NoContent();
        }

        [HttpGet("{entryId:guid}/revisions")]
        [Authorize(Roles = "Expert,Admin")]
        public async Task<IActionResult> GetRevisions(Guid entryId)
        {
            var revisions = await _kbEntryService.GetRevisionsAsync(entryId);
            return Ok(revisions);
        }

        [HttpGet("revisions/{revisionId:guid}")]
        [Authorize(Roles = "Expert,Admin")]
        public async Task<IActionResult> GetRevisionDetail(Guid revisionId)
        {
            try
            {
                var revision = await _kbEntryService.GetRevisionDetailAsync(revisionId);
                return Ok(revision);
            }
            catch (Exception ex) { return NotFound(new { message = ex.Message }); }
        }
    }
}
