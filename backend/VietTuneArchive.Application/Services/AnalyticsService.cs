using AutoMapper;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.IRepositories;
using static VietTuneArchive.Application.Mapper.DTOs.AnalyticsDto;

namespace VietTuneArchive.Application.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private readonly IAnalyticsRepository _analyticsRepository;
        private readonly IMapper _mapper;
        private readonly ILogger<AnalyticsService> _logger;

        public AnalyticsService(
            IAnalyticsRepository analyticsRepository,
            IMapper mapper,
            ILogger<AnalyticsService> logger)
        {
            _analyticsRepository = analyticsRepository ?? throw new ArgumentNullException(nameof(analyticsRepository));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<Result<List<CoverageChartDto>>> GetCoverageAsync()
        {
            try
            {
                var coverage = await _analyticsRepository.GetCoverageByEthnicityAndRegionAsync();

                // Map region code to region name (simplified mapping)
                var regionNames = new Dictionary<string, string>
                {
                    { "Northwest", "Tây B?c" },
                    { "Northeast", "?ông B?c" },
                    { "Red River", "Sông H?ng" },
                    { "North Central", "B?c Trung B?" },
                    { "South Central", "Nam Trung B?" },
                    { "Central Highlands", "Tây Nguyên" },
                    { "Southeast", "?ông Nam B?" },
                    { "Mekong Delta", "??ng B?ng Sông C?u Long" }
                };

                var result = coverage
                    .GroupBy(c => new { c.EthnicityName, c.RegionCode })
                    .Select(g => new CoverageChartDto
                    {
                        Name = g.Key.EthnicityName,
                        Label = $"{g.Key.EthnicityName} - {(regionNames.TryGetValue(g.Key.RegionCode, out var regionName) ? regionName : g.Key.RegionCode)}",
                        Ethnicity = g.Key.EthnicityName,
                        Region = g.Key.RegionCode,
                        Count = g.Sum(c => c.Count),
                        Value = g.Sum(c => c.Count)
                    })
                    .ToList();

                return new Result<List<CoverageChartDto>>
                {
                    IsSuccess = true,
                    Data = result,
                    Message = "Coverage data retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving coverage data");
                return new Result<List<CoverageChartDto>>
                {
                    IsSuccess = false,
                    Message = $"Error retrieving coverage data: {ex.Message}"
                };
            }
        }

        public async Task<Result<ContentAnalyticsResponseDto>> GetContentAnalyticsAsync(string type = "songs")
        {
            try
            {
                // For now, we only support "songs" type
                if (!string.IsNullOrEmpty(type) && type != "songs")
                {
                    return new Result<ContentAnalyticsResponseDto>
                    {
                        IsSuccess = false,
                        Message = "Only 'songs' type is currently supported"
                    };
                }

                var total = await _analyticsRepository.GetTotalRecordingsAsync();
                var byEthnicity = await _analyticsRepository.GetRecordingsByEthnicityAsync();
                var byRegion = await _analyticsRepository.GetRecordingsByRegionAsync();

                var result = new ContentAnalyticsResponseDto
                {
                    TotalSongs = total,
                    ByEthnicity = byEthnicity ?? new Dictionary<string, int>(),
                    ByRegion = byRegion ?? new Dictionary<string, int>()
                };

                return new Result<ContentAnalyticsResponseDto>
                {
                    IsSuccess = true,
                    Data = result,
                    Message = "Content analytics retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving content analytics");
                return new Result<ContentAnalyticsResponseDto>
                {
                    IsSuccess = false,
                    Message = $"Error retrieving content analytics: {ex.Message}"
                };
            }
        }

        public async Task<Result<List<ExpertPerformanceResponseDto>>> GetExpertPerformanceAsync(string period = "30d")
        {
            try
            {
                // Parse period parameter (e.g., "30d", "7d", "90d")
                int periodDays = 30;
                if (!string.IsNullOrEmpty(period) && period.EndsWith("d"))
                {
                    if (int.TryParse(period.Substring(0, period.Length - 1), out int days))
                    {
                        periodDays = days;
                    }
                }

                var expertData = await _analyticsRepository.GetExpertPerformanceAsync(periodDays);

                var result = expertData
                    .Select(e => new ExpertPerformanceResponseDto
                    {
                        ExpertId = e.ExpertId,
                        Name = e.Name,
                        Reviews = e.ReviewCount,
                        Accuracy = Math.Round(e.Accuracy, 2),
                        AvgTime = e.AvgTime.ToString(@"hh\:mm\:ss")
                    })
                    .ToList();

                return new Result<List<ExpertPerformanceResponseDto>>
                {
                    IsSuccess = true,
                    Data = result,
                    Message = "Expert performance data retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving expert performance data");
                return new Result<List<ExpertPerformanceResponseDto>>
                {
                    IsSuccess = false,
                    Message = $"Error retrieving expert performance data: {ex.Message}"
                };
            }
        }

        public async Task<Result<List<ContributorLeaderboardDto>>> GetContributorLeaderboardAsync()
        {
            try
            {
                var contributorData = await _analyticsRepository.GetContributorLeaderboardAsync();

                var result = contributorData
                    .Select(c => new ContributorLeaderboardDto
                    {
                        UserId = c.UserId,
                        Username = c.Email.Split('@')[0], // Extract username from email
                        FullName = c.FullName,
                        ContributionCount = c.ContributionCount,
                        ApprovedCount = c.ApprovedCount,
                        RejectedCount = c.RejectedCount
                    })
                    .ToList();

                return new Result<List<ContributorLeaderboardDto>>
                {
                    IsSuccess = true,
                    Data = result,
                    Message = "Contributor leaderboard retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving contributor leaderboard");
                return new Result<List<ContributorLeaderboardDto>>
                {
                    IsSuccess = false,
                    Message = $"Error retrieving contributor leaderboard: {ex.Message}"
                };
            }
        }
    }
}
