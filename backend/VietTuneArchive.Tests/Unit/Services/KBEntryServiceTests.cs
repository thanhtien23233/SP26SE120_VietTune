using FluentAssertions;
using Moq;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Services;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.DTO.KnowledgeBase;
using VietTuneArchive.Domain.IRepositories;
using Xunit;

namespace VietTuneArchive.Tests.Unit.Services;

public class KBEntryServiceTests
{
    private readonly Mock<IKBEntryRepository> _repoMock;
    private readonly Mock<IEmbeddingService> _embeddingMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IRecordingRepository> _recordingRepoMock;
    private readonly KBEntryService _sut;

    public KBEntryServiceTests()
    {
        _repoMock = new Mock<IKBEntryRepository>();
        _embeddingMock = new Mock<IEmbeddingService>();
        _userRepoMock = new Mock<IUserRepository>();
        _recordingRepoMock = new Mock<IRecordingRepository>();

        _sut = new KBEntryService(
            _repoMock.Object,
            _embeddingMock.Object,
            _userRepoMock.Object,
            _recordingRepoMock.Object
        );
    }

    private User SetupUser(Guid id, string role)
    {
        var user = new User { Id = id, Role = role };
        _userRepoMock.Setup(x => x.GetByIdAsync(id)).ReturnsAsync(user);
        return user;
    }

    private KBEntry SetupEntry(Guid id, string title, int status = 0, Guid? authorId = null)
    {
        var entry = new KBEntry
        {
            Id = id,
            Title = title,
            Category = "Instrument",
            Content = "Test content",
            Status = status,
            AuthorId = authorId ?? Guid.NewGuid()
        };
        _repoMock.Setup(x => x.GetByIdAsync(id)).ReturnsAsync(entry);
        return entry;
    }

    #region CRUD & Validation

    [Fact]
    public async Task CreateEntry_ValidInput_ReturnsCreatedEntry()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupUser(userId, "Expert");
        
        var request = new CreateKBEntryRequest
        {
            Title = "Dan Bau",
            Content = "A traditional Vietnamese instrument.",
            Category = "Instrument"
        };

        _repoMock.Setup(x => x.SlugExistsAsync(It.IsAny<string>(), null)).ReturnsAsync(false);
        _repoMock.Setup(x => x.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(new KBEntry { Title = "Dan Bau" }); // Mock the fetch after create

        // Act
        var result = await _sut.CreateEntryAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        _repoMock.Verify(x => x.CreateAsync(It.IsAny<KBEntry>()), Times.Once);
        _repoMock.Verify(x => x.CreateRevisionAsync(It.IsAny<KBRevision>()), Times.Once);
    }

    [Fact]
    public async Task CreateEntry_MissingRequiredFields_ThrowsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupUser(userId, "Expert");
        
        var request = new CreateKBEntryRequest { Title = "", Content = "Test", Category = "Instrument" };

        // Act
        Func<Task> act = async () => await _sut.CreateEntryAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<BadRequestException>().WithMessage("*Missing required fields.*");
    }

    [Fact]
    public async Task GetById_NonExistentId_ThrowsNotFound()
    {
        // Arrange
        var id = Guid.NewGuid();
        _repoMock.Setup(x => x.GetByIdAsync(id)).ReturnsAsync((KBEntry?)null);

        // Act
        Func<Task> act = async () => await _sut.GetEntryByIdAsync(id);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateEntry_ValidInput_UpdatesFields()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupUser(userId, "Expert");
        var entryId = Guid.NewGuid();
        var entry = SetupEntry(entryId, "Old Title");
        
        var request = new UpdateKBEntryRequest { Title = "New Title", Content = "New Content", Category = "Instrument" };
        _repoMock.Setup(x => x.SlugExistsAsync(It.IsAny<string>(), It.IsAny<Guid?>())).ReturnsAsync(false);

        // Act
        var result = await _sut.UpdateEntryAsync(userId, entryId, request);

        // Assert
        _repoMock.Verify(x => x.UpdateAsync(It.Is<KBEntry>(e => e.Title == "New Title")), Times.Once);
        _repoMock.Verify(x => x.CreateRevisionAsync(It.IsAny<KBRevision>()), Times.Once);
    }

    [Fact]
    public async Task DeleteEntry_WithActiveCitations_ThrowsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupUser(userId, "Admin");
        var entryId = Guid.NewGuid();
        var entry = SetupEntry(entryId, "Title");
        entry.KBCitations = new List<KBCitation> { new KBCitation() };

        // Act
        Func<Task> act = async () => await _sut.DeleteEntryAsync(entryId, userId);

        // Assert
        await act.Should().ThrowAsync<BadRequestException>().WithMessage("*active citations*");
    }

    #endregion

    #region Role Enforcement

    [Fact]
    public async Task CreateEntry_ByContributorRole_ThrowsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupUser(userId, "Contributor");
        var request = new CreateKBEntryRequest { Title = "Test", Content = "Test", Category = "Instrument" };

        // Act
        Func<Task> act = async () => await _sut.CreateEntryAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>().WithMessage("*Unauthorized*");
    }

    [Fact]
    public async Task DeleteEntry_ByExpertRole_ThrowsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupUser(userId, "Expert");
        var entryId = Guid.NewGuid();

        // Act
        Func<Task> act = async () => await _sut.DeleteEntryAsync(entryId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>().WithMessage("*Unauthorized: Only Admin can delete*");
    }

    #endregion

    #region Status Lifecycle

    [Fact]
    public async Task UpdateEntryStatus_DraftToPublished_UpdatesAndGeneratesEmbedding()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        SetupEntry(entryId, "Test", 0);
        var request = new UpdateKBEntryStatusRequest { Status = 1 };

        // Act
        await _sut.UpdateEntryStatusAsync(userId, entryId, request);

        // Assert
        _repoMock.Verify(x => x.UpdateAsync(It.Is<KBEntry>(e => e.Status == 1)), Times.Once);
        _embeddingMock.Verify(x => x.GenerateEmbeddingForKBEntryAsync(entryId), Times.Once);
    }

    [Fact]
    public async Task UpdateEntryStatus_InvalidStatus_ThrowsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var entryId = Guid.NewGuid();
        SetupEntry(entryId, "Test", 0);
        var request = new UpdateKBEntryStatusRequest { Status = 99 };

        // Act
        Func<Task> act = async () => await _sut.UpdateEntryStatusAsync(userId, entryId, request);

        // Assert
        await act.Should().ThrowAsync<BadRequestException>().WithMessage("*Invalid status.*");
    }

    #endregion

    #region Search & Filter

    [Fact]
    public async Task GetEntriesAsync_WithPaginationAndFilter_ReturnsCorrectSlice()
    {
        // Arrange
        var queryParams = new KBEntryQueryParams { Page = 1, PageSize = 10 };
        var items = new List<KBEntry> { new KBEntry { Id = Guid.NewGuid(), Title = "A", Category = "Instrument" } };
        _repoMock.Setup(x => x.GetAllAsync(queryParams)).ReturnsAsync((items, 1));

        // Act
        var result = await _sut.GetEntriesAsync(queryParams);

        // Assert
        result.Total.Should().Be(1);
        result.Data.Should().HaveCount(1);
    }

    #endregion
}
