using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Services;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Domain.IRepositories;
using Xunit;
using AutoMapper;

namespace VietTuneArchive.Tests.Unit.Services;

public class SubmissionServiceTests
{
    private readonly Mock<IGenericRepository<Submission>> _genericRepoMock;
    private readonly Mock<ISubmissionRepository> _submissionRepoMock;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IRecordingRepository> _recordingRepoMock;
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly Mock<IEmbeddingService> _embeddingServiceMock;
    private readonly Mock<ILogger<SubmissionService2>> _loggerMock;
    private readonly SubmissionService2 _sut;

    public SubmissionServiceTests()
    {
        _genericRepoMock = new Mock<IGenericRepository<Submission>>();
        _submissionRepoMock = new Mock<ISubmissionRepository>();
        _mapperMock = new Mock<IMapper>();
        _userRepoMock = new Mock<IUserRepository>();
        _recordingRepoMock = new Mock<IRecordingRepository>();
        _notificationServiceMock = new Mock<INotificationService>();
        _embeddingServiceMock = new Mock<IEmbeddingService>();
        _loggerMock = new Mock<ILogger<SubmissionService2>>();

        _sut = new SubmissionService2(
            _genericRepoMock.Object,
            _submissionRepoMock.Object,
            _mapperMock.Object,
            _userRepoMock.Object,
            _recordingRepoMock.Object,
            _notificationServiceMock.Object,
            _embeddingServiceMock.Object,
            _loggerMock.Object
        );
    }

    private (Submission submission, Recording recording) SetupSubmissionState(SubmissionStatus subStatus, SubmissionStatus recStatus)
    {
        var submissionId = Guid.NewGuid();
        var recordingId = Guid.NewGuid();
        var contributorId = Guid.NewGuid();

        var recording = new Recording
        {
            Id = recordingId,
            Status = recStatus,
            Title = "Test Recording"
        };

        var submission = new Submission
        {
            Id = submissionId,
            RecordingId = recordingId,
            Recording = recording,
            ContributorId = contributorId,
            Status = subStatus
        };

        _submissionRepoMock.Setup(x => x.GetSubmissionByIdAsync(submissionId)).ReturnsAsync(submission);
        _recordingRepoMock.Setup(x => x.GetByIdAsync(recordingId)).ReturnsAsync(recording);

        return (submission, recording);
    }

    #region State Transitions

    [Fact]
    public async Task ConfirmSubmit_WhenDraft_TransitionsToPending()
    {
        // Arrange
        // Note: The actual code implementation requires Recording to be in Pending state
        // to succeed (even if Submission is Draft). We arrange according to actual code.
        var (submission, recording) = SetupSubmissionState(SubmissionStatus.Draft, SubmissionStatus.Pending);

        // Act
        var result = await _sut.ConfirmSubmit(submission.Id);

        // Assert
        result.IsSuccess.Should().BeTrue();
        submission.Status.Should().Be(SubmissionStatus.Pending);
        _submissionRepoMock.Verify(x => x.UpdateAsync(submission), Times.Once);
    }

    [Fact]
    public async Task AssignReviewer_WhenPending_AssignsExpert()
    {
        // Arrange
        var (submission, _) = SetupSubmissionState(SubmissionStatus.Pending, SubmissionStatus.Pending);
        var reviewerId = Guid.NewGuid();
        
        _userRepoMock.Setup(x => x.GetByIdAsync(reviewerId)).ReturnsAsync(new User { Id = reviewerId, Role = "Expert" });

        // Act
        var result = await _sut.AssignReviewer(submission.Id, reviewerId);

        // Assert
        result.IsSuccess.Should().BeTrue();
        submission.ReviewerId.Should().Be(reviewerId);
        _submissionRepoMock.Verify(x => x.UpdateAsync(submission), Times.Once);
        _notificationServiceMock.Verify(x => x.SendNotificationAsync(
            reviewerId,
            It.IsAny<string>(),
            It.IsAny<string>(),
            "SubmissionAssigned",
            "Submission",
            submission.Id), Times.Once);
    }

    [Fact]
    public async Task EditRequest_WhenPending_TransitionsToUpdateRequested()
    {
        // Arrange
        var (submission, recording) = SetupSubmissionState(SubmissionStatus.Pending, SubmissionStatus.Pending);
        var reviewerId = Guid.NewGuid();

        // Act
        var result = await _sut.EditRequest(submission.Id, reviewerId);

        // Assert
        result.IsSuccess.Should().BeTrue();
        submission.Status.Should().Be(SubmissionStatus.UpdateRequested);
        recording.Status.Should().Be(SubmissionStatus.UpdateRequested);
        _submissionRepoMock.Verify(x => x.UpdateAsync(submission), Times.Once);
    }

    [Fact]
    public async Task ConfirmEdit_WhenUpdateRequested_TransitionsToPending()
    {
        // Arrange
        var (submission, recording) = SetupSubmissionState(SubmissionStatus.UpdateRequested, SubmissionStatus.UpdateRequested);

        // Act
        var result = await _sut.ConfirmEdit(submission.Id);

        // Assert
        result.IsSuccess.Should().BeTrue();
        submission.Status.Should().Be(SubmissionStatus.Pending);
        recording.Status.Should().Be(SubmissionStatus.Pending);
        _submissionRepoMock.Verify(x => x.UpdateAsync(submission), Times.Once);
    }

    [Fact]
    public async Task ApproveSubmission_WhenPending_TransitionsToApproved()
    {
        // Arrange
        var (submission, recording) = SetupSubmissionState(SubmissionStatus.Pending, SubmissionStatus.Pending);
        var reviewerId = Guid.NewGuid();

        // Act
        var result = await _sut.ApproveSubmission(submission.Id, reviewerId);

        // Assert
        result.IsSuccess.Should().BeTrue();
        submission.Status.Should().Be(SubmissionStatus.Approved);
        recording.Status.Should().Be(SubmissionStatus.Approved);
        
        _submissionRepoMock.Verify(x => x.UpdateAsync(submission), Times.Once);
        
        // Assert notifications
        _notificationServiceMock.Verify(x => x.SendNotificationAsync(
            submission.ContributorId,
            "Bản ghi đã được duyệt",
            It.IsAny<string>(),
            "SubmissionApproved",
            "Submission",
            submission.Id), Times.Once);

        // Assert embedding generation
        _embeddingServiceMock.Verify(x => x.GenerateEmbeddingForRecordingAsync(recording.Id), Times.Once);
    }

    [Fact]
    public async Task RejectSubmission_WhenPending_TransitionsToRejected()
    {
        // Arrange
        var (submission, recording) = SetupSubmissionState(SubmissionStatus.Pending, SubmissionStatus.Pending);
        var reviewerId = Guid.NewGuid();

        // Act
        var result = await _sut.RejectSubmission(submission.Id, reviewerId);

        // Assert
        result.IsSuccess.Should().BeTrue();
        submission.Status.Should().Be(SubmissionStatus.Rejected);
        recording.Status.Should().Be(SubmissionStatus.Rejected);
        
        _submissionRepoMock.Verify(x => x.UpdateAsync(submission), Times.Once);

        // Assert notifications
        _notificationServiceMock.Verify(x => x.SendNotificationAsync(
            submission.ContributorId,
            "Bản ghi bị từ chối",
            It.IsAny<string>(),
            "SubmissionRejected",
            "Submission",
            submission.Id), Times.Once);
    }

    #endregion

    #region Invalid Transitions (Edge Cases)

    [Fact]
    public async Task ApproveSubmission_WhenApproved_ReturnsFailure()
    {
        // Arrange
        var (submission, _) = SetupSubmissionState(SubmissionStatus.Approved, SubmissionStatus.Approved);
        var reviewerId = Guid.NewGuid();

        // Act
        var result = await _sut.ApproveSubmission(submission.Id, reviewerId);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Contain("not in a state that can be approved");
        _submissionRepoMock.Verify(x => x.UpdateAsync(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task RejectSubmission_WhenRejected_ReturnsFailure()
    {
        // Arrange
        var (submission, _) = SetupSubmissionState(SubmissionStatus.Rejected, SubmissionStatus.Rejected);
        var reviewerId = Guid.NewGuid();

        // Act
        var result = await _sut.RejectSubmission(submission.Id, reviewerId);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Contain("not in a state that can be rejected");
        _submissionRepoMock.Verify(x => x.UpdateAsync(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task ConfirmSubmit_WhenNonExistent_ReturnsFailure()
    {
        // Arrange
        var missingId = Guid.NewGuid();
        _submissionRepoMock.Setup(x => x.GetSubmissionByIdAsync(missingId)).ReturnsAsync((Submission?)null);

        // Act
        var result = await _sut.ConfirmSubmit(missingId);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Be("Submission not found");
    }

    #endregion
}
