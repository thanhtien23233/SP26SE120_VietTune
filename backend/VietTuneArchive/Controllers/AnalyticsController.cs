using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
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
        /// GET /api/Analytics/coverage
        /// Coverage chart / gap analysis by ethnicity-region
        /// </summary>
        [HttpGet("coverage")]
        public async Task<IActionResult> GetCoverage()
        {
            var result = await _analyticsService.GetCoverageAsync();
            if (result.IsSuccess)
            {
                return Ok(new { data = result.Data });
            }
            return BadRequest(result);
        }

        /// <summary>
        /// GET /api/Analytics/content?type=songs
        /// Content analytics cards (totalSongs, byEthnicity, byRegion)
        /// </summary>
        [HttpGet("content")]
        public async Task<IActionResult> GetContentAnalytics([FromQuery] string type = "songs")
        {
            var result = await _analyticsService.GetContentAnalyticsAsync(type);
            if (result.IsSuccess)
            {
                return Ok(new { data = result.Data });
            }
            return BadRequest(result);
        }

        /// <summary>
        /// GET /api/Analytics/experts?period=30d
        /// Expert performance table + average accuracy
        /// </summary>
        [HttpGet("experts")]
        public async Task<IActionResult> GetExpertPerformance([FromQuery] string period = "30d")
        {
            var result = await _analyticsService.GetExpertPerformanceAsync(period);
            if (result.IsSuccess)
            {
                return Ok(new { data = result.Data });
            }
            return BadRequest(result);
        }

        /// <summary>
        /// GET /api/Analytics/contributors
        /// Contributor leaderboard
        /// </summary>
        [HttpGet("contributors")]
        public async Task<IActionResult> GetContributorLeaderboard()
        {
            var result = await _analyticsService.GetContributorLeaderboardAsync();
            if (result.IsSuccess)
            {
                return Ok(new { data = result.Data });
            }
            return BadRequest(result);
        }
    }
}