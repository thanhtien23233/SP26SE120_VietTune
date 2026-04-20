using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QAMessageController : ControllerBase
    {
        private readonly IQAMessageService _service;

        public QAMessageController(IQAMessageService service)
        {
            _service = service;
        }
        [HttpGet("get-by-conversation")]
        public async Task<ActionResult<ServiceResponse<IEnumerable<QAMessageDto>>>> GetByConversationId(
            [FromQuery] Guid conversationId)
        {
            var result = await _service.GetByConversationAsync(conversationId);
            if (result.IsSuccess)
            {
                return Ok(new ServiceResponse<IEnumerable<QAMessageDto>> { Success = true, Data = result.Data, Message = result.Message });
            }
            return BadRequest(new ServiceResponse<IEnumerable<QAMessageDto>> { Success = false, Errors = new List<string> { result.Message } });
        }
        [HttpPut("flagged")]
        public async Task<ActionResult<ServiceResponse<bool>>> UpdateFlaggedStatus(
            [FromQuery] Guid id)
        {
            var result = await _service.FlagMessageAsync(id);
            if (result.IsSuccess)
            {
                return Ok(new ServiceResponse<bool> { Success = true, Data = result.Data, Message = result.Message });
            }
            return BadRequest(new ServiceResponse<bool> { Success = false, Errors = new List<string> { result.Message } });
        }
        [HttpPut("unflagged")]
        public async Task<ActionResult<ServiceResponse<bool>>> UpdateUnflaggedStatus(
    [FromQuery] Guid id)
        {
            var result = await _service.UnflagMessageAsync(id);
            if (result.IsSuccess)
            {
                return Ok(new ServiceResponse<bool> { Success = true, Data = result.Data, Message = result.Message });
            }
            return BadRequest(new ServiceResponse<bool> { Success = false, Errors = new List<string> { result.Message } });
        }
        [HttpGet]
        public async Task<ActionResult<PagedResponse<QAMessageDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _service.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponse<QAMessageDto>>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        [HttpPost]
        public async Task<ActionResult<ServiceResponse<QAMessageDto>>> Create([FromBody] QAMessageDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return result.Success
                ? CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result)
                : BadRequest(result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ServiceResponse<QAMessageDto>>> Update(Guid id, [FromBody] QAMessageDto dto)
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
    }
}
