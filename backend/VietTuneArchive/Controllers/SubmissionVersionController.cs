using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SubmissionVersionController : ControllerBase
    {
        private readonly ISubmissionVersionService _service;

        public SubmissionVersionController(ISubmissionVersionService service)
        {
            _service = service;
        }

        /// <summary>
        /// Get all submission versions with pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<PagedResponse<SubmissionVersionDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _service.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// Get submission version by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponse<SubmissionVersionDto>>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        /// <summary>
        /// Get all versions of a specific submission
        /// </summary>
        [HttpGet("submission/{submissionId}")]
        public async Task<ActionResult<ServiceResponse<List<SubmissionVersionDto>>>> GetBySubmissionId(Guid submissionId)
        {
            var result = await _service.GetBySubmissionIdAsync(submissionId);
            return result.Success ? Ok(result) : NotFound(result);
        }

        /// <summary>
        /// Get latest version of a submission
        /// </summary>
        [HttpGet("submission/{submissionId}/latest")]
        public async Task<ActionResult<ServiceResponse<SubmissionVersionDto>>> GetLatestVersion(Guid submissionId)
        {
            var result = await _service.GetLatestVersionAsync(submissionId);
            return result.Success ? Ok(result) : NotFound(result);
        }

        /// <summary>
        /// Create new submission version (auto-increments version number)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<ServiceResponse<SubmissionVersionDto>>> CreateVersion(
            [FromBody] CreateSubmissionVersionDto createDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _service.CreateVersionAsync(createDto);
            return result.Success
                ? CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result)
                : BadRequest(result);
        }

        /// <summary>
        /// Update submission version (only ChangesJson can be updated)
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<ServiceResponse<SubmissionVersionDto>>> Update(
            Guid id,
            [FromBody] UpdateSubmissionVersionDto updateDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Get existing version
            var existingResult = await _service.GetByIdAsync(id);
            if (!existingResult.Success)
                return NotFound(existingResult);

            // Create DTO for update
            var versionDto = existingResult.Data;
            if (updateDto.ChangesJson != null)
                versionDto.ChangesJson = updateDto.ChangesJson;

            var result = await _service.UpdateAsync(id, versionDto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        /// <summary>
        /// Delete submission version
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult<ServiceResponse<bool>>> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        /// <summary>
        /// Delete all versions of a submission
        /// </summary>
        [HttpDelete("submission/{submissionId}/all")]
        public async Task<ActionResult<ServiceResponse<string>>> DeleteAllVersions(Guid submissionId)
        {
            try
            {
                var versions = await _service.GetBySubmissionIdAsync(submissionId);
                if (!versions.Success || versions.Data == null || versions.Data.Count == 0)
                    return NotFound(new ServiceResponse<string>
                    {
                        Success = false,
                        Message = "No versions found for this submission"
                    });

                int deletedCount = 0;
                foreach (var version in versions.Data)
                {
                    var deleteResult = await _service.DeleteAsync(version.Id);
                    if (deleteResult.Success)
                        deletedCount++;
                }

                return Ok(new ServiceResponse<string>
                {
                    Success = true,
                    Data = $"Deleted {deletedCount} versions",
                    Message = $"Successfully deleted {deletedCount} versions"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ServiceResponse<string>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                });
            }
        }
    }
}
