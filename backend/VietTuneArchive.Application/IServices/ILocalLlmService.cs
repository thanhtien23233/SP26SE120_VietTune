namespace VietTuneArchive.Application.IServices
{
    public class ChatMessageDto
    {
        public int Role { get; set; }
        public string Content { get; set; }
    }

    public interface ILocalLlmService
    {
        Task<string> GenerateAsync(string systemPrompt, string userPrompt, List<ChatMessageDto>? history = null);
    }
}
