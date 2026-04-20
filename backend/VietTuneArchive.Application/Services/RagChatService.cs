using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;
using VietTuneArchive.Application.Mapper.DTOs.Request;
using static VietTuneArchive.Application.Mapper.DTOs.Response.RagChatResponse;

namespace VietTuneArchive.Application.Services
{
    public class RagChatService : IRagChatService
    {
        private readonly IRagChatRepository _repository;
        private readonly IKnowledgeRetrievalService _retrievalService;
        private readonly ILocalLlmService _llmService;
        private readonly IConfiguration _config;

        public RagChatService(
            IRagChatRepository repository,
            IKnowledgeRetrievalService retrievalService,
            ILocalLlmService llmService,
            IConfiguration config)
        {
            _repository = repository;
            _retrievalService = retrievalService;
            _llmService = llmService;
            _config = config;
        }

        public async Task<RagConversationResponse> CreateConversationAsync(Guid userId, CreateConversationRequest request)
        {
            var conversation = await _repository.CreateConversationAsync(userId, request.Title);
            return new RagConversationResponse
            {
                Id = conversation.Id,
                Title = conversation.Title,
                CreatedAt = conversation.CreatedAt,
                Messages = new List<RagChatMessageResponse>()
            };
        }

        public async Task<List<RagConversationResponse>> GetConversationsAsync(Guid userId)
        {
            var conversations = await _repository.GetUserConversationsAsync(userId);
            return conversations.Select(c => new RagConversationResponse
            {
                Id = c.Id,
                Title = c.Title,
                CreatedAt = c.CreatedAt,
                Messages = new List<RagChatMessageResponse>()
            }).ToList();
        }

        public async Task<RagConversationResponse> GetConversationAsync(Guid conversationId, Guid userId)
        {
            var conversation = await _repository.GetConversationWithMessagesAsync(conversationId);
            if (conversation == null || conversation.UserId != userId)
                throw new Exception("Conversation not found or unauthorized.");

            return new RagConversationResponse
            {
                Id = conversation.Id,
                Title = conversation.Title,
                CreatedAt = conversation.CreatedAt,
                Messages = conversation.QAMessages?.Select(m => new RagChatMessageResponse
                {
                    Id = m.Id,
                    Role = m.Role,
                    Content = m.Content,
                    ConfidenceScore = m.ConfidenceScore,
                    CreatedAt = m.CreatedAt,
                    Sources = string.IsNullOrEmpty(m.SourceRecordingIdsJson) && string.IsNullOrEmpty(m.SourceKBEntryIdsJson)
                              ? new List<SourceReference>()
                              : new List<SourceReference> { new SourceReference { Title = "Sources available in DB" } }
                }).ToList() ?? new List<RagChatMessageResponse>()
            };
        }

        public async Task DeleteConversationAsync(Guid conversationId, Guid userId)
        {
            var conversation = await _repository.GetConversationWithMessagesAsync(conversationId);
            if (conversation != null && conversation.UserId == userId)
            {
                await _repository.DeleteConversationAsync(conversationId);
            }
        }

        public async Task<RagChatMessageResponse> SendMessageAsync(Guid conversationId, Guid userId, SendMessageRequest request)
        {
            var conv = await _repository.GetConversationWithMessagesAsync(conversationId);
            if (conv == null || conv.UserId != userId) throw new Exception("Conversation not found");

            // 1. Save User Message
            var userMsg = await _repository.AddMessageAsync(new QAMessage
            {
                ConversationId = conversationId,
                Role = 0,
                Content = request.Content
            });

            // 2. Retrieve Context
            var docs = await _retrievalService.RetrieveAsync(request.Content, 5);

            var contextBuilder = new StringBuilder();
            foreach (var doc in docs)
            {
                contextBuilder.AppendLine($"[{doc.SourceType}] {doc.Title}: {doc.Content}");
            }

            // 3. Prepare Local LLM Request
            var sysPrompt = _config["RagChat:SystemPrompt"] ?? "Bạn là chuyên gia về âm nhạc cổ truyền Việt Nam. Trả lời câu hỏi dựa trên thông tin được cung cấp.";

            var msgs = conv.QAMessages?.OrderBy(m => m.CreatedAt).TakeLast(6).ToList();
            var history = msgs?.Select(m => new ChatMessageDto { Role = m.Role, Content = m.Content }).ToList() ?? new List<ChatMessageDto>();

            var fullPrompt = $"Context:\n{contextBuilder}\n\nUser: {request.Content}";

            var answerText = await _llmService.GenerateAsync(sysPrompt, fullPrompt, history);
            if (string.IsNullOrEmpty(answerText))
                answerText = "Xin lỗi, hiện tại tôi không thể trả lời.";

            var recIds = docs.Where(d => d.SourceType == "Recording").Select(d => d.SourceId).ToList();
            var kbIds = docs.Where(d => d.SourceType == "KBEntry").Select(d => d.SourceId).ToList();

            // 4. Save Assistant Message
            var assistantMsg = await _repository.AddMessageAsync(new QAMessage
            {
                ConversationId = conversationId,
                Role = 1,
                Content = answerText,
                SourceRecordingIdsJson = JsonSerializer.Serialize(recIds),
                SourceKBEntryIdsJson = JsonSerializer.Serialize(kbIds),
                ConfidenceScore = docs.Any() ? 0.9m : 0.5m
            });

            return new RagChatMessageResponse
            {
                Id = assistantMsg.Id,
                Role = assistantMsg.Role,
                Content = assistantMsg.Content,
                CreatedAt = assistantMsg.CreatedAt,
                ConfidenceScore = assistantMsg.ConfidenceScore,
                Sources = docs.Select(d => new SourceReference
                {
                    Type = d.SourceType,
                    Id = d.SourceId,
                    Title = d.Title
                }).ToList()
            };
        }
    }
}
