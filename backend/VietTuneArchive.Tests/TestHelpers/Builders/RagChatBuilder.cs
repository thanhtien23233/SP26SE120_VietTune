using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Application.Mapper.DTOs.Response;
using static VietTuneArchive.Application.Mapper.DTOs.Response.RagChatResponse;

namespace VietTuneArchive.Tests.TestHelpers.Builders;

public class RagChatBuilder
{
    public static QAConversation BuildConversation(Guid conversationId, Guid userId)
    {
        return new QAConversation
        {
            Id = conversationId,
            UserId = userId,
            Title = "Test Conversation",
            CreatedAt = DateTime.UtcNow,
            QAMessages = new List<QAMessage>()
        };
    }

    public static QAMessage BuildMessage(Guid conversationId, int role, string content)
    {
        return new QAMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            Role = role,
            Content = content,
            CreatedAt = DateTime.UtcNow
        };
    }

    public static RetrievedDocument BuildRetrievalDoc(string type, Guid id, string title, double score)
    {
        return new RetrievedDocument
        {
            SourceType = type,
            SourceId = id,
            Title = title,
            Content = "Test content",
            RelevanceScore = score
        };
    }
}
