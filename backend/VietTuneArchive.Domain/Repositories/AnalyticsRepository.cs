using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class AnalyticsRepository : IAnalyticsRepository
    {
        private readonly DBContext _context;

        public AnalyticsRepository(DBContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<List<(string EthnicityName, string RegionCode, int Count)>> GetCoverageByEthnicityAndRegionAsync()
        {
            return await _context.Recordings
                .Where(r => r.Status == SubmissionStatus.Approved)
                .Include(r => r.EthnicGroup)
                .Include(r => r.Commune)
                    .ThenInclude(c => c.District)
                        .ThenInclude(d => d.Province)
                .GroupBy(r => new
                {
                    EthnicityName = r.EthnicGroup.Name,
                    RegionCode = r.Commune.District.Province.RegionCode
                })
                .Select(g => new ValueTuple<string, string, int>(
                    g.Key.EthnicityName,
                    g.Key.RegionCode,
                    g.Count()
                ))
                .ToListAsync();
        }

        public async Task<int> GetTotalRecordingsAsync()
        {
            return await _context.Recordings
                .Where(r => r.Status == SubmissionStatus.Approved)
                .CountAsync();
        }

        public async Task<Dictionary<string, int>> GetRecordingsByEthnicityAsync()
        {
            return await _context.Recordings
                .Where(r => r.Status == SubmissionStatus.Approved)
                .Include(r => r.EthnicGroup)
                .GroupBy(r => r.EthnicGroup.Name)
                .Select(g => new { EthnicGroup = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.EthnicGroup, x => x.Count);
        }

        public async Task<Dictionary<string, int>> GetRecordingsByRegionAsync()
        {
            return await _context.Recordings
                .Where(r => r.Status == SubmissionStatus.Approved)
                .Include(r => r.Commune)
                    .ThenInclude(c => c.District)
                        .ThenInclude(d => d.Province)
                .GroupBy(r => r.Commune.District.Province.RegionCode)
                .Select(g => new { Region = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Region, x => x.Count);
        }

        public async Task<List<(Guid ExpertId, string Name, int ReviewCount, double Accuracy, TimeSpan AvgTime)>> GetExpertPerformanceAsync(int periodDays = 30)
        {
            var startDate = DateTime.UtcNow.AddDays(-periodDays);

            // First, fetch all reviews with reviewer data from database
            var reviews = await _context.Reviews
                .Where(r => r.CreatedAt >= startDate)
                .Include(r => r.Reviewer)
                .ToListAsync();

            // Then perform grouping and calculations on client side (LINQ to Objects)
            var result = reviews
                .GroupBy(r => new { r.ReviewerId, r.Reviewer.FullName })
                .Select(g => new ValueTuple<Guid, string, int, double, TimeSpan>(
                    g.Key.ReviewerId,
                    g.Key.FullName,
                    g.Count(),
                    // Calculate accuracy: (Approve decisions / Total reviews) * 100
                    g.Count() > 0 
                        ? (double)g.Where(r => r.Decision == 0).Count() / g.Count() * 100
                        : 0,
                    // Average review time: average time difference between first and last review (simplified)
                    TimeSpan.FromHours(7) // Default placeholder for average review time
                ))
                .ToList();

            return result;
        }

        public async Task<List<(Guid UserId, string Email, string FullName, int ContributionCount, int ApprovedCount, int RejectedCount)>> GetContributorLeaderboardAsync()
        {
            // First, fetch all submissions with contributor data from database
            var submissions = await _context.Submissions
                .Include(s => s.Contributor)
                .ToListAsync();

            // Then perform grouping and counting on client side (LINQ to Objects)
            var result = submissions
                .GroupBy(s => new { s.ContributorId, s.Contributor.Email, s.Contributor.FullName })
                .Select(g => new ValueTuple<Guid, string, string, int, int, int>(
                    g.Key.ContributorId,
                    g.Key.Email,
                    g.Key.FullName,
                    g.Count(),
                    g.Count(s => s.Status == SubmissionStatus.Approved),
                    g.Count(s => s.Status == SubmissionStatus.Rejected)
                ))
                .OrderByDescending(x => x.Item4) // Order by contribution count
                .ToList();

            return result;
        }
    }
}
