using System.Text;
using System.Text.RegularExpressions;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.DTO.KnowledgeBase;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class NotFoundException : Exception { public NotFoundException(string m) : base(m) { } }
    public class BadRequestException : Exception { public BadRequestException(string m) : base(m) { } }

    public class KBEntryService : IKBEntryService
    {
        private readonly IKBEntryRepository _repo;
        private readonly IEmbeddingService _embeddingService;
        private readonly string[] _validCategories = { "Instrument", "Ceremony", "MusicalTerm", "EthnicGroup", "VocalStyle" };

        public KBEntryService(IKBEntryRepository repo, IEmbeddingService embeddingService)
        {
            _repo = repo;
            _embeddingService = embeddingService;
        }

        public async Task<PagedResponse<KBEntryListItemResponse>> GetEntriesAsync(KBEntryQueryParams queryParams)
        {
            var result = await _repo.GetAllAsync(queryParams);
            var items = result.Items.Select(MapToListResponse).ToList();
            return new PagedResponse<KBEntryListItemResponse>
            {
                Data = items,
                Total = result.TotalCount,
                Page = queryParams.Page,
                PageSize = queryParams.PageSize
            };
        }

        public async Task<KBEntryDetailResponse> GetEntryBySlugAsync(string slug)
        {
            var entry = await _repo.GetBySlugAsync(slug);
            if (entry == null) throw new NotFoundException("Entry not found.");
            return MapToDetailResponse(entry);
        }

        public async Task<KBEntryDetailResponse> GetEntryByIdAsync(Guid id)
        {
            var entry = await _repo.GetByIdAsync(id);
            if (entry == null) throw new NotFoundException("Entry not found.");
            return MapToDetailResponse(entry);
        }

        public async Task<KBEntryDetailResponse> CreateEntryAsync(Guid currentUserId, CreateKBEntryRequest request)
        {
            if (!_validCategories.Contains(request.Category))
                throw new BadRequestException("Invalid category.");

            var slug = await GenerateUniqueSlug(request.Title);

            var entryId = Guid.NewGuid();
            var entry = new KBEntry
            {
                Id = entryId,
                Title = request.Title,
                Content = request.Content,
                Category = request.Category,
                AuthorId = currentUserId,
                CreatedAt = DateTime.UtcNow,
                Status = 0,
                Slug = slug
            };

            await _repo.CreateAsync(entry);

            if (request.Citations != null && request.Citations.Any())
            {
                foreach (var c in request.Citations)
                {
                    await _repo.CreateCitationAsync(new KBCitation
                    {
                        Id = Guid.NewGuid(),
                        EntryId = entryId,
                        Citation = c.Citation,
                        Url = c.Url
                    });
                }
            }

            await _repo.CreateRevisionAsync(new KBRevision
            {
                Id = Guid.NewGuid(),
                EntryId = entryId,
                EditorId = currentUserId,
                Content = request.Content,
                RevisionNote = "Root",
                CreatedAt = DateTime.UtcNow
            });

            return await GetEntryByIdAsync(entryId);
        }

        public async Task<KBEntryDetailResponse> UpdateEntryAsync(Guid currentUserId, Guid entryId, UpdateKBEntryRequest request)
        {
            var entry = await _repo.GetByIdAsync(entryId);
            if (entry == null) throw new NotFoundException("Entry not found.");

            if (!_validCategories.Contains(request.Category))
                throw new BadRequestException("Invalid category.");

            if (entry.Title != request.Title)
            {
                entry.Slug = await GenerateUniqueSlug(request.Title, entryId);
            }

            entry.Title = request.Title;
            entry.Content = request.Content;
            entry.Category = request.Category;
            entry.UpdatedAt = DateTime.UtcNow;

            await _repo.UpdateAsync(entry);

            await _repo.CreateRevisionAsync(new KBRevision
            {
                Id = Guid.NewGuid(),
                EntryId = entryId,
                EditorId = currentUserId,
                Content = request.Content,
                RevisionNote = request.RevisionNote ?? "Update",
                CreatedAt = DateTime.UtcNow
            });

            return await GetEntryByIdAsync(entryId);
        }

        public async Task UpdateEntryStatusAsync(Guid currentUserId, Guid entryId, UpdateKBEntryStatusRequest request)
        {
            var entry = await _repo.GetByIdAsync(entryId);
            if (entry == null) throw new NotFoundException("Entry not found.");

            if (request.Status < 0 || request.Status > 2)
                throw new BadRequestException("Invalid status.");

            entry.Status = request.Status;
            entry.UpdatedAt = DateTime.UtcNow;
            await _repo.UpdateAsync(entry);

            // Auto-generate embedding when published
            if (entry.Status == 1)
            {
                // We run it synchronously or await it to ensure it is populated immediately.
                await _embeddingService.GenerateEmbeddingForKBEntryAsync(entry.Id);
            }
        }

        public async Task DeleteEntryAsync(Guid entryId)
        {
            await _repo.DeleteAsync(entryId);
        }

        public async Task<KBCitationResponse> AddCitationAsync(Guid entryId, CreateKBCitationRequest request)
        {
            var entry = await _repo.GetByIdAsync(entryId);
            if (entry == null) throw new NotFoundException("Entry not found.");

            var citation = new KBCitation
            {
                Id = Guid.NewGuid(),
                EntryId = entryId,
                Citation = request.Citation,
                Url = request.Url
            };
            await _repo.CreateCitationAsync(citation);
            return MapToCitationResponse(citation);
        }

        public async Task<KBCitationResponse> UpdateCitationAsync(Guid citationId, UpdateKBCitationRequest request)
        {
            var citation = await _repo.GetCitationByIdAsync(citationId);
            if (citation == null) throw new NotFoundException("Citation not found.");

            citation.Citation = request.Citation;
            citation.Url = request.Url;
            await _repo.UpdateCitationAsync(citation);

            return MapToCitationResponse(citation);
        }

        public async Task DeleteCitationAsync(Guid citationId)
        {
            await _repo.DeleteCitationAsync(citationId);
        }

        public async Task<List<KBRevisionResponse>> GetRevisionsAsync(Guid entryId)
        {
            var revisions = await _repo.GetRevisionsByEntryIdAsync(entryId);
            return revisions.Select(MapToRevisionResponse).ToList();
        }

        public async Task<KBRevisionDetailResponse> GetRevisionDetailAsync(Guid revisionId)
        {
            var revision = await _repo.GetRevisionByIdAsync(revisionId);
            if (revision == null) throw new NotFoundException("Revision not found.");

            return new KBRevisionDetailResponse
            {
                Id = revision.Id,
                EntryId = revision.EntryId,
                Content = revision.Content,
                RevisionNote = revision.RevisionNote,
                Editor = MapToAuthorResponse(revision.Editor),
                CreatedAt = revision.CreatedAt
            };
        }

        private async Task<string> GenerateUniqueSlug(string title, Guid? excludeId = null)
        {
            string slug = ToSlug(title);
            string uniqueSlug = slug;
            int counter = 2;

            while (await _repo.SlugExistsAsync(uniqueSlug, excludeId))
            {
                uniqueSlug = $"{slug}-{counter}";
                counter++;
            }
            return uniqueSlug;
        }

        private static string ToSlug(string s)
        {
            s = s.ToLower().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (char c in s)
            {
                if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }
            s = sb.ToString().Normalize(NormalizationForm.FormC);
            s = Regex.Replace(s, @"[^a-z0-9\s-]", "");
            s = Regex.Replace(s, @"\s+", "-").Trim('-');
            return s;
        }

        private KBEntryListItemResponse MapToListResponse(KBEntry entry) => new KBEntryListItemResponse
        {
            Id = entry.Id,
            Title = entry.Title,
            Slug = entry.Slug,
            Category = entry.Category,
            Status = entry.Status,
            Author = MapToAuthorResponse(entry.Author),
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        };

        private KBEntryDetailResponse MapToDetailResponse(KBEntry entry) => new KBEntryDetailResponse
        {
            Id = entry.Id,
            Title = entry.Title,
            Slug = entry.Slug,
            Content = entry.Content,
            Category = entry.Category,
            Status = entry.Status,
            Author = MapToAuthorResponse(entry.Author),
            Citations = entry.KBCitations?.Select(MapToCitationResponse).ToList() ?? new List<KBCitationResponse>(),
            LatestRevision = entry.KBRevisions?.OrderByDescending(r => r.CreatedAt).Select(MapToRevisionResponse).FirstOrDefault(),
            RevisionCount = entry.KBRevisions?.Count ?? 0,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        };

        private KBAuthorResponse MapToAuthorResponse(User user) => user == null ? null : new KBAuthorResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            AvatarUrl = user.AvatarUrl,
            Role = user.Role.ToString()
        };

        private KBCitationResponse MapToCitationResponse(KBCitation c) => new KBCitationResponse
        {
            Id = c.Id,
            Citation = c.Citation,
            Url = c.Url
        };

        private KBRevisionResponse MapToRevisionResponse(KBRevision r) => new KBRevisionResponse
        {
            Id = r.Id,
            EntryId = r.EntryId,
            Editor = MapToAuthorResponse(r.Editor),
            RevisionNote = r.RevisionNote,
            CreatedAt = r.CreatedAt
        };
    }
}
