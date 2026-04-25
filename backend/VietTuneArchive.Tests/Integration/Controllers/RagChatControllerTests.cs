using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs.Request;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;
using static VietTuneArchive.Application.Mapper.DTOs.Response.RagChatResponse;

namespace VietTuneArchive.Tests.Integration.Controllers;

public class RagChatControllerTests : ApiTestBase
{
    public RagChatControllerTests(WebAppFactory factory) : base(factory) { }

    // ─── Shared Helpers ────────────────────────────────────────────────────────

    private string GetUserToken(string role = "Contributor")
    {
        var userId = DbContext.Users.First(u => u.Role == role).Id;
        return JwtTokenHelper.GenerateToken(userId.ToString(), $"{role.ToLower()}@test.com", role);
    }

    private async Task<Guid> CreateConversation(string token, string? title = "Test Conversation")
    {
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await PostAsync("/api/rag-chat/conversations",
            new CreateConversationRequest { Title = title });
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<RagConversationResponse>();
        return body!.Id;
    }

    private async Task<RagChatMessageResponse> SendMessage(Guid convId, string content, string token)
    {
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await PostAsync($"/api/rag-chat/conversations/{convId}/messages",
            new SendMessageRequest { Content = content });
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<RagChatMessageResponse>())!;
    }

    // ─── CreateConversationTests ────────────────────────────────────────────────

    public class CreateConversationTests : RagChatControllerTests
    {
        public CreateConversationTests(WebAppFactory factory) : base(factory) { }

        [Theory]
        [InlineData("Contributor")]
        [InlineData("Expert")]
        [InlineData("Admin")]
        [InlineData("Researcher")]
        public async Task CreateConversation_AuthenticatedRole_Returns200(string role)
        {
            var token = GetUserToken(role);
            Client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await PostAsync("/api/rag-chat/conversations",
                new CreateConversationRequest { Title = $"Conv for {role}" });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<RagConversationResponse>();
            body!.Id.Should().NotBeEmpty();
        }

        [Fact]
        public async Task CreateConversation_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await PostAsync("/api/rag-chat/conversations",
                new CreateConversationRequest { Title = "No auth" });

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task CreateConversation_ValidRequest_PersistedInDb()
        {
            var userId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "contrib@test.com", "Contributor");
            var convId = await CreateConversation(token, "Persisted Convo");

            var dbConv = await DbContext.QAConversations.FindAsync(convId);
            dbConv.Should().NotBeNull();
            dbConv!.UserId.Should().Be(userId);
            dbConv.Title.Should().Be("Persisted Convo");
            dbConv.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(10));
        }

        [Fact]
        public async Task CreateConversation_TwoUsers_EachSeesOnlyOwn()
        {
            var contribId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var expertId = DbContext.Users.First(u => u.Role == "Expert").Id;

            var contribToken = JwtTokenHelper.GenerateToken(contribId.ToString(), "contrib@test.com", "Contributor");
            var expertToken = JwtTokenHelper.GenerateToken(expertId.ToString(), "expert@test.com", "Expert");

            await CreateConversation(contribToken, "Contributor Conv");
            await CreateConversation(expertToken, "Expert Conv");

            // Contributor fetches their list
            Client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", contribToken);
            var contribResp = await GetAsync("/api/rag-chat/conversations");
            contribResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var contribList = await contribResp.Content.ReadFromJsonAsync<List<RagConversationResponse>>();
            contribList!.Should().OnlyContain(c => DbContext.QAConversations
                .Any(q => q.Id == c.Id && q.UserId == contribId));
        }
    }

    // ─── GetConversationsTests ──────────────────────────────────────────────────

    public class GetConversationsTests : RagChatControllerTests
    {
        public GetConversationsTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetConversations_Authenticated_Returns200WithOwnConvos()
        {
            var userId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "contrib@test.com", "Contributor");
            await CreateConversation(token, "My Conv");

            Client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var response = await GetAsync("/api/rag-chat/conversations");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<RagConversationResponse>>();
            list.Should().NotBeNull();
            list!.Should().OnlyContain(c => DbContext.QAConversations
                .Any(q => q.Id == c.Id && q.UserId == userId));
        }

        [Fact]
        public async Task GetConversations_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/rag-chat/conversations");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── GetConversationByIdTests ───────────────────────────────────────────────

    public class GetConversationByIdTests : RagChatControllerTests
    {
        public GetConversationByIdTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetConversationById_OwnConversation_Returns200WithMessages()
        {
            var userId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "contrib@test.com", "Contributor");
            var convId = await CreateConversation(token, "My Detail Conv");

            Client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var response = await GetAsync($"/api/rag-chat/conversations/{convId}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<RagConversationResponse>();
            body!.Id.Should().Be(convId);
            body.Messages.Should().NotBeNull();
        }

        [Fact]
        public async Task GetConversationById_NonExistentId_ReturnsError()
        {
            var userId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "contrib@test.com", "Contributor");
            Client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await GetAsync($"/api/rag-chat/conversations/{Guid.NewGuid()}");
            // Service throws for not found or unauthorized → controller returns 500 or 400
            response.StatusCode.Should().NotBe(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetConversationById_AnotherUsersConversation_ReturnsError()
        {
            var contribId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var expertId = DbContext.Users.First(u => u.Role == "Expert").Id;

            var contribToken = JwtTokenHelper.GenerateToken(contribId.ToString(), "contrib@test.com", "Contributor");
            var expertToken = JwtTokenHelper.GenerateToken(expertId.ToString(), "expert@test.com", "Expert");

            var convId = await CreateConversation(contribToken, "Contributor Owned");

            // Expert tries to access Contributor's conversation
            Client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", expertToken);
            var response = await GetAsync($"/api/rag-chat/conversations/{convId}");

            response.StatusCode.Should().NotBe(HttpStatusCode.OK);
        }
    }

    // ─── DeleteConversationTests ────────────────────────────────────────────────

    public class DeleteConversationTests : RagChatControllerTests
    {
        public DeleteConversationTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task DeleteConversation_OwnConversation_Returns204()
        {
            var userId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "contrib@test.com", "Contributor");
            var convId = await CreateConversation(token, "To Delete");

            Client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var response = await Client.DeleteAsync($"/api/rag-chat/conversations/{convId}");

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);

            // After delete → GET returns error
            var getResponse = await GetAsync($"/api/rag-chat/conversations/{convId}");
            getResponse.StatusCode.Should().NotBe(HttpStatusCode.OK);
        }

        [Fact]
        public async Task DeleteConversation_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await Client.DeleteAsync($"/api/rag-chat/conversations/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── SendMessageTests ───────────────────────────────────────────────────────

    public class SendMessageTests : RagChatControllerTests
    {
        public SendMessageTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SendMessage_ValidInput_ReturnsAssistantReply()
        {
            var userId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "contrib@test.com", "Contributor");
            var convId = await CreateConversation(token, "Chat Conv");

            var msgResp = await SendMessage(convId, "Đàn bầu là gì?", token);

            msgResp.Should().NotBeNull();
            msgResp.Content.Should().Be("Mocked LLM response");
            msgResp.Role.Should().Be(1); // Assistant
        }

        [Fact]
        public async Task SendMessage_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await PostAsync($"/api/rag-chat/conversations/{Guid.NewGuid()}/messages",
                new SendMessageRequest { Content = "Hello" });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task SendMessage_NonExistentConversationId_ReturnsError()
        {
            var userId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "contrib@test.com", "Contributor");
            Client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await PostAsync($"/api/rag-chat/conversations/{Guid.NewGuid()}/messages",
                new SendMessageRequest { Content = "Hello" });

            response.StatusCode.Should().NotBe(HttpStatusCode.OK);
        }
    }

    // ─── MessagePersistenceTests ────────────────────────────────────────────────

    public class MessagePersistenceTests : RagChatControllerTests
    {
        public MessagePersistenceTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SendMessage_WithValidInput_PersistsBothUserAndAssistantMessages()
        {
            var userId = DbContext.Users.First(u => u.Role == "Researcher").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "researcher@test.com", "Researcher");
            var convId = await CreateConversation(token, "Persistence Test");

            var inputContent = "Tìm hiểu về cồng chiêng";
            await SendMessage(convId, inputContent, token);

            // Allow EF to reload
            await DbContext.Entry(await DbContext.QAConversations.FindAsync(convId)!).ReloadAsync();
            var messages = await DbContext.QAMessages
                .Where(m => m.ConversationId == convId)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();

            messages.Should().HaveCount(2);

            var userMsg = messages[0];
            userMsg.Role.Should().Be(0); // User
            userMsg.Content.Should().Be(inputContent);
            userMsg.ConversationId.Should().Be(convId);
            userMsg.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(15));

            var assistantMsg = messages[1];
            assistantMsg.Role.Should().Be(1); // Assistant
            assistantMsg.Content.Should().Be("Mocked LLM response");
            assistantMsg.ConversationId.Should().Be(convId);
            assistantMsg.ConfidenceScore.Should().NotBeNull();
        }
    }

    // ─── LlmResilienceTests ─────────────────────────────────────────────────────

    public class LlmResilienceTests : RagChatControllerTests
    {
        public LlmResilienceTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SendMessage_WhenLlmThrows_ReturnsError()
        {
            // Configure LLM mock to throw for this test
            Factory.LlmServiceMock
                .Setup(x => x.GenerateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<List<ChatMessageDto>?>()))
                .ThrowsAsync(new HttpRequestException("LLM service unavailable"));

            var userId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "contrib@test.com", "Contributor");
            var convId = await CreateConversation(token, "Resilience Test");

            Client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var response = await PostAsync($"/api/rag-chat/conversations/{convId}/messages",
                new SendMessageRequest { Content = "Will LLM fail?" });

            // Should return 5xx or error, not 200
            response.IsSuccessStatusCode.Should().BeFalse();

            // Reset mock to normal behavior for subsequent tests
            Factory.LlmServiceMock
                .Setup(x => x.GenerateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<List<ChatMessageDto>?>()))
                .ReturnsAsync("Mocked LLM response");
        }
    }

    // ─── RetrievalBehaviorTests ─────────────────────────────────────────────────

    public class RetrievalBehaviorTests : RagChatControllerTests
    {
        public RetrievalBehaviorTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SendMessage_WithZeroRetrievedDocs_ReturnsEmptySourceReferences()
        {
            Factory.RetrievalServiceMock
                .Setup(x => x.RetrieveAsync(It.IsAny<string>(), It.IsAny<int>()))
                .ReturnsAsync(new List<RetrievedDocument>());

            var userId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "contrib@test.com", "Contributor");
            var convId = await CreateConversation(token, "Zero Docs Conv");

            var msgResp = await SendMessage(convId, "Câu hỏi không có tài liệu", token);

            msgResp.Sources.Should().BeNullOrEmpty();
        }

        [Fact]
        public async Task SendMessage_RetrievalServiceStubbedCalled_VerifyInvocation()
        {
            Factory.RetrievalServiceMock
                .Setup(x => x.RetrieveAsync(It.IsAny<string>(), It.IsAny<int>()))
                .ReturnsAsync(new List<RetrievedDocument>());
            Factory.RetrievalServiceMock.Invocations.Clear();

            var userId = DbContext.Users.First(u => u.Role == "Contributor").Id;
            var token = JwtTokenHelper.GenerateToken(userId.ToString(), "contrib@test.com", "Contributor");
            var convId = await CreateConversation(token, "Spy Conv");
            await SendMessage(convId, "Hỏi gì đó", token);

            Factory.RetrievalServiceMock.Verify(
                x => x.RetrieveAsync(It.IsAny<string>(), It.IsAny<int>()),
                Times.AtLeastOnce);
        }
    }

    // ─── EmbeddingEndpointTests ─────────────────────────────────────────────────

    public class EmbeddingEndpointTests : RagChatControllerTests
    {
        public EmbeddingEndpointTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task BackfillEmbeddings_AsAdmin_Returns200()
        {
            AuthenticateAs("Admin");
            Factory.EmbeddingServiceMock
                .Setup(x => x.BackfillAllMissingEmbeddingsAsync())
                .ReturnsAsync(5);

            var response = await PostAsync("/api/rag-chat/embeddings/backfill", new { });
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task BackfillEmbeddings_AsExpert_Returns403()
        {
            AuthenticateAs("Expert");
            var response = await PostAsync("/api/rag-chat/embeddings/backfill", new { });
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task BackfillEmbeddings_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await PostAsync("/api/rag-chat/embeddings/backfill", new { });
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GenerateEmbedding_ValidRecordingId_AsAdmin_Returns200()
        {
            AuthenticateAs("Admin");
            Factory.EmbeddingServiceMock
                .Setup(x => x.GenerateEmbeddingForRecordingAsync(It.IsAny<Guid>()))
                .Returns(Task.CompletedTask);

            var recordingId = Guid.NewGuid();
            var response = await PostAsync($"/api/rag-chat/embeddings/generate/{recordingId}", new { });
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GenerateEmbedding_AsExpert_Returns403()
        {
            AuthenticateAs("Expert");
            var response = await PostAsync($"/api/rag-chat/embeddings/generate/{Guid.NewGuid()}", new { });
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }
}
