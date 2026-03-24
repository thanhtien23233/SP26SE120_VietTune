using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VietTuneArchive.Application.IServices;
using static VietTuneArchive.Application.Mapper.DTOs.AudioAnalysisResultDto;
using static VietTuneArchive.Application.Mapper.DTOs.CommonDto;
using static VietTuneArchive.Application.Mapper.DTOs.Request.AIAnalysisRequest;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class AIAnalysisController : ControllerBase
    {
        private readonly IAudioProcessingService _processingService;
        private readonly ILogger<AIAnalysisController> _logger;

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous";

        public AIAnalysisController(
            IAudioProcessingService processingService,
            ILogger<AIAnalysisController> logger)
        {
            _processingService = processingService;
            _logger = logger;
        }

        // CHỨC NĂNG 2: CHỈ PHÂN TÍCH AI (TRẢ VỀ KẾT QUẢ + URL TẠM CỦA GEMINI)
        [HttpPost("analyze-only")]
        [AllowAnonymous]
        public async Task<ActionResult<AIAnalysisResultDto>> AnalyzeOnly(IFormFile audioFile)
        {
            // Service này sẽ upload lên Gemini File API và đợi ACTIVE
            // Sau đó trả về kết quả phân tích kèm theo link nội bộ của Gemini (nếu cần)
            var result = await _processingService.AnalyzeAudioAsync(audioFile);
            return Ok(result);
        }
    }
}
