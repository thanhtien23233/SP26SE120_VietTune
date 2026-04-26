using System.Net;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Testcontainers.PostgreSql;
using VietTuneArchive.Application.Common.Email;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Context;
using static VietTuneArchive.Application.Mapper.DTOs.Response.RagChatResponse;

namespace VietTuneArchive.Tests.Integration.Fixtures;

/// <summary>
/// Intercepts ALL outbound HTTP calls from EmailService and returns a fake 200 response
/// so that Gmail OAuth / send calls don't fail in the test environment.
/// </summary>
internal class NoOpEmailHttpHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        // Return a fake token response for OAuth and a success for send
        var responseBody = request.RequestUri?.Host?.Contains("oauth2") == true
            ? """{"access_token":"fake-test-token","expires_in":3600,"token_type":"Bearer"}"""
            : """{"id":"fake-message-id"}""";

        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
        };
        return Task.FromResult(response);
    }
}

public class WebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder()
        .WithImage("pgvector/pgvector:pg16")
        .WithDatabase("viettune_test_db")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    // Expose mocks for spy / reconfiguration in tests
    public Mock<ILocalLlmService> LlmServiceMock { get; } = new Mock<ILocalLlmService>();
    public Mock<IKnowledgeRetrievalService> RetrievalServiceMock { get; } = new Mock<IKnowledgeRetrievalService>();
    public Mock<IEmbeddingService> EmbeddingServiceMock { get; } = new Mock<IEmbeddingService>();
    public Mock<IVectorEmbeddingService> VectorEmbeddingServiceMock { get; } = new Mock<IVectorEmbeddingService>();

    public WebAppFactory()
    {
        // Default: LLM returns a fixed stub string
        LlmServiceMock
            .Setup(x => x.GenerateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<List<ChatMessageDto>?>()))
            .ReturnsAsync("Mocked LLM response");

        // Default: retrieval returns empty list
        RetrievalServiceMock
            .Setup(x => x.RetrieveAsync(It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync(new List<RetrievedDocument>());
    }

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();

        // Tạo app một lần để trigger ConfigureWebHost, sau đó seed DB
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DBContext>();
        await db.Database.ExecuteSqlRawAsync("CREATE EXTENSION IF NOT EXISTS vector;");
        db.Database.EnsureCreated();
        DatabaseFixture.SeedAsync(db);
    }

    public new async Task DisposeAsync()
    {
        await _dbContainer.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureTestServices(services =>
        {
            // Remove the existing DbContext configuration
            services.RemoveAll(typeof(DbContextOptions<DBContext>));
            services.RemoveAll(typeof(DBContext));

            // Add DBContext with Testcontainers connection string
            services.AddDbContext<DBContext>(options =>
                options.UseNpgsql(_dbContainer.GetConnectionString()));

            // Stub external services
            services.RemoveAll(typeof(ITranscriptionService));
            services.AddScoped(_ => new Mock<ITranscriptionService>().Object);

            services.RemoveAll(typeof(IInstrumentDetectionService));
            services.AddScoped(_ => new Mock<IInstrumentDetectionService>().Object);

            services.RemoveAll(typeof(IOpenAIEmbeddingService));
            services.AddScoped(_ => new Mock<IOpenAIEmbeddingService>().Object);

            services.RemoveAll(typeof(ILocalWhisperService));
            services.AddScoped(_ => new Mock<ILocalWhisperService>().Object);

            // Expose LLM mock — must use generic overload to register as interface
            services.RemoveAll(typeof(ILocalLlmService));
            services.AddSingleton<Mock<ILocalLlmService>>(LlmServiceMock);
            services.AddSingleton<ILocalLlmService>(LlmServiceMock.Object);

            // Expose Retrieval mock
            services.RemoveAll(typeof(IKnowledgeRetrievalService));
            services.AddSingleton<Mock<IKnowledgeRetrievalService>>(RetrievalServiceMock);
            services.AddSingleton<IKnowledgeRetrievalService>(RetrievalServiceMock.Object);

            // Stub VectorEmbeddingService so no real embedding calls are made.
            // RecordingService calls GenerateAndSaveAsync only for Approved recordings;
            // stub returns a safe default so any accidental call doesn't blow up.
            services.RemoveAll(typeof(IVectorEmbeddingService));
            services.AddSingleton<Mock<IVectorEmbeddingService>>(VectorEmbeddingServiceMock);
            services.AddSingleton<IVectorEmbeddingService>(VectorEmbeddingServiceMock.Object);

            // Register "Owner" policy with permissive rule (authenticated = owner in tests)
            // Production registers this policy based on real ownership; tests skip that check
            services.AddAuthorization(options =>
            {
                options.AddPolicy("Owner", policy => policy.RequireAuthenticatedUser());
            });

            // EmailService has no interface — it is registered via AddHttpClient<EmailService>().
            // Override the named HttpClient handler with a NoOp so that Gmail OAuth and send
            // calls don't fail in the test environment (they would throw with dummy credentials).
            services.Configure<GmailApiSettings>(opts =>
            {
                opts.ClientId = "test-client-id";
                opts.ClientSecret = "test-client-secret";
                opts.RefreshToken = "test-refresh-token";
                opts.SenderEmail = "noreply@test.com";
            });
            services.AddHttpClient<EmailService>()
                .ConfigurePrimaryHttpMessageHandler(() => new NoOpEmailHttpHandler());

            // Expose Embedding mock
            services.RemoveAll(typeof(IEmbeddingService));
            services.AddSingleton<Mock<IEmbeddingService>>(EmbeddingServiceMock);
            services.AddSingleton<IEmbeddingService>(EmbeddingServiceMock.Object);
        });
    }
}
