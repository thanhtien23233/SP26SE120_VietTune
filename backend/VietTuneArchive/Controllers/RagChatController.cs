using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs.Request;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/rag-chat")]
    [ApiController]
    [Authorize]
    public class RagChatController : ControllerBase
    {
        private readonly IRagChatService _ragChatService;
        private readonly IEmbeddingService _embeddingService; // Local Python 384-dim
        private readonly IVectorEmbeddingService _geminiVectorService; // Gemini 768-dim
        private readonly IKnowledgeRetrievalService _retrievalService;

        public RagChatController(
            IRagChatService ragChatService,
            IEmbeddingService embeddingService,
            IVectorEmbeddingService geminiVectorService,
            IKnowledgeRetrievalService retrievalService)
        {
            _ragChatService = ragChatService;
            _embeddingService = embeddingService;
            _geminiVectorService = geminiVectorService;
            _retrievalService = retrievalService;
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
        [HttpPost("embeddings/backfill")]
        public async Task<IActionResult> BackfillEmbeddings()
        {
            var count = await _embeddingService.BackfillAllMissingEmbeddingsAsync();
            return Ok(new { Message = $"Local (384-dim) Backfill completed. {count} items processed." });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("embeddings/backfill-768")]
        public async Task<IActionResult> BackfillGeminiEmbeddings()
        {
            var count = await _geminiVectorService.BackfillAll768Async();
            return Ok(new { Message = $"Gemini (768-dim) Backfill completed. {count} items processed." });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("embeddings/regenerate/{recordingId}")]
        public async Task<IActionResult> RegenerateEmbedding(Guid recordingId)
        {
            await _embeddingService.GenerateEmbeddingForRecordingAsync(recordingId);
            return Ok("Embedding re-generated.");
        }

        // Old endpoint preserved for compatibility if needed, but updated to use new logic
        [Authorize(Roles = "Admin")]
        [HttpPost("embeddings/generate/{recordingId}")]
        public async Task<IActionResult> GenerateEmbedding(Guid recordingId)
        {
            await _embeddingService.GenerateEmbeddingForRecordingAsync(recordingId);
            return Ok("Embedding generated.");
        }
    }
}
