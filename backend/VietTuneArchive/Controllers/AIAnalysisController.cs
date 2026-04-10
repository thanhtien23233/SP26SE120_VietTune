using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using static VietTuneArchive.Application.Mapper.DTOs.AudioAnalysisResultDto;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class AIAnalysisController : ControllerBase
    {
        private readonly IAudioProcessingService _processingService;
        private readonly ITranscriptionService _transcriptionService;
        private readonly ILogger<AIAnalysisController> _logger;

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous";

        public AIAnalysisController(
            IAudioProcessingService processingService,
            ITranscriptionService transcriptionService,
            ILogger<AIAnalysisController> logger)
        {
            _processingService = processingService;
            _transcriptionService = transcriptionService;
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

        // API 1: CHỈ TRANSCRIBE (Whisper)
        [HttpPost("transcribe-only")]
        [AllowAnonymous]
        public async Task<ActionResult<TranscriptionResultDto>> TranscribeOnly(IFormFile audioFile)
        {
            if (audioFile == null || audioFile.Length == 0)
                return BadRequest("Audio file is required.");

            // Validate extension
            var ext = Path.GetExtension(audioFile.FileName).ToLower();
            var allowedExtensions = new[] { ".flac", ".wav", ".mp3", ".m4a", ".ogg", ".webm" };
            if (!allowedExtensions.Contains(ext))
                return BadRequest("Unsupported audio format. Allowed: .flac, .wav, .mp3, .m4a, .ogg, .webm");

            // Validate size (25MB limit for OpenAI Whisper)
            if (audioFile.Length > 25 * 1024 * 1024)
                return BadRequest("File size exceeds 25MB limit for Whisper API.");

            try
            {
                _logger.LogInformation("Transcribing file: {FileName}, Size: {Size} bytes", audioFile.FileName, audioFile.Length);
                var result = await _transcriptionService.TranscribeAsync(audioFile);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Transcription failed for file {FileName}", audioFile.FileName);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // API 2: VỪA PHÂN TÍCH VỪA TRANSCRIBE (Gemini + Whisper song song)
        [HttpPost("analyze-and-transcribe")]
        [AllowAnonymous]
        public async Task<ActionResult<AnalyzeAndTranscribeResultDto>> AnalyzeAndTranscribe(IFormFile audioFile)
        {
            if (audioFile == null || audioFile.Length == 0)
                return BadRequest("Audio file is required.");

            var ext = Path.GetExtension(audioFile.FileName).ToLower();
            var allowedExtensions = new[] { ".flac", ".wav", ".mp3", ".m4a", ".ogg", ".webm" };
            if (!allowedExtensions.Contains(ext))
                return BadRequest("Unsupported audio format.");

            if (audioFile.Length > 25 * 1024 * 1024)
                return BadRequest("File size exceeds 25MB limit.");

            var startTime = DateTime.UtcNow;

            try
            {
                // Vì IFormFile stream chỉ đọc được một lần, ta cần copy vào memory
                using var memoryStream = new MemoryStream();
                await audioFile.CopyToAsync(memoryStream);
                var fileBytes = memoryStream.ToArray();

                // Tạo các stream riêng cho từng task
                using var analysisStream = new MemoryStream(fileBytes);
                using var transcriptionStream = new MemoryStream(fileBytes);

                // Mock IFormFile cho AnalyzeAudioAsync nếu nó yêu cầu
                var analysisFile = new FormFile(analysisStream, 0, fileBytes.Length, "audioFile", audioFile.FileName)
                {
                    Headers = audioFile.Headers,
                    ContentType = audioFile.ContentType
                };

                _logger.LogInformation("Starting parallel analysis and transcription for: {FileName}", audioFile.FileName);

                var analysisTask = _processingService.AnalyzeAudioAsync(analysisFile);
                var transcriptionTask = _transcriptionService.TranscribeAsync(transcriptionStream, audioFile.FileName);

                await Task.WhenAll(analysisTask, transcriptionTask);

                var executionTime = DateTime.UtcNow - startTime;
                _logger.LogInformation("Parallel execution completed in {Duration}ms", executionTime.TotalMilliseconds);

                return Ok(new AnalyzeAndTranscribeResultDto
                {
                    Analysis = analysisTask.Result,
                    Transcription = transcriptionTask.Result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Combined analysis and transcription failed for {FileName}", audioFile.FileName);
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
