using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using static VietTuneArchive.Application.Mapper.DTOs.Request.RagChatRequest;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/rag-chat")]
    [ApiController]
    [Authorize]
    public class RagChatController : ControllerBase
    {
        private readonly IRagChatService _ragChatService;
        private readonly IEmbeddingService _embeddingService;

        public RagChatController(IRagChatService ragChatService, IEmbeddingService embeddingService)
        {
            _ragChatService = ragChatService;
            _embeddingService = embeddingService;
        }

        private Guid GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                        ?? User.FindFirst("id")?.Value;
            if (Guid.TryParse(userIdStr, out var userId)) return userId;
            throw new UnauthorizedAccessException("User ID not found in token");
        }

        [HttpPost("conversations")]
        public async Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest request)
        {
            var userId = GetUserId();
            var response = await _ragChatService.CreateConversationAsync(userId, request);
            return Ok(response);
        }

        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            var userId = GetUserId();
            var convs = await _ragChatService.GetConversationsAsync(userId);
            return Ok(convs);
        }

        [HttpGet("conversations/{id}")]
        public async Task<IActionResult> GetConversation(Guid id)
        {
            var userId = GetUserId();
            var conv = await _ragChatService.GetConversationAsync(id, userId);
            return Ok(conv);
        }

        [HttpDelete("conversations/{id}")]
        public async Task<IActionResult> DeleteConversation(Guid id)
        {
            var userId = GetUserId();
            await _ragChatService.DeleteConversationAsync(id, userId);
            return NoContent();
        }

        [HttpPost("conversations/{id}/messages")]
        public async Task<IActionResult> SendMessage(Guid id, [FromBody] SendMessageRequest request)
        {
            var userId = GetUserId();
            var response = await _ragChatService.SendMessageAsync(id, userId, request);
            return Ok(response);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("embeddings/generate/{recordingId}")]
        public async Task<IActionResult> GenerateEmbedding(Guid recordingId, [FromQuery] string textContent)
        {
            await _embeddingService.GenerateAndStoreEmbeddingAsync(recordingId, textContent);
            return Ok("Embedding generated and stored.");
        }
    }
}
