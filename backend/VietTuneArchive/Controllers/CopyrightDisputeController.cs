using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs.Request;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CopyrightDisputeController : ControllerBase
    {
        private readonly ICopyrightDisputeService _service;

        public CopyrightDisputeController(ICopyrightDisputeService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCopyrightDisputeRequest request)
        {
            var result = await _service.CreateDisputeAsync(request);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] CopyrightDisputeStatus? status,
            [FromQuery] Guid? assignedReviewerId,
            [FromQuery] Guid? recordingId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _service.ListDisputesAsync(status, assignedReviewerId, recordingId, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{disputeId}")]
        public async Task<IActionResult> GetDetail(Guid disputeId)
        {
            var result = await _service.GetDisputeDetailAsync(disputeId);
            return result.Success ? Ok(result) : NotFound(result);
        }

        [HttpPost("{disputeId}/assign")]
        public async Task<IActionResult> AssignReviewer(Guid disputeId, [FromBody] AssignReviewerRequest request)
        {
            var result = await _service.AssignReviewerAsync(disputeId, request);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("{disputeId}/resolve")]
        public async Task<IActionResult> Resolve(Guid disputeId, [FromBody] ResolveDisputeRequest request)
        {
            var result = await _service.ResolveDisputeAsync(disputeId, request);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("{disputeId}/evidence")]
        public async Task<IActionResult> AddEvidence(Guid disputeId, IFormFile file)
        {
            // Note: In a real scenario, you would upload the file to a storage service (S3, Azure Blob, etc.)
            // For now, I'll simulate by returning a dummy URL if the file is provided.
            if (file == null || file.Length == 0) return BadRequest("File is required");

            var dummyUrl = $"https://storage.viettune.com/evidence/{disputeId}/{file.FileName}";
            var result = await _service.AddEvidenceAsync(disputeId, dummyUrl);
            
            return result.Success ? Ok(result) : BadRequest(result);
        }
    }
}
