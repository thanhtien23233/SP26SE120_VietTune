using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Domain.IRepositories;
using System.Globalization;
using System.Text;

namespace VietTuneArchive.Domain.Repositories
{
    public class RecordingRepository : GenericRepository<Recording>, IRecordingRepository
    {
        private readonly DBContext _context;
        public RecordingRepository(DBContext context) : base(context)
        {
            _context = context;
        }

        /// <summary>
        /// Remove Vietnamese diacritical marks from text
        /// E.g.: "Ngôi Sao" -> "Ngoi Sao"
        /// </summary>
        private static readonly string[] VietnameseSigns = new string[]
        {
    "aAeEoOuUiIdDyY",
    "áàạảãâấầậẩẫăắằặẳẵ",
    "ÁÀẠẢÃÂẤẦẬẨẪĂẮẰẶẲẴ",
    "éèẹẻẽêếềệểễ",
    "ÉÈẸẺẼÊẾỀỆỂỄ",
    "óòọỏõôốồộổỗơớờợởỡ",
    "ÓÒỌỎÕÔỐỒỘỔỖƠỚỜỢỞỠ",
    "úùụủũưứừựửữ",
    "ÚÙỤỦŨƯỨỪỰỬỮ",
    "íìịỉĩ",
    "ÍÌỊỈĨ",
    "đ",
    "Đ",
    "ýỳỵỷỹ",
    "ÝỲỴỶỸ"
        };

        public static string RemoveVietnameseDiacritics(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return text;

            for (int i = 1; i < VietnameseSigns.Length; i++)
            {
                for (int j = 0; j < VietnameseSigns[i].Length; j++)
                {
                    text = text.Replace(VietnameseSigns[i][j], VietnameseSigns[0][i - 1]);
                }
            }
            return text;
        }

        public async Task<IEnumerable<Recording>> SearchByTitle(string title)
        {
            if (string.IsNullOrWhiteSpace(title))
                return new List<Recording>();

            // Remove diacritics from search input
            string normalizedSearchTitle = RemoveVietnameseDiacritics(title).ToLower();

            // Fetch all approved/embargoed recordings and filter in-memory
            var recordings = await _context.Recordings
                .Include(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Where(r => r.Status == SubmissionStatus.Approved || r.Status == SubmissionStatus.Embargoed)
                .ToListAsync();

            // Filter using normalized titles (client-side)
            return recordings
                .Where(r => RemoveVietnameseDiacritics(r.Title ?? "").ToLower().Contains(normalizedSearchTitle))
                .ToList();
        }

        public async Task<(IEnumerable<Recording> Data, int Total)> SearchByFilterAsync(
            Guid? ethnicGroupId,
            Guid? instrumentId,
            Guid? ceremonyId,
            string? regionCode,
            Guid? communeId,
            int page = 1,
            int pageSize = 10,
            string sortOrder = "desc")
        {
            // Validate pagination parameters
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;
            if (string.IsNullOrWhiteSpace(sortOrder)) sortOrder = "desc";

            // Build query
            var query = _context.Recordings
                .Include(r => r.Commune)
                    .ThenInclude(c => c.District)
                        .ThenInclude(d => d.Province)
                .Include(r => r.EthnicGroup)
                .Include(r => r.Ceremony)
                .Include(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Where(r => r.Status == SubmissionStatus.Approved || r.Status == SubmissionStatus.Embargoed);

            // Apply filters
            if (ethnicGroupId.HasValue && ethnicGroupId.Value != Guid.Empty)
            {
                query = query.Where(r => r.EthnicGroupId == ethnicGroupId.Value);
            }

            if (ceremonyId.HasValue && ceremonyId.Value != Guid.Empty)
            {
                query = query.Where(r => r.CeremonyId == ceremonyId.Value);
            }

            if (communeId.HasValue && communeId.Value != Guid.Empty)
            {
                query = query.Where(r => r.CommuneId == communeId.Value);
            }

            // Filter by region code
            if (!string.IsNullOrWhiteSpace(regionCode))
            {
                query = query.Where(r => r.Commune.District.Province.RegionCode == regionCode);
            }

            // Filter by instrument
            if (instrumentId.HasValue && instrumentId.Value != Guid.Empty)
            {
                query = query.Where(r => r.RecordingInstruments.Any(ri => ri.InstrumentId == instrumentId.Value));
            }

            // Get total count before pagination
            var total = await query.CountAsync();

            // Apply sorting
            if (sortOrder.ToLower() == "asc")
            {
                query = query.OrderBy(r => r.CreatedAt);
            }
            else
            {
                query = query.OrderByDescending(r => r.CreatedAt);
            }

            // Apply pagination
            var data = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }

        public async Task<Recording?> GetByIdWithDetailsAsync(Guid recordingId)
        {
            return await _context.Recordings
                .Include(r => r.EthnicGroup)
                .Include(r => r.Ceremony)
                .Include(r => r.VocalStyle)
                .Include(r => r.MusicalScale)
                .Include(r => r.RecordingInstruments)
                    .ThenInclude(ri => ri.Instrument)
                .Include(r => r.Annotations)
                .FirstOrDefaultAsync(r => r.Id == recordingId);
        }
    }
}
