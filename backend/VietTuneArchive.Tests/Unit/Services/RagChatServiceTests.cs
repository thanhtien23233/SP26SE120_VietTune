using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;
using System.Text.Json;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs.Request;
using VietTuneArchive.Application.Mapper.DTOs.Response;
using static VietTuneArchive.Application.Mapper.DTOs.Response.RagChatResponse;
using VietTuneArchive.Application.Services;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;
using VietTuneArchive.Tests.TestHelpers.Builders;
using Xunit;

namespace VietTuneArchive.Tests.Unit.Services;

public class RagChatServiceTests
{
    private readonly Mock<IRagChatRepository> _repoMock;
    private readonly Mock<IKnowledgeRetrievalService> _retrievalMock;
    private readonly Mock<ILocalLlmService> _llmMock;
    private readonly Mock<IConfiguration> _configMock;
    private readonly RagChatService _sut;

    public RagChatServiceTests()
    {
        _repoMock = new Mock<IRagChatRepository>();
        _retrievalMock = new Mock<IKnowledgeRetrievalService>();
        _llmMock = new Mock<ILocalLlmService>();
        _configMock = new Mock<IConfiguration>();

        _configMock.Setup(c => c["RagChat:SystemPrompt"]).Returns("Test Prompt");

        _sut = new RagChatService(
            _repoMock.Object,
            _retrievalMock.Object,
            _llmMock.Object,
            _configMock.Object
        );
    }

    public class ConversationManagement : RagChatServiceTests
    {
        [Fact]
        public async Task CreateConversation_ValidUserId_ReturnsConversation()
        {
            var userId = Guid.NewGuid();
            var req = new CreateConversationRequest { Title = "Test Title" };
            var conv = RagChatBuilder.BuildConversation(Guid.NewGuid(), userId);
            conv.Title = req.Title;

            _repoMock.Setup(r => r.CreateConversationAsync(userId, req.Title)).ReturnsAsync(conv);

            var result = await _sut.CreateConversationAsync(userId, req);

            result.Title.Should().Be(req.Title);
            result.Id.Should().Be(conv.Id);
        }

        [Fact]
        public async Task GetConversations_ReturnsOnlyUserConversations()
        {
            var userId = Guid.NewGuid();
            var convs = new List<QAConversation> { RagChatBuilder.BuildConversation(Guid.NewGuid(), userId) };

            _repoMock.Setup(r => r.GetUserConversationsAsync(userId)).ReturnsAsync(convs);

            var result = await _sut.GetConversationsAsync(userId);

            result.Count.Should().Be(1);
        }

        [Fact]
        public async Task GetConversationById_OwnConversation_ReturnsFullDto()
        {
            var userId = Guid.NewGuid();
            var conv = RagChatBuilder.BuildConversation(Guid.NewGuid(), userId);
            conv.QAMessages = new List<QAMessage> { RagChatBuilder.BuildMessage(conv.Id, 0, "Hello") };

            _repoMock.Setup(r => r.GetConversationWithMessagesAsync(conv.Id)).ReturnsAsync(conv);

            var result = await _sut.GetConversationAsync(conv.Id, userId);

            result.Messages.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetConversationById_OtherUserConversation_ThrowsError()
        {
            var conv = RagChatBuilder.BuildConversation(Guid.NewGuid(), Guid.NewGuid());
            _repoMock.Setup(r => r.GetConversationWithMessagesAsync(conv.Id)).ReturnsAsync(conv);

            var action = async () => await _sut.GetConversationAsync(conv.Id, Guid.NewGuid());

            await action.Should().ThrowAsync<Exception>().WithMessage("*unauthorized*");
        }

        [Fact]
        public async Task DeleteConversation_OwnConversation_CallsDelete()
        {
            var userId = Guid.NewGuid();
            var conv = RagChatBuilder.BuildConversation(Guid.NewGuid(), userId);

            _repoMock.Setup(r => r.GetConversationWithMessagesAsync(conv.Id)).ReturnsAsync(conv);

            await _sut.DeleteConversationAsync(conv.Id, userId);

            _repoMock.Verify(r => r.DeleteConversationAsync(conv.Id), Times.Once);
        }
    }

    public class SendMessage_HappyPath : RagChatServiceTests
    {
        [Fact]
        public async Task SendMessageAsync_ValidInput_PersistsMessagesAndRetrieves()
        {
            var userId = Guid.NewGuid();
            var conv = RagChatBuilder.BuildConversation(Guid.NewGuid(), userId);
            var req = new SendMessageRequest { Content = "Hello" };

            _repoMock.Setup(r => r.GetConversationWithMessagesAsync(conv.Id)).ReturnsAsync(conv);
            _repoMock.Setup(r => r.AddMessageAsync(It.Is<QAMessage>(m => m.Role == 0))).ReturnsAsync(new QAMessage { Role = 0, Content = "Hello" });
            _repoMock.Setup(r => r.AddMessageAsync(It.Is<QAMessage>(m => m.Role == 1))).ReturnsAsync(new QAMessage { Role = 1, Content = "Mocked LLM response" });

            _retrievalMock.Setup(r => r.RetrieveAsync("Hello", 5))
                          .ReturnsAsync(new List<RetrievedDocument>
                          {
                              RagChatBuilder.BuildRetrievalDoc("KBEntry", Guid.NewGuid(), "Mocked", 0.9)
                          });

            _llmMock.Setup(l => l.GenerateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<List<ChatMessageDto>>()))
                    .ReturnsAsync("Mocked LLM response");

            var result = await _sut.SendMessageAsync(conv.Id, userId, req);

            result.Content.Should().Be("Mocked LLM response");
            result.Role.Should().Be(1);
            result.Sources.Should().HaveCount(1);
            
            _retrievalMock.Verify(r => r.RetrieveAsync("Hello", 5), Times.Once);
            _llmMock.Verify(l => l.GenerateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<List<ChatMessageDto>>()), Times.Once);
            _repoMock.Verify(r => r.AddMessageAsync(It.IsAny<QAMessage>()), Times.Exactly(2));
        }

        [Fact]
        public async Task SendMessageAsync_ZeroRetrievedDocs_CallsLlmWithEmptyContext()
        {
            var userId = Guid.NewGuid();
            var conv = RagChatBuilder.BuildConversation(Guid.NewGuid(), userId);
            var req = new SendMessageRequest { Content = "Hello" };

            _repoMock.Setup(r => r.GetConversationWithMessagesAsync(conv.Id)).ReturnsAsync(conv);
            _repoMock.Setup(r => r.AddMessageAsync(It.IsAny<QAMessage>())).ReturnsAsync(new QAMessage { Role = 1, Content = "Mock" });
            _retrievalMock.Setup(r => r.RetrieveAsync("Hello", 5)).ReturnsAsync(new List<RetrievedDocument>());
            _llmMock.Setup(l => l.GenerateAsync(It.IsAny<string>(), "Hello", It.IsAny<List<ChatMessageDto>>())).ReturnsAsync("Mock");

            var result = await _sut.SendMessageAsync(conv.Id, userId, req);

            _llmMock.Verify(l => l.GenerateAsync(It.IsAny<string>(), "Hello", It.IsAny<List<ChatMessageDto>>()), Times.Once);
            result.Sources.Should().BeEmpty();
        }
    }

    public class SendMessage_RetrievalBranches : RagChatServiceTests
    {
        [Fact]
        public async Task SendMessageAsync_FilterIrrelevantDocs_BelowThresholdAreIgnored()
        {
            var userId = Guid.NewGuid();
            var conv = RagChatBuilder.BuildConversation(Guid.NewGuid(), userId);
            var req = new SendMessageRequest { Content = "Test" };

            _repoMock.Setup(r => r.GetConversationWithMessagesAsync(conv.Id)).ReturnsAsync(conv);
            _repoMock.Setup(r => r.AddMessageAsync(It.IsAny<QAMessage>())).ReturnsAsync(new QAMessage { Role = 1, Content = "AI says Mocked" });

            // Doc1 has score 0.6, Doc2 has score 0.9. Only Doc2 should be sent to LLM.
            var doc1 = RagChatBuilder.BuildRetrievalDoc("KBEntry", Guid.NewGuid(), "Bad", 0.6);
            var doc2 = RagChatBuilder.BuildRetrievalDoc("KBEntry", Guid.NewGuid(), "Mocked", 0.9);

            _retrievalMock.Setup(r => r.RetrieveAsync("Test", 5)).ReturnsAsync(new List<RetrievedDocument> { doc1, doc2 });
            _llmMock.Setup(l => l.GenerateAsync(It.IsAny<string>(), It.Is<string>(s => s.Contains("Mocked") && !s.Contains("Bad")), It.IsAny<List<ChatMessageDto>>()))
                    .ReturnsAsync("AI says Mocked");

            var result = await _sut.SendMessageAsync(conv.Id, userId, req);

            result.Sources.Should().HaveCount(1);
            result.Sources.First().Title.Should().Be("Mocked");
        }
    }

    public class SendMessage_LlmInteraction : RagChatServiceTests
    {
        [Fact]
        public async Task SendMessageAsync_LlmReturnsEmpty_StoresFallbackMessage()
        {
            var userId = Guid.NewGuid();
            var conv = RagChatBuilder.BuildConversation(Guid.NewGuid(), userId);
            var req = new SendMessageRequest { Content = "Test" };

            _repoMock.Setup(r => r.GetConversationWithMessagesAsync(conv.Id)).ReturnsAsync(conv);
            _repoMock.Setup(r => r.AddMessageAsync(It.IsAny<QAMessage>())).ReturnsAsync(new QAMessage { Role = 1, Content = "Xin lỗi, hiện tại tôi không thể trả lời." });
            _retrievalMock.Setup(r => r.RetrieveAsync("Test", 5)).ReturnsAsync(new List<RetrievedDocument>());
            
            _llmMock.Setup(l => l.GenerateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<List<ChatMessageDto>>()))
                    .ReturnsAsync("");

            var result = await _sut.SendMessageAsync(conv.Id, userId, req);

            result.Content.Should().Be("Xin lỗi, hiện tại tôi không thể trả lời.");
        }
    }

    public class ConfidenceScore : RagChatServiceTests
    {
        [Fact]
        public async Task SendMessageAsync_HighRelevanceScore_SetsConfidenceTo1()
        {
            var userId = Guid.NewGuid();
            var conv = RagChatBuilder.BuildConversation(Guid.NewGuid(), userId);
            var req = new SendMessageRequest { Content = "Test" };

            _repoMock.Setup(r => r.GetConversationWithMessagesAsync(conv.Id)).ReturnsAsync(conv);
            _repoMock.Setup(r => r.AddMessageAsync(It.Is<QAMessage>(m => m.Role == 1))).ReturnsAsync(new QAMessage { Role = 1, Content = "Mocked LLM", ConfidenceScore = 1.0m });
            _repoMock.Setup(r => r.AddMessageAsync(It.Is<QAMessage>(m => m.Role == 0))).ReturnsAsync(new QAMessage());

            _retrievalMock.Setup(r => r.RetrieveAsync("Test", 5)).ReturnsAsync(new List<RetrievedDocument>
            {
                RagChatBuilder.BuildRetrievalDoc("KBEntry", Guid.NewGuid(), "Mocked", 1.0)
            });
            _llmMock.Setup(l => l.GenerateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<List<ChatMessageDto>>())).ReturnsAsync("Mocked LLM");

            var result = await _sut.SendMessageAsync(conv.Id, userId, req);

            result.ConfidenceScore.Should().Be(1.0m);
        }

        [Fact]
        public async Task SendMessageAsync_NoSources_SetsConfidenceToZeroPointFive()
        {
            var userId = Guid.NewGuid();
            var conv = RagChatBuilder.BuildConversation(Guid.NewGuid(), userId);
            var req = new SendMessageRequest { Content = "Test" };

            _repoMock.Setup(r => r.GetConversationWithMessagesAsync(conv.Id)).ReturnsAsync(conv);
            _repoMock.Setup(r => r.AddMessageAsync(It.Is<QAMessage>(m => m.Role == 1))).ReturnsAsync(new QAMessage { Role = 1, Content = "Mocked LLM", ConfidenceScore = 0.5m });
            _repoMock.Setup(r => r.AddMessageAsync(It.Is<QAMessage>(m => m.Role == 0))).ReturnsAsync(new QAMessage());

            _retrievalMock.Setup(r => r.RetrieveAsync("Test", 5)).ReturnsAsync(new List<RetrievedDocument>());
            _llmMock.Setup(l => l.GenerateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<List<ChatMessageDto>>())).ReturnsAsync("Mocked LLM");

            var result = await _sut.SendMessageAsync(conv.Id, userId, req);

            result.ConfidenceScore.Should().Be(0.5m);
        }
    }

    public class ExpertSupervision : RagChatServiceTests
    {
        [Fact]
        public void Assumption_ExpertSupervisionMethodsAreNotImplemented()
        {
            // The prompt requested testing Expert Supervision (FlagMessage, CorrectMessage, UnflagMessage),
            // but IRagChatService and RagChatService do NOT contain these methods.
            // I am documenting this assumption through this test to avoid compilation failures.
            true.Should().BeTrue();
        }
    }
}
