using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.DTO.KnowledgeBase;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class KBEntryRepository : IKBEntryRepository
    {
        private readonly DBContext _context;

        public KBEntryRepository(DBContext context)
        {
            _context = context;
        }

        public async Task<(List<KBEntry> Items, int TotalCount)> GetAllAsync(KBEntryQueryParams queryParams)
        {
            var query = _context.KBEntries.Include(e => e.Author).AsQueryable();

            if (!string.IsNullOrEmpty(queryParams.Category))
            {
                query = query.Where(e => e.Category == queryParams.Category);
            }

            if (queryParams.Status.HasValue)
            {
                query = query.Where(e => e.Status == queryParams.Status.Value);
            }

            if (!string.IsNullOrEmpty(queryParams.Search))
            {
                query = query.Where(e => EF.Functions.ILike(e.Title, $"%{queryParams.Search}%") ||
                                         EF.Functions.ILike(e.Content, $"%{queryParams.Search}%"));
            }

            var totalCount = await query.CountAsync();

            query = queryParams.SortBy?.ToLower() switch
            {
                "title" => queryParams.SortOrder?.ToLower() == "asc" ? query.OrderBy(e => e.Title) : query.OrderByDescending(e => e.Title),
                "createdat" => queryParams.SortOrder?.ToLower() == "asc" ? query.OrderBy(e => e.CreatedAt) : query.OrderByDescending(e => e.CreatedAt),
                _ => queryParams.SortOrder?.ToLower() == "asc" ? query.OrderBy(e => e.UpdatedAt) : query.OrderByDescending(e => e.UpdatedAt ?? e.CreatedAt),
            };

            var items = await query.Skip((queryParams.Page - 1) * queryParams.PageSize).Take(queryParams.PageSize).ToListAsync();

            return (items, totalCount);
        }

        public async Task<KBEntry?> GetByIdAsync(Guid id)
        {
            return await _context.KBEntries
                .Include(e => e.Author)
                .Include(e => e.KBCitations)
                .Include(e => e.KBRevisions).ThenInclude(r => r.Editor)
                .FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task<KBEntry?> GetBySlugAsync(string slug)
        {
            return await _context.KBEntries
                .Include(e => e.Author)
                .Include(e => e.KBCitations)
                .Include(e => e.KBRevisions).ThenInclude(r => r.Editor)
                .FirstOrDefaultAsync(e => e.Slug == slug);
        }

        public async Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null)
        {
            return await _context.KBEntries.AnyAsync(e => e.Slug == slug && (excludeId == null || e.Id != excludeId));
        }

        public async Task<KBEntry> CreateAsync(KBEntry entry)
        {
            _context.KBEntries.Add(entry);
            await _context.SaveChangesAsync();
            return entry;
        }

        public async Task UpdateAsync(KBEntry entry)
        {
            _context.KBEntries.Update(entry);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var entry = await _context.KBEntries.FindAsync(id);
            if (entry != null)
            {
                _context.KBEntries.Remove(entry);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<KBCitation>> GetCitationsByEntryIdAsync(Guid entryId)
        {
            return await _context.KBCitations.Where(c => c.EntryId == entryId).ToListAsync();
        }

        public async Task<KBCitation?> GetCitationByIdAsync(Guid citationId)
        {
            return await _context.KBCitations.FindAsync(citationId);
        }

        public async Task<KBCitation> CreateCitationAsync(KBCitation citation)
        {
            _context.KBCitations.Add(citation);
            await _context.SaveChangesAsync();
            return citation;
        }

        public async Task UpdateCitationAsync(KBCitation citation)
        {
            _context.KBCitations.Update(citation);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteCitationAsync(Guid citationId)
        {
            var citation = await _context.KBCitations.FindAsync(citationId);
            if (citation != null)
            {
                _context.KBCitations.Remove(citation);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<KBRevision>> GetRevisionsByEntryIdAsync(Guid entryId)
        {
            return await _context.KBRevisions
                .Include(r => r.Editor)
                .Where(r => r.EntryId == entryId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<KBRevision?> GetRevisionByIdAsync(Guid revisionId)
        {
            return await _context.KBRevisions
                .Include(r => r.Editor)
                .FirstOrDefaultAsync(r => r.Id == revisionId);
        }

        public async Task<KBRevision> CreateRevisionAsync(KBRevision revision)
        {
            _context.KBRevisions.Add(revision);
            await _context.SaveChangesAsync();
            return revision;
        }
    }
}
