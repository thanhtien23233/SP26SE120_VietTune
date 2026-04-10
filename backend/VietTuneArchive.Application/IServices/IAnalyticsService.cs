using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;
using static VietTuneArchive.Application.Mapper.DTOs.AnalyticsDto;

namespace VietTuneArchive.Application.IServices
{
    public interface IAnalyticsService
    {
        /// <summary>
        /// Get coverage chart data by ethnicity and region
        /// </summary>
        Task<Result<List<CoverageChartDto>>> GetCoverageAsync();

        /// <summary>
        /// Get content analytics including total songs and distribution by ethnicity/region
        /// </summary>
        Task<Result<ContentAnalyticsResponseDto>> GetContentAnalyticsAsync(string type = "songs");

        /// <summary>
        /// Get expert performance metrics for a specific period
        /// </summary>
        Task<Result<List<ExpertPerformanceResponseDto>>> GetExpertPerformanceAsync(string period = "30d");

        /// <summary>
        /// Get contributor leaderboard
        /// </summary>
        Task<Result<List<ContributorLeaderboardDto>>> GetContributorLeaderboardAsync();
    }
}
