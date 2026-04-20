using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.Responses;
using static VietTuneArchive.Application.Mapper.DTOs.CommonDto;
using static VietTuneArchive.Application.Mapper.DTOs.MediaDto;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class MediaController : ControllerBase
    {
        private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

        // POST: /api/v1/media/submissions/{submissionId}/files
        [HttpPost("submissions/{submissionId}/files")]
        [Authorize(Policy = "Owner")]  // Owner của submissionId
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<MediaFileDto>> UploadFile(string submissionId, IFormFile file)
        {
            // TODO: Validate file (audio/video/image, size <100MB), 
            // upload cloud (Azure Blob/S3), save metadata DB,
            // associate với submissionId
            if (file == null || file.Length == 0)
                return BadRequest(new ServiceResponse<string> { Success = false, Message = "No file" });

            var mediaFile = new MediaFileDetailDto
            {
                Id = "media-001",
                SubmissionId = submissionId,
                FileName = file.FileName,
                FileSize = file.Length,
                MimeType = file.ContentType,
                UploadUrl = "https://storage.example.com/media-001.mp3",
                IsPrimary = false,
                UploadedAt = DateTime.UtcNow
            };

            return Created($"media/{mediaFile.Id}", mediaFile);
        }

        // GET: /api/v1/media/submissions/{submissionId}/files
        [HttpGet("submissions/{submissionId}/files")]
        [Authorize(Policy = "Owner")]
        public ActionResult<List<MediaFileDto>> GetSubmissionFiles(string submissionId)
        {
            // TODO: Query files WHERE SubmissionId=submissionId
            var files = new List<MediaFileDto>
            {
                new() { Id = "media-001", FileName = "audio.mp3", IsPrimary = true },
                new() { Id = "media-002", FileName = "video.mp4", IsPrimary = false }
            };
            return Ok(files);
        }

        // GET: /api/v1/media/{mediaFileId}
        [HttpGet("{mediaFileId}")]
        public ActionResult<MediaFileDetailDto> GetMediaFile(string mediaFileId)
        {
            // TODO: Lấy metadata file (public cho Auth users)
            var file = new MediaFileDetailDto
            {
                Id = mediaFileId,
                FileName = "audio.mp3",
                FileSize = 5242880,  // 5MB
                MimeType = "audio/mpeg",
                Duration = "3:45",   // cho audio/video
                UploadUrl = "https://storage.example.com/media-001.mp3",
                ThumbnailUrl = "https://storage.example.com/thumbs/media-001.jpg",
                Metadata = new { bitrate = "128kbps" }
            };
            return Ok(file);
        }

        // DELETE: /api/v1/media/{mediaFileId}
        [HttpDelete("{mediaFileId}")]
        [Authorize(Policy = "Owner")]  // Owner của file/submission
        public ActionResult<ServiceResponse<string>> DeleteMediaFile(string mediaFileId)
        {
            // TODO: Soft/hard delete file + DB record
            return Ok(new ServiceResponse<string> { Success = true, Message = "File deleted" });
        }

        // PUT: /api/v1/media/{mediaFileId}/set-primary
        [HttpPut("{mediaFileId}/set-primary")]
        [Authorize(Policy = "Owner")]
        public ActionResult<ServiceResponse<string>> SetPrimary(string mediaFileId)
        {
            // TODO: Set IsPrimary=true cho file này, false cho others trong submission
            return Ok(new ServiceResponse<string> { Success = true, Message = "Set as primary" });
        }

        // GET: /api/v1/media/{mediaFileId}/stream
        [HttpGet("{mediaFileId}/stream")]
        public IActionResult StreamMedia(string mediaFileId)
        {
            // TODO: Range request cho streaming audio/video (Accept-Ranges: bytes)
            // Return FileStreamResult với Range support
            var streamUrl = $"https://storage.example.com/stream/{mediaFileId}";
            return Redirect(streamUrl);  // hoặc proxy stream
        }

        // GET: /api/v1/media/{mediaFileId}/download
        [HttpGet("{mediaFileId}/download")]
        public IActionResult DownloadMedia(string mediaFileId)
        {
            // TODO: Return File() với Content-Disposition: attachment
            var downloadUrl = $"https://storage.example.com/download/{mediaFileId}";
            return Redirect(downloadUrl);
        }

        // GET: /api/v1/media/{mediaFileId}/thumbnail
        [HttpGet("{mediaFileId}/thumbnail")]
        public IActionResult GetThumbnail(string mediaFileId)
        {
            // TODO: Trả thumbnail image (auto-generate nếu chưa có)
            var thumbUrl = $"https://storage.example.com/thumbs/{mediaFileId}.jpg";
            return Redirect(thumbUrl);
        }
    }

}
