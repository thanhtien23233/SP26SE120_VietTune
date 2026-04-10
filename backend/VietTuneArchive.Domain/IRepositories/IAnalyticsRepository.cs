using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface IAnalyticsRepository
    {
        /// <summary>
        /// Get coverage data by ethnicity and region
        /// </summary>
        Task<List<(string EthnicityName, string RegionCode, int Count)>> GetCoverageByEthnicityAndRegionAsync();

        /// <summary>
        /// Get total count of recordings
        /// </summary>
        Task<int> GetTotalRecordingsAsync();

        /// <summary>
        /// Get recordings grouped by ethnicity
        /// </summary>
        Task<Dictionary<string, int>> GetRecordingsByEthnicityAsync();

        /// <summary>
        /// Get recordings grouped by region
        /// </summary>
        Task<Dictionary<string, int>> GetRecordingsByRegionAsync();

        /// <summary>
        /// Get expert performance data for a specific period (days)
        /// </summary>
        Task<List<(Guid ExpertId, string Name, int ReviewCount, double Accuracy, TimeSpan AvgTime)>> GetExpertPerformanceAsync(int periodDays = 30);

        /// <summary>
        /// Get contributor leaderboard
        /// </summary>
        Task<List<(Guid UserId, string Email, string FullName, int ContributionCount, int ApprovedCount, int RejectedCount)>> GetContributorLeaderboardAsync();
    }
}
