using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.Mapper.DTOs;
using static VietTuneArchive.Application.Mapper.DTOs.CommonDto;
using static VietTuneArchive.Application.Mapper.DTOs.Request.TranscriptionRequest;
using static VietTuneArchive.Application.Mapper.DTOs.TranscriptionDto;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class TranscriptionController : ControllerBase
    {
        private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

        // GET: /api/transcriptions/submissions/{submissionId}
        [HttpGet("submissions/{submissionId}")]
        [Authorize(Policy = "Owner")]
        public ActionResult<TranscriptionDto> GetTranscription(string submissionId)
        {
            var transcription = new TranscriptionDto
            {
                SubmissionId = submissionId,
                Content = "Phiên âm lời bài hát dân ca Tày tự động...",
                Language = "vi-VN",
                Status = "Verified",
                Version = "1.2",
                UpdatedAt = DateTime.UtcNow
            };
            return Ok(transcription);
        }

        // PUT: /api/transcriptions/submissions/{submissionId}
        [HttpPut("submissions/{submissionId}")]
        [Authorize(Policy = "Owner")]
        public ActionResult<BaseResponse> UpdateTranscription(string submissionId, [FromBody] UpdateTranscriptionRequest request)
        {
            var response = new BaseResponse
            {
                Success = true,
                Message = "Transcription updated"
            };
            return Ok(response);
        }

        // POST: /api/transcriptions/submissions/{submissionId}/auto
        [HttpPost("submissions/{submissionId}/auto")]
        [Authorize(Policy = "Owner")]
        public async Task<ActionResult<TranscriptionJobDto>> AutoTranscribe(string submissionId)
        {
            var job = new TranscriptionJobDto
            {
                Id = "transcribe-job-001",
                SubmissionId = submissionId,
                Status = "Processing",
                Language = "vi-VN",
                Progress = 0
            };
            // TODO: Trigger AI transcription job (Whisper, Azure Speech...)
            return Accepted(job);
        }

        // POST: /api/transcriptions/submissions/{submissionId}/verify
        [HttpPost("submissions/{submissionId}/verify")]
        //[Authorize(Policy = "Expert")]
        public ActionResult<BaseResponse> VerifyTranscription(string submissionId, [FromBody] VerifyTranscriptionRequest request)
        {
            var response = new BaseResponse
            {
                Success = true,
                Message = "Transcription verified by expert"
            };
            return Ok(response);
        }

        // GET: /api/transcriptions/submissions/{submissionId}/versions
        [HttpGet("submissions/{submissionId}/versions")]
        [Authorize(Policy = "Owner")]
        public ActionResult<List<TranscriptionVersionDto>> GetVersions(string submissionId)
        {
            var versions = new List<TranscriptionVersionDto>
            {
                new() { Version = "1.2", Content = "Phiên bản đã verify...", UpdatedAt = DateTime.UtcNow.AddDays(-1), UpdatedBy = "expert-123" },
                new() { Version = "1.1", Content = "Phiên bản auto...", UpdatedAt = DateTime.UtcNow.AddDays(-2), UpdatedBy = CurrentUserId }
            };
            return Ok(versions);
        }
    }
}
