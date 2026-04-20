using static VietTuneArchive.Application.Mapper.DTOs.Response.RagChatResponse;

namespace VietTuneArchive.Application.IServices
{
    public interface IKnowledgeRetrievalService
    {
        Task<List<RetrievedDocument>> RetrieveAsync(string question, int maxResults = 10);
    }
}
