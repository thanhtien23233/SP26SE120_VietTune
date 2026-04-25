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
using Xunit;
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

            // Expose LLM and Retrieval mocks as Singletons so tests can configure / verify them
            services.RemoveAll(typeof(ILocalLlmService));
            services.AddSingleton(LlmServiceMock);
            services.AddSingleton(LlmServiceMock.Object);

            services.RemoveAll(typeof(IKnowledgeRetrievalService));
            services.AddSingleton(RetrievalServiceMock);
            services.AddSingleton(RetrievalServiceMock.Object);

            services.RemoveAll(typeof(EmailService));
            services.AddTransient(_ => new Mock<EmailService>().Object);

            services.RemoveAll(typeof(IEmbeddingService));
            services.AddSingleton(EmbeddingServiceMock);
            services.AddSingleton(EmbeddingServiceMock.Object);

            // Seed database
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<DBContext>();
            db.Database.EnsureCreated();
            DatabaseFixture.SeedAsync(db);
        });
    }
}
