using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Helpers;
using static VietTuneArchive.Application.Mapper.DTOs.AudioAnalysisResultDto;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class AIAnalysisController : ControllerBase
    {
        private readonly IAudioProcessingService _processingService;
        private readonly ILocalWhisperService _localWhisperService;
        private readonly ILogger<AIAnalysisController> _logger;

        public AIAnalysisController(
            IAudioProcessingService processingService,
            ILocalWhisperService localWhisperService,
            ILogger<AIAnalysisController> logger)
        {
            _processingService = processingService;
            _localWhisperService = localWhisperService;
            _logger = logger;
        }

        // CHỨC NĂNG 2: CHỈ PHÂN TÍCH AI (TRẢ VỀ KẾT QUẢ + URL TẠM CỦA GEMINI)
        // GIỮ NGUYÊN - KHÔNG ĐƯỢC SỬA THEO YÊU CẦU
        [HttpPost("analyze-only")]
        [AllowAnonymous]
        public async Task<ActionResult<AIAnalysisResultDto>> AnalyzeOnly(IFormFile audioFile)
        {
            var result = await _processingService.AnalyzeAudioAsync(audioFile);
            return Ok(result);
        }

        /// <summary>
        /// Endpoint mới 1: Chỉ transcribe bằng local Whisper service
        /// </summary>
        [HttpPost("transcribe-only")]
        [AllowAnonymous]
        public async Task<ActionResult<LocalTranscriptionResultDto>> TranscribeOnly(IFormFile audioFile)
        {
            if (audioFile == null || audioFile.Length == 0)
                return BadRequest("Audio file is required.");

            // Validate extension
            var ext = Path.GetExtension(audioFile.FileName).ToLower();
            var allowedExtensions = new[] { ".flac", ".wav", ".mp3", ".m4a", ".ogg", ".webm", ".mp4" };
            if (!allowedExtensions.Contains(ext))
                return BadRequest("Unsupported audio format. Allowed: .flac, .wav, .mp3, .m4a, .ogg, .webm, .mp4");

            // Validate size (local service can handle more, set to 100MB as per prompt)
            if (audioFile.Length > 100 * 1024 * 1024)
                return BadRequest("File size exceeds 100MB limit for local Whisper service.");

            try
            {
                _logger.LogInformation("Transcribing file locally: {FileName}, Size: {Size} bytes", audioFile.FileName, audioFile.Length);
                var result = await _localWhisperService.TranscribeAsync(audioFile);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Local transcription failed for file {FileName}", audioFile.FileName);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Endpoint mới 2: Chạy SONG SONG phân tích metadata + transcribe local
        /// </summary>
        [HttpPost("analyze-and-transcribe")]
        [AllowAnonymous]
        public async Task<ActionResult<AnalyzeAndTranscribeResultDto>> AnalyzeAndTranscribe(IFormFile audioFile)
        {
            if (audioFile == null || audioFile.Length == 0)
                return BadRequest("Audio file is required.");

            var ext = Path.GetExtension(audioFile.FileName).ToLower();
            var allowedExtensions = new[] { ".flac", ".wav", ".mp3", ".m4a", ".ogg", ".webm", ".mp4" };
            if (!allowedExtensions.Contains(ext))
                return BadRequest("Unsupported audio format.");

            if (audioFile.Length > 100 * 1024 * 1024)
                return BadRequest("File size exceeds 100MB limit.");

            try
            {
                _logger.LogInformation("Starting parallel analysis and local transcription for: {FileName}", audioFile.FileName);

                // Copy file vào memory vì stream chỉ được đọc 1 lần
                using var memoryStream = new MemoryStream();
                await audioFile.CopyToAsync(memoryStream);
                var fileBytes = memoryStream.ToArray();

                AIAnalysisResultDto? analysisResult = null;
                LocalTranscriptionResultDto? transcriptionResult = null;
                var errors = new Dictionary<string, string>();

                // Chạy 2 task song song và bắt exception từng task để không làm mất kết quả task kia
                var analysisTask = Task.Run(async () => {
                    try { 
                        var analysisFile = FormFileHelper.CreateFromBytes(fileBytes, audioFile.FileName, audioFile.ContentType);
                        analysisResult = await _processingService.AnalyzeAudioAsync(analysisFile); 
                    }
                    catch (Exception ex) { 
                        _logger.LogError(ex, "Analysis task failed");
                        errors["analysis"] = ex.Message; 
                    }
                });

                var transcribeTask = Task.Run(async () => {
                    try { 
                        var transcriptionFile = FormFileHelper.CreateFromBytes(fileBytes, audioFile.FileName, audioFile.ContentType);
                        transcriptionResult = await _localWhisperService.TranscribeAsync(transcriptionFile); 
                    }
                    catch (Exception ex) { 
                        _logger.LogError(ex, "Transcription task failed");
                        errors["transcription"] = ex.Message; 
                    }
                });

                await Task.WhenAll(analysisTask, transcribeTask);

                var result = new AnalyzeAndTranscribeResultDto
                {
                    Analysis = analysisResult,
                    Transcription = transcriptionResult,
                    Errors = errors.Count > 0 ? errors : null
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Combined analysis and local transcription failed for {FileName}", audioFile.FileName);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Endpoint mới 3: Kiểm tra Python Whisper service có sẵn sàng không
        /// </summary>
        [HttpGet("whisper-health")]
        [AllowAnonymous]
        public async Task<ActionResult> WhisperHealth()
        {
            var isHealthy = await _localWhisperService.IsHealthyAsync();
            if (isHealthy)
            {
                return Ok(new { status = "healthy" });
            }
            return StatusCode(503, new { status = "unhealthy", message = "Whisper service is not available" });
        }
    }
}
