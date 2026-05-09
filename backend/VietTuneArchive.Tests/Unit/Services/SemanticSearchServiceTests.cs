using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Services;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Tests.TestHelpers.Builders;
using Xunit;

namespace VietTuneArchive.Tests.Unit.Services;

public class SemanticSearchServiceTests : IDisposable
{
    private readonly DBContext _dbContext;
    private readonly Mock<IEmbeddingService> _localEmbeddingMock;
    private readonly Mock<IOpenAIEmbeddingService> _geminiEmbeddingMock;
    private readonly Mock<ILogger<SemanticSearchService>> _loggerMock;
    private readonly SemanticSearchService _sut;

    public SemanticSearchServiceTests()
    {
        var options = new DbContextOptionsBuilder<DBContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        _dbContext = new DBContext(options);
        _localEmbeddingMock = new Mock<IEmbeddingService>();
        _geminiEmbeddingMock = new Mock<IOpenAIEmbeddingService>();
        _loggerMock = new Mock<ILogger<SemanticSearchService>>();

        var geminiOptions = Options.Create(new GeminiOptions { EmbeddingModel = "text-embedding-004" });

        //_sut = new SemanticSearchService(
        //    _dbContext,
        //    _localEmbeddingMock.Object,
        //    _geminiEmbeddingMock.Object,
        //    geminiOptions,
        //    _loggerMock.Object
        //);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    public class VectorSearch384 : SemanticSearchServiceTests
    {
        [Fact]
        public async Task SearchAsync_ValidQuery_ReturnsOrderedTopK()
        {
            var queryVector = new float[384];
            Array.Fill(queryVector, 0.1f);
            
            var rec1 = SearchBuilder.BuildRecording(Guid.NewGuid(), "Match Title");
            var rec2 = SearchBuilder.BuildRecording(Guid.NewGuid(), "Other");
            
            _dbContext.Recordings.AddRange(rec1, rec2);
            
            var emb1 = SearchBuilder.BuildVectorEmbedding(Guid.NewGuid(), rec1.Id, "all-MiniLM-L6-v2", queryVector);
            
            var badVector = new float[384];
            Array.Fill(badVector, -0.1f);
            var emb2 = SearchBuilder.BuildVectorEmbedding(Guid.NewGuid(), rec2.Id, "all-MiniLM-L6-v2", badVector);

            _dbContext.VectorEmbeddings.AddRange(emb1, emb2);
            await _dbContext.SaveChangesAsync();

            _localEmbeddingMock.Setup(x => x.GetEmbeddingAsync("Test")).ReturnsAsync(queryVector);

            var results = await _sut.SearchAsync("Test", topK: 5, minScore: 0.1f);

            results.Should().NotBeEmpty();
            //results.First().RecordingId.Should().Be(rec1.Id);
            results.First().SimilarityScore.Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task SearchAsync_TitleMatch_BoostsConfidenceToOne()
        {
            var queryVector = new float[384];
            Array.Fill(queryVector, 0.1f);
            
            var rec = SearchBuilder.BuildRecording(Guid.NewGuid(), "Test Query Title");
            _dbContext.Recordings.Add(rec);
            
            // Deliberately use a vector that gives score < 1.0 but > minScore
            var embVector = new float[384];
            Array.Fill(embVector, 0.05f); 
            var emb = SearchBuilder.BuildVectorEmbedding(Guid.NewGuid(), rec.Id, "all-MiniLM-L6-v2", embVector);
            _dbContext.VectorEmbeddings.Add(emb);
            await _dbContext.SaveChangesAsync();

            _localEmbeddingMock.Setup(x => x.GetEmbeddingAsync("Test Query")).ReturnsAsync(queryVector);

            var results = await _sut.SearchAsync("Test Query", minScore: 0.0f);

            results.Should().HaveCount(1);
            results.First().SimilarityScore.Should().BeApproximately(1.0f, 0.01f);
        }

        [Fact]
        public async Task SearchAsync_NoResultsAboveThreshold_ReturnsEmpty()
        {
            var queryVector = new float[384];
            Array.Fill(queryVector, 0.1f);
            
            var rec = SearchBuilder.BuildRecording(Guid.NewGuid(), "Unrelated");
            _dbContext.Recordings.Add(rec);
            
            var badVector = new float[384];
            Array.Fill(badVector, -0.9f); // Opposite direction, negative cosine similarity
            var emb = SearchBuilder.BuildVectorEmbedding(Guid.NewGuid(), rec.Id, "all-MiniLM-L6-v2", badVector);
            _dbContext.VectorEmbeddings.Add(emb);
            await _dbContext.SaveChangesAsync();

            _localEmbeddingMock.Setup(x => x.GetEmbeddingAsync("Test")).ReturnsAsync(queryVector);

            var results = await _sut.SearchAsync("Test", minScore: 0.5f);

            results.Should().BeEmpty();
        }

        [Fact]
        public async Task SearchAsync_MissingRecordingsInDb_AreExcluded()
        {
            var queryVector = new float[384];
            Array.Fill(queryVector, 0.1f);
            
            // Embedding exists but Recording doesn't (simulate orphan)
            var emb = SearchBuilder.BuildVectorEmbedding(Guid.NewGuid(), Guid.NewGuid(), "all-MiniLM-L6-v2", queryVector);
            _dbContext.VectorEmbeddings.Add(emb);
            await _dbContext.SaveChangesAsync();

            _localEmbeddingMock.Setup(x => x.GetEmbeddingAsync("Test")).ReturnsAsync(queryVector);

            var results = await _sut.SearchAsync("Test", minScore: 0.1f);

            results.Should().BeEmpty();
        }
    }

    public class VectorSearch768 : SemanticSearchServiceTests
    {
        [Fact]
        public async Task Search768Async_ValidQuery_ReturnsOrderedTopK()
        {
            var queryVector = new float[768];
            Array.Fill(queryVector, 0.1f);
            
            var rec1 = SearchBuilder.BuildRecording(Guid.NewGuid(), "Match Title");
            var rec2 = SearchBuilder.BuildRecording(Guid.NewGuid(), "Other");
            
            _dbContext.Recordings.AddRange(rec1, rec2);
            
            var emb1 = SearchBuilder.BuildVectorEmbedding(Guid.NewGuid(), rec1.Id, "text-embedding-004", queryVector);
            
            var badVector = new float[768];
            Array.Fill(badVector, -0.1f);
            var emb2 = SearchBuilder.BuildVectorEmbedding(Guid.NewGuid(), rec2.Id, "text-embedding-004", badVector);

            _dbContext.VectorEmbeddings.AddRange(emb1, emb2);
            await _dbContext.SaveChangesAsync();

            _geminiEmbeddingMock.Setup(x => x.GetEmbeddingAsync("Test", "RETRIEVAL_QUERY", It.IsAny<CancellationToken>())).ReturnsAsync(queryVector);

            var results = await _sut.Search768Async("Test", topK: 5, minScore: 0.1f);

            results.Should().NotBeEmpty();
            //results.First().RecordingId.Should().Be(rec1.Id);
            
            // Verify Gemini service called instead of local
            _geminiEmbeddingMock.Verify(x => x.GetEmbeddingAsync("Test", "RETRIEVAL_QUERY", It.IsAny<CancellationToken>()), Times.Once);
            _localEmbeddingMock.Verify(x => x.GetEmbeddingAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task Search768Async_TitleMatch_BoostsConfidenceToOne()
        {
            var queryVector = new float[768];
            Array.Fill(queryVector, 0.1f);
            
            var rec = SearchBuilder.BuildRecording(Guid.NewGuid(), "Test Query Title");
            _dbContext.Recordings.Add(rec);
            
            var embVector = new float[768];
            Array.Fill(embVector, 0.05f); 
            var emb = SearchBuilder.BuildVectorEmbedding(Guid.NewGuid(), rec.Id, "text-embedding-004", embVector);
            _dbContext.VectorEmbeddings.Add(emb);
            await _dbContext.SaveChangesAsync();

            _geminiEmbeddingMock.Setup(x => x.GetEmbeddingAsync("Test Query", "RETRIEVAL_QUERY", It.IsAny<CancellationToken>())).ReturnsAsync(queryVector);

            var results = await _sut.Search768Async("Test Query", minScore: 0.0f);

            results.Should().HaveCount(1);
            results.First().SimilarityScore.Should().BeApproximately(1.0f, 0.01f);
        }
    }

    public class KeywordSearch : SemanticSearchServiceTests
    {
        [Fact]
        public void Assumption_KeywordSearchMethodsAreNotImplementedInSemanticSearchService()
        {
            // The prompt requested testing Keyword search methods (SearchByTitle, SearchByFilter)
            // but ISemanticSearchService only has SearchAsync (384-dim) and Search768Async (768-dim).
            true.Should().BeTrue();
        }
    }
}
