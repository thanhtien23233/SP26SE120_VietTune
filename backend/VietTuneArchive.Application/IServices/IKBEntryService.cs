using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities.DTO.KnowledgeBase;

namespace VietTuneArchive.Application.IServices
{
    public interface IKBEntryService
    {
        Task<PagedResponse<KBEntryListItemResponse>> GetEntriesAsync(KBEntryQueryParams queryParams);
        Task<KBEntryDetailResponse> GetEntryBySlugAsync(string slug);
        Task<KBEntryDetailResponse> GetEntryByIdAsync(Guid id);
        Task<KBEntryDetailResponse> CreateEntryAsync(Guid currentUserId, CreateKBEntryRequest request);
        Task<KBEntryDetailResponse> UpdateEntryAsync(Guid currentUserId, Guid entryId, UpdateKBEntryRequest request);
        Task UpdateEntryStatusAsync(Guid currentUserId, Guid entryId, UpdateKBEntryStatusRequest request);
        Task DeleteEntryAsync(Guid entryId, Guid currentUserId);

        Task<KBCitationResponse> AddCitationAsync(Guid entryId, CreateKBCitationRequest request);
        Task<KBCitationResponse> UpdateCitationAsync(Guid citationId, UpdateKBCitationRequest request);
        Task DeleteCitationAsync(Guid citationId);

        Task<List<KBRevisionResponse>> GetRevisionsAsync(Guid entryId);
        Task<KBRevisionDetailResponse> GetRevisionDetailAsync(Guid revisionId);
    }
}
