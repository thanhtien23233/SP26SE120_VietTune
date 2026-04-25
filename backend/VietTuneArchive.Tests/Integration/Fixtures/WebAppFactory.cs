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

            // EmailService has no interface — configure with dummy settings so it
            // doesn't crash on startup. Real emails will not be sent in test env.
            services.Configure<GmailApiSettings>(opts =>
            {
                opts.ClientId = "test-client-id";
                opts.ClientSecret = "test-client-secret";
                opts.RefreshToken = "test-refresh-token";
                opts.SenderEmail = "noreply@test.com";
            });

            // Expose Embedding mock
            services.RemoveAll(typeof(IEmbeddingService));
            services.AddSingleton<Mock<IEmbeddingService>>(EmbeddingServiceMock);
            services.AddSingleton<IEmbeddingService>(EmbeddingServiceMock.Object);
        });
    }
}
