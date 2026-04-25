using FluentAssertions;
using Moq;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Services;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;
using Xunit;
using AutoMapper;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Tests.Unit.Services;

public class KBRevisionServiceTests
{
    private readonly Mock<IKBRevisionRepository> _revisionRepoMock;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IKBEntryRepository> _entryRepoMock;
    private readonly KBRevisionService _sut;

    public KBRevisionServiceTests()
    {
        _revisionRepoMock = new Mock<IKBRevisionRepository>();
        _mapperMock = new Mock<IMapper>();
        _userRepoMock = new Mock<IUserRepository>();
        _entryRepoMock = new Mock<IKBEntryRepository>();

        _sut = new KBRevisionService(
            _revisionRepoMock.Object,
            _mapperMock.Object,
            _userRepoMock.Object,
            _entryRepoMock.Object
        );
    }

    private User SetupUser(Guid id, string role)
    {
        var user = new User { Id = id, Role = role };
        _userRepoMock.Setup(x => x.GetByIdAsync(id)).ReturnsAsync(user);
        return user;
    }

    #region Version History

    [Fact]
    public async Task GetRevisionHistory_ForEntryWithMultipleRevisions_ReturnsOrderedDesc()
    {
        // Arrange
        var entryId = Guid.NewGuid();
        var rev1 = new KBRevision { Id = Guid.NewGuid(), EntryId = entryId, CreatedAt = DateTime.UtcNow.AddDays(-1) };
        var rev2 = new KBRevision { Id = Guid.NewGuid(), EntryId = entryId, CreatedAt = DateTime.UtcNow };
        
        // Setup repository to return out of order just to test sorting in service
        var revisions = new List<KBRevision> { rev1, rev2 };
        _revisionRepoMock.Setup(x => x.GetAsync(It.IsAny<System.Linq.Expressions.Expression<Func<KBRevision, bool>>>()))
                         .ReturnsAsync(revisions);
                         
        _mapperMock.Setup(x => x.Map<List<KBRevisionDto>>(It.IsAny<List<KBRevision>>()))
                   .Returns((List<KBRevision> src) => src.Select(r => new KBRevisionDto { Id = r.Id }).ToList());

        // Act
        var result = await _sut.GetByEntryAsync(entryId);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().HaveCount(2);
        // Map maintains the sorted order from the service
        result.Data.First().Id.Should().Be(rev2.Id); // rev2 is newer
    }

    [Fact]
    public async Task GetLatestRevision_ReturnsExactSnapshot()
    {
        // Arrange
        var entryId = Guid.NewGuid();
        var rev1 = new KBRevision { Id = Guid.NewGuid(), EntryId = entryId, CreatedAt = DateTime.UtcNow.AddDays(-1) };
        var rev2 = new KBRevision { Id = Guid.NewGuid(), EntryId = entryId, CreatedAt = DateTime.UtcNow };
        
        _revisionRepoMock.Setup(x => x.GetAsync(It.IsAny<System.Linq.Expressions.Expression<Func<KBRevision, bool>>>()))
                         .ReturnsAsync(new List<KBRevision> { rev1, rev2 });
                         
        _mapperMock.Setup(x => x.Map<KBRevisionDto>(rev2))
                   .Returns(new KBRevisionDto { Id = rev2.Id });

        // Act
        var result = await _sut.GetLatestRevisionAsync(entryId);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Id.Should().Be(rev2.Id);
    }

    #endregion

    #region Rollback

    [Fact]
    public async Task Rollback_ToPreviousRevision_RestoresContentAndCreatesNewRevision()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupUser(userId, "Expert");
        
        var entryId = Guid.NewGuid();
        var entry = new KBEntry { Id = entryId, Content = "Current Content" };
        _entryRepoMock.Setup(x => x.GetByIdAsync(entryId)).ReturnsAsync(entry);

        var revisionId = Guid.NewGuid();
        var pastRevision = new KBRevision { Id = revisionId, EntryId = entryId, Content = "Past Content" };
        _revisionRepoMock.Setup(x => x.GetByIdAsync(revisionId)).ReturnsAsync(pastRevision);

        // Act
        var result = await _sut.RollbackAsync(entryId, revisionId, userId);

        // Assert
        result.Success.Should().BeTrue();
        entry.Content.Should().Be("Past Content");
        _entryRepoMock.Verify(x => x.UpdateAsync(entry), Times.Once);
        _entryRepoMock.Verify(x => x.CreateRevisionAsync(It.Is<KBRevision>(r => 
            r.Content == "Past Content" && 
            r.RevisionNote.Contains(revisionId.ToString()))), Times.Once);
    }

    [Fact]
    public async Task Rollback_ByContributorRole_ThrowsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupUser(userId, "Contributor");
        var entryId = Guid.NewGuid();
        var revisionId = Guid.NewGuid();

        // Act
        var result = await _sut.RollbackAsync(entryId, revisionId, userId);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Forbidden");
    }

    [Fact]
    public async Task Rollback_ToNonExistentRevisionId_ReturnsNotFoundError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupUser(userId, "Expert");
        var entryId = Guid.NewGuid();
        
        _entryRepoMock.Setup(x => x.GetByIdAsync(entryId)).ReturnsAsync(new KBEntry { Id = entryId });
        _revisionRepoMock.Setup(x => x.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((KBRevision?)null);

        // Act
        var result = await _sut.RollbackAsync(entryId, Guid.NewGuid(), userId);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Revision not found");
    }

    #endregion
}
