using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Responses;
using static VietTuneArchive.Application.Mapper.DTOs.AnalyticsDto;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _analyticsService;

        public AnalyticsController(IAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService ?? throw new ArgumentNullException(nameof(analyticsService));
        }

        /// <summary>
        /// GET /api/Analytics/overview
        /// </summary>
        [HttpGet("overview")]
        public async Task<ActionResult<ServiceResponse<OverviewMetricsDto>>> GetOverview()
        {
            var data = new OverviewMetricsDto();
            return Ok(new ServiceResponse<OverviewMetricsDto> { Success = true, Data = data, Message = "Not implemented yet" });
        }

        /// <summary>
        /// GET /api/Analytics/submissions
        /// </summary>
        [HttpGet("submissions")]
        public async Task<ActionResult<ServiceResponse<SubmissionAnalyticsDto>>> GetSubmissions()
        {
            var data = new SubmissionAnalyticsDto();
            return Ok(new ServiceResponse<SubmissionAnalyticsDto> { Success = true, Data = data, Message = "Not implemented yet" });
        }

        /// <summary>
        /// GET /api/Analytics/coverage
        /// Coverage chart / gap analysis by ethnicity-region
        /// </summary>
        [HttpGet("coverage")]
        public async Task<ActionResult<ServiceResponse<List<CoverageChartDto>>>> GetCoverage()
        {
            var result = await _analyticsService.GetCoverageAsync();
            if (result.IsSuccess)
            {
                return Ok(new ServiceResponse<List<CoverageChartDto>> { Success = true, Data = result.Data, Message = result.Message });
            }
            return BadRequest(new ServiceResponse<List<CoverageChartDto>> { Success = false, Errors = new List<string> { result.Message } });
        }

        /// <summary>
        /// GET /api/Analytics/content?type=songs
        /// Content analytics cards (totalSongs, byEthnicity, byRegion)
        /// </summary>
        [HttpGet("content")]
        public async Task<ActionResult<ServiceResponse<ContentAnalyticsResponseDto>>> GetContentAnalytics([FromQuery] string type = "songs")
        {
            var result = await _analyticsService.GetContentAnalyticsAsync(type);
            if (result.IsSuccess)
            {
                return Ok(new ServiceResponse<ContentAnalyticsResponseDto> { Success = true, Data = result.Data, Message = result.Message });
            }
            return BadRequest(new ServiceResponse<ContentAnalyticsResponseDto> { Success = false, Errors = new List<string> { result.Message } });
        }

        /// <summary>
        /// GET /api/Analytics/experts?period=30d
        /// Expert performance table + average accuracy
        /// </summary>
        [HttpGet("experts")]
        public async Task<ActionResult<ServiceResponse<List<ExpertPerformanceResponseDto>>>> GetExpertPerformance([FromQuery] string period = "30d")
        {
            var result = await _analyticsService.GetExpertPerformanceAsync(period);
            if (result.IsSuccess)
            {
                return Ok(new ServiceResponse<List<ExpertPerformanceResponseDto>> { Success = true, Data = result.Data, Message = result.Message });
            }
            return BadRequest(new ServiceResponse<List<ExpertPerformanceResponseDto>> { Success = false, Errors = new List<string> { result.Message } });
        }

        /// <summary>
        /// GET /api/Analytics/contributors
        /// Contributor leaderboard
        /// </summary>
        [HttpGet("contributors")]
        public async Task<ActionResult<ServiceResponse<List<ContributorLeaderboardDto>>>> GetContributorLeaderboard()
        {
            var result = await _analyticsService.GetContributorLeaderboardAsync();
            if (result.IsSuccess)
            {
                return Ok(new ServiceResponse<List<ContributorLeaderboardDto>> { Success = true, Data = result.Data, Message = result.Message });
            }
            return BadRequest(new ServiceResponse<List<ContributorLeaderboardDto>> { Success = false, Errors = new List<string> { result.Message } });
        }
    }
}