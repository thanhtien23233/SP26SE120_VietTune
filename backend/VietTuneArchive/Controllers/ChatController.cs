using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Services;

namespace VietTuneArchive.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IGeminiService _geminiService;

    public ChatController(IGeminiService geminiService)
    {
        _geminiService = geminiService;
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] ChatRequest request, CancellationToken cancellationToken = default)
    {
        var message = request?.Message ?? "";
        if (string.IsNullOrWhiteSpace(message))
            return BadRequest(new { message = "Thiếu nội dung tin nhắn." });

        var result = await _geminiService.GenerateContentAsync(message, systemInstruction: null, cancellationToken);

        if (result.Success)
            return Ok(new { message = result.Message });
        return StatusCode(result.StatusCode, new { message = result.Message });
    }

    public class ChatRequest
    {
        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }
}
