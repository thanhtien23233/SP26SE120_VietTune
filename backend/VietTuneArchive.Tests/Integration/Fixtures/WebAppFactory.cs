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

namespace VietTuneArchive.Tests.Integration.Fixtures;

public class WebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder()
        .WithImage("pgvector/pgvector:pg16") // Using pgvector since we use embeddings
        .WithDatabase("viettune_test_db")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

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
        // Override environment
        builder.UseEnvironment("Testing");

        builder.ConfigureTestServices(services =>
        {
            // Remove the existing DbContext configuration
            services.RemoveAll(typeof(DbContextOptions<DBContext>));
            services.RemoveAll(typeof(DBContext));

            // Add DBContext with Testcontainers connection string
            services.AddDbContext<DBContext>(options =>
                options.UseNpgsql(_dbContainer.GetConnectionString()));

            // Override external services with mocks so they don't hit real APIs
            services.RemoveAll(typeof(ITranscriptionService));
            services.AddScoped(_ => new Mock<ITranscriptionService>().Object);

            services.RemoveAll(typeof(IInstrumentDetectionService));
            services.AddScoped(_ => new Mock<IInstrumentDetectionService>().Object);

            services.RemoveAll(typeof(IOpenAIEmbeddingService));
            services.AddScoped(_ => new Mock<IOpenAIEmbeddingService>().Object);

            services.RemoveAll(typeof(ILocalWhisperService));
            services.AddScoped(_ => new Mock<ILocalWhisperService>().Object);

            services.RemoveAll(typeof(ILocalLlmService));
            services.AddScoped(_ => new Mock<ILocalLlmService>().Object);

            services.RemoveAll(typeof(EmailService));
            services.AddTransient(_ => new Mock<EmailService>().Object);

            services.RemoveAll(typeof(IEmbeddingService));
            // Register a mock we can retrieve later
            var embeddingMock = new Mock<IEmbeddingService>();
            services.AddSingleton(embeddingMock);
            services.AddSingleton(embeddingMock.Object);

            // Apply migrations and seed data on startup
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<DBContext>();
            
            // Ensure created creates schema, can also use db.Database.Migrate() if EF migrations exist
            db.Database.EnsureCreated();
            DatabaseFixture.SeedAsync(db);
        });
    }
}
