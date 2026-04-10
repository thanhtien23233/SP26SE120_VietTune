namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class RagChatRequest
    {
        public class CreateConversationRequest
        {
            public string? Title { get; set; }
        }

        public class SendMessageRequest
        {
            public string Content { get; set; } = default!;
        }
    }
}
