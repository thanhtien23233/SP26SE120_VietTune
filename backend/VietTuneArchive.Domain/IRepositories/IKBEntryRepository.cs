using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.DTO.KnowledgeBase;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface IKBEntryRepository
    {
        Task<(List<KBEntry> Items, int TotalCount)> GetAllAsync(KBEntryQueryParams queryParams);
        Task<KBEntry?> GetByIdAsync(Guid id);
        Task<KBEntry?> GetBySlugAsync(string slug);
        Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null);
        Task<KBEntry> CreateAsync(KBEntry entry);
        Task UpdateAsync(KBEntry entry);
        Task DeleteAsync(Guid id);

        Task<List<KBCitation>> GetCitationsByEntryIdAsync(Guid entryId);
        Task<KBCitation?> GetCitationByIdAsync(Guid citationId);
        Task<KBCitation> CreateCitationAsync(KBCitation citation);
        Task UpdateCitationAsync(KBCitation citation);
        Task DeleteCitationAsync(Guid citationId);

        Task<List<KBRevision>> GetRevisionsByEntryIdAsync(Guid entryId);
        Task<KBRevision?> GetRevisionByIdAsync(Guid revisionId);
        Task<KBRevision> CreateRevisionAsync(KBRevision revision);
    }
}
