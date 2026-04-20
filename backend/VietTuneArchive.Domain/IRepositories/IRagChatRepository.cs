using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface IRagChatRepository
    {
        // QAConversations
        Task<QAConversation> CreateConversationAsync(Guid userId, string? title);
        Task<List<QAConversation>> GetUserConversationsAsync(Guid userId);
        Task<QAConversation?> GetConversationWithMessagesAsync(Guid conversationId);
        Task DeleteConversationAsync(Guid conversationId);

        // QAMessages
        Task<QAMessage> AddMessageAsync(QAMessage message);
        Task<List<QAMessage>> GetConversationMessagesAsync(Guid conversationId, int limit = 50);

        // Vector search
        Task<List<VectorEmbedding>> GetAllEmbeddingsAsync();
        Task SaveEmbeddingAsync(VectorEmbedding embedding);
    }
}
