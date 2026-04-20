using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/audio-analysis")]
    [ApiController]
    public class AudioAnalysisController : ControllerBase
    {
        private readonly IInstrumentDetectionService _detectionService;
        private readonly DBContext _dbContext;
        private readonly ILogger<AudioAnalysisController> _logger;
        private static readonly HttpClient _httpClient = new HttpClient();

        public AudioAnalysisController(
            IInstrumentDetectionService detectionService,
            DBContext dbContext,
            ILogger<AudioAnalysisController> logger)
        {
            _detectionService = detectionService;
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Detect multiple instruments from an uploaded audio file using standalone Python service.
        /// </summary>
        [HttpPost("detect-instruments")]
        [AllowAnonymous]
        [RequestSizeLimit(50 * 1024 * 1024)] // 50MB
        public async Task<ActionResult<ServiceResponse<PythonAnalyzeData>>> DetectInstruments(IFormFile file, [FromQuery] bool includeTimeline = false)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new ServiceResponse<PythonAnalyzeData> { Success = false, Message = "No file uploaded." });

            var allowedExtensions = new[] { ".wav", ".mp3" };
            var extension = Path.GetExtension(file.FileName).ToLower();
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new ServiceResponse<PythonAnalyzeData> { Success = false, Message = "Invalid file format. Only .wav and .mp3 are supported." });

            try
            {
                using var stream = file.OpenReadStream();
                var result = await _detectionService.DetectInstrumentsAsync(stream, file.FileName, includeTimeline);

                if (!result.Success)
                {
                    return BadRequest(new ServiceResponse<PythonAnalyzeData> { Success = false, Message = result.Error ?? "Detection failed." });
                }

                return Ok(new ServiceResponse<PythonAnalyzeData>
                {
                    Success = true,
                    Data = result.Data,
                    Message = "Instrument detection successful."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error detecting instruments for file {FileName}", file.FileName);
                return StatusCode(500, new ServiceResponse<PythonAnalyzeData>
                {
                    Success = false,
                    Message = $"Internal server error: {ex.Message}",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        /// <summary>
        /// Analyze a recorded audio file from URL and save result to database.
        /// </summary>
        [HttpPost("analyze-recording/{recordingId:guid}")]
        [Authorize(Roles = "Admin,Expert")]
        public async Task<ActionResult<ServiceResponse<PythonAnalyzeData>>> AnalyzeRecording(Guid recordingId)
        {
            try
            {
                var recording = await _dbContext.Recordings.FindAsync(recordingId);
                if (recording == null)
                    return NotFound(new ServiceResponse<PythonAnalyzeData> { Success = false, Message = $"Recording with ID {recordingId} not found." });

                if (string.IsNullOrEmpty(recording.AudioFileUrl))
                    return BadRequest(new ServiceResponse<PythonAnalyzeData> { Success = false, Message = "Recording does not have an audio URL." });

                _logger.LogInformation("Downloading audio from {Url} for recording {RecordingId}", recording.AudioFileUrl, recordingId);

                using var response = await _httpClient.GetAsync(recording.AudioFileUrl);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to download audio file from {Url}. Status: {StatusCode}", recording.AudioFileUrl, response.StatusCode);
                    return StatusCode((int)response.StatusCode, new ServiceResponse<PythonAnalyzeData> { Success = false, Message = "Failed to download audio file from storage." });
                }

                using var stream = await response.Content.ReadAsStreamAsync();
                var result = await _detectionService.DetectInstrumentsAsync(stream, "recording.wav", true);

                if (!result.Success)
                {
                    return BadRequest(new ServiceResponse<PythonAnalyzeData> { Success = false, Message = result.Error ?? "Analysis failed." });
                }

                var analysisResult = new AudioAnalysisResult
                {
                    Id = Guid.NewGuid(),
                    RecordingId = recordingId,
                    DetectedInstrumentsJson = JsonSerializer.Serialize(result.Data.Instruments),
                    SuggestedMetadataJson = JsonSerializer.Serialize(result.Data),
                    AnalyzedAt = DateTime.UtcNow
                };

                _dbContext.AudioAnalysisResults.Add(analysisResult);
                await _dbContext.SaveChangesAsync();

                return Ok(new ServiceResponse<PythonAnalyzeData>
                {
                    Success = true,
                    Data = result.Data,
                    Message = "Recording analysis successful and saved to database."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing recording {RecordingId}", recordingId);
                return StatusCode(500, new ServiceResponse<PythonAnalyzeData>
                {
                    Success = false,
                    Message = $"Internal server error: {ex.Message}",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        /// <summary>
        /// Get a list of instruments supported by the Python service.
        /// </summary>
        [HttpGet("supported-instruments")]
        public async Task<ActionResult<ServiceResponse<string[]>>> GetSupportedInstruments()
        {
            var instruments = await _detectionService.GetSupportedInstrumentsAsync();
            return Ok(new ServiceResponse<string[]>
            {
                Success = true,
                Data = instruments,
                Message = "Retrieved supported instruments."
            });
        }

    }
}
