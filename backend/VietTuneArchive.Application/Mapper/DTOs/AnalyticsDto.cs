namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AnalyticsDto
    {
        public class OverviewMetricsDto
        {
            public int TotalSongs { get; set; }
            public int TotalViews { get; set; }
            public int ActiveUsers { get; set; }
            public int NewSubmissions { get; set; }
            public double GrowthRate { get; set; }  // %
        }

        public class SubmissionAnalyticsDto
        {
            public int Total { get; set; }
            public Dictionary<string, int> ByStatus { get; set; } = new();
            public string AvgReviewTime { get; set; } = default!;
            public string[] TopEthnicGroups { get; set; } = default!;
        }

        public class CoverageAnalyticsDto
        {
            public List<EthnicCoverageDto> EthnicGroups { get; set; } = new();
            public string[] Gaps { get; set; } = default!;
        }

        public class EthnicCoverageDto
        {
            public string Name { get; set; } = default!;
            public double Coverage { get; set; }  // %
            public int Songs { get; set; }
        }

        public class ContributorDto
        {
            public string UserId { get; set; } = default!;
            public string Name { get; set; } = default!;
            public int Songs { get; set; }
            public int Reviews { get; set; }
        }

        public class ExpertPerformanceDto
        {
            public string ExpertId { get; set; } = default!;
            public string Name { get; set; } = default!;
            public int Reviews { get; set; }
            public double Accuracy { get; set; }  // %
            public string AvgTime { get; set; } = default!;
        }

        public class ContentAnalyticsDto
        {
            public int TotalSongs { get; set; }
            public Dictionary<string, int> ByEthnicity { get; set; } = new();
            public Dictionary<string, int> ByRegion { get; set; } = new();
            public List<string> MostViewedSongs { get; set; } = new();
        }

        public class CoverageChartDto
        {
            public string Name { get; set; } = default!;
            public string Label { get; set; } = default!;
            public string Ethnicity { get; set; } = default!;
            public string Region { get; set; } = default!;
            public int Count { get; set; }
            public int Value { get; set; }
        }

        public class ContentAnalyticsResponseDto
        {
            public int TotalSongs { get; set; }
            public Dictionary<string, int> ByEthnicity { get; set; } = new();
            public Dictionary<string, int> ByRegion { get; set; } = new();
        }

        public class ExpertPerformanceResponseDto
        {
            public Guid ExpertId { get; set; }
            public string Name { get; set; } = default!;
            public int Reviews { get; set; }
            public double Accuracy { get; set; }
            public string AvgTime { get; set; } = default!;
        }

        public class ContributorLeaderboardDto
        {
            public Guid UserId { get; set; }
            public string Username { get; set; } = default!;
            public string FullName { get; set; } = default!;
            public int ContributionCount { get; set; }
            public int ApprovedCount { get; set; }
            public int RejectedCount { get; set; }
        }
    }
}
