using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RecordingImageController : ControllerBase
    {
        private readonly IRecordingImageService _service;

        public RecordingImageController(IRecordingImageService service)
        {
            _service = service;
        }

        // =================================================================
        // GENERIC CRUD
        // =================================================================

        /// <summary>Get all recording images with pagination.</summary>
        [HttpGet]
        public async Task<ActionResult<PagedResponse<RecordingImageDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _service.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponse<RecordingImageDto>>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        [HttpPost]
        public async Task<ActionResult<ServiceResponse<RecordingImageDto>>> Create([FromBody] RecordingImageDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return result.Success
                ? CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result)
                : BadRequest(result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ServiceResponse<RecordingImageDto>>> Update(Guid id, [FromBody] RecordingImageDto dto)
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

        // =================================================================
        // DOMAIN ENDPOINTS
        // =================================================================

        /// <summary>
        /// Upload ảnh lên Supabase Storage và lưu metadata vào DB.
        /// Request: multipart/form-data với field "file" (ảnh) và "caption" (tuỳ chọn).
        /// </summary>
        [HttpPost("{recordingId}/upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<ServiceResponse<RecordingImageDto>>> UploadImage(
            Guid recordingId,
            [FromForm] UploadImageRequest request)
        {
            var result = await _service.UploadImageAsync(recordingId, request.File, request.Caption);
            return result.Success
                ? CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result)
                : BadRequest(result);
        }

        /// <summary>
        /// Lấy tất cả ảnh của một recording, sắp xếp theo SortOrder.
        /// </summary>
        [HttpGet("by-recording/{recordingId}")]
        public async Task<ActionResult<ServiceResponse<List<RecordingImageDto>>>> GetByRecording(Guid recordingId)
        {
            var result = await _service.GetByRecordingAsync(recordingId);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        /// <summary>
        /// Lấy ảnh đại diện (SortOrder == 0) của một recording.
        /// </summary>
        [HttpGet("primary/{recordingId}")]
        public async Task<ActionResult<ServiceResponse<RecordingImageDto>>> GetPrimary(Guid recordingId)
        {
            var result = await _service.GetPrimaryImageAsync(recordingId);
            return result.Success ? Ok(result) : NotFound(result);
        }

        /// <summary>
        /// Đổi thứ tự ảnh. Body là mảng imageId theo thứ tự mới.
        /// </summary>
        [HttpPut("reorder/{recordingId}")]
        public async Task<ActionResult<ServiceResponse<bool>>> Reorder(
            Guid recordingId,
            [FromBody] List<Guid> imageIds)
        {
            var result = await _service.ReorderImagesAsync(recordingId, imageIds);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        /// <summary>
        /// Xóa file trên cloud (Supabase) bằng public URL. 
        /// Không xoá dữ liệu trong DB (dùng cho mục đích dọn dẹp file rác).
        /// </summary>
        [HttpDelete("cloud-file")]
        public async Task<ActionResult<ServiceResponse<bool>>> DeleteCloudFile([FromQuery] string url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return BadRequest(new ServiceResponse<bool> { Success = false, Message = "URL is required" });

            var result = await _service.DeleteCloudFileByUrlAsync(url);
            return result.Success ? Ok(result) : BadRequest(result);
        }
    }
}
