using VietTuneArchive.Application.Mapper.DTOs.Request;
using static VietTuneArchive.Application.Mapper.DTOs.Response.RagChatResponse;

namespace VietTuneArchive.Application.IServices
{
    public interface IRagChatService
    {
        Task<RagConversationResponse> CreateConversationAsync(Guid userId, CreateConversationRequest request);
        Task<List<RagConversationResponse>> GetConversationsAsync(Guid userId);
        Task<RagConversationResponse> GetConversationAsync(Guid conversationId, Guid userId);
        Task DeleteConversationAsync(Guid conversationId, Guid userId);
        Task<RagChatMessageResponse> SendMessageAsync(Guid conversationId, Guid userId, SendMessageRequest request);
    }
}
