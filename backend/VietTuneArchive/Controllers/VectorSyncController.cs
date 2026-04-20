using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;

namespace VietTuneArchive.API.Controllers
{
    [ApiController]
    [Route("api/vector-sync")]
    [Authorize(Roles = "Admin")]
    public class VectorSyncController : ControllerBase
    {
        private readonly IVectorEmbeddingService _vectorService;

        public VectorSyncController(IVectorEmbeddingService vectorService)
        {
            _vectorService = vectorService;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus(CancellationToken ct)
        {
            var status = await _vectorService.GetSyncStatusAsync(ct);
            return Ok(status);
        }

        [HttpPost("all")]
        public async Task<IActionResult> SyncAllMissing(CancellationToken ct)
        {
            var count = await _vectorService.SyncAllMissingAsync(ct);
            return Ok(new { synced = count });
        }

        [HttpPost("resync")]
        public async Task<IActionResult> ResyncAll(CancellationToken ct)
        {
            var count = await _vectorService.ResyncAllAsync(ct: ct);
            return Ok(new { resynced = count });
        }

        [HttpPost("{recordingId:guid}")]
        public async Task<IActionResult> SyncOne(Guid recordingId, CancellationToken ct)
        {
            try
            {
                var result = await _vectorService.GenerateAndSaveAsync(recordingId, ct);
                return Ok(new
                {
                    recordingId = result.RecordingId,
                    modelVersion = result.ModelVersion,
                    createdAt = result.CreatedAt
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("{recordingId:guid}")]
        public async Task<IActionResult> Delete(Guid recordingId, CancellationToken ct)
        {
            await _vectorService.DeleteByRecordingIdAsync(recordingId, ct);
            return NoContent();
        }
    }
}
