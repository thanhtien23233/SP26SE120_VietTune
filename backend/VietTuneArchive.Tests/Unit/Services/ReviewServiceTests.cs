using FluentAssertions;
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

public class ReviewServiceTests
{
    private readonly Mock<IReviewRepository> _reviewRepoMock;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<ISubmissionRepository> _submissionRepoMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly ReviewService _sut;

    public ReviewServiceTests()
    {
        _reviewRepoMock = new Mock<IReviewRepository>();
        _mapperMock = new Mock<IMapper>();
        _submissionRepoMock = new Mock<ISubmissionRepository>();
        _userRepoMock = new Mock<IUserRepository>();
        _notificationServiceMock = new Mock<INotificationService>();

        _sut = new ReviewService(
            _reviewRepoMock.Object,
            _mapperMock.Object,
            _submissionRepoMock.Object,
            _userRepoMock.Object,
            _notificationServiceMock.Object
        );
    }

    private (Submission submission, User reviewer) SetupReviewState(int currentStage, SubmissionStatus status, string reviewerRole = "Expert", bool isAssigned = true)
    {
        var submissionId = Guid.NewGuid();
        var reviewerId = Guid.NewGuid();
        var contributorId = Guid.NewGuid();

        var submission = new Submission
        {
            Id = submissionId,
            ContributorId = contributorId,
            CurrentStage = currentStage,
            Status = status,
            ReviewerId = isAssigned ? reviewerId : Guid.NewGuid()
        };

        var reviewer = new User
        {
            Id = reviewerId,
            Role = reviewerRole
        };

        _submissionRepoMock.Setup(x => x.GetByIdAsync(submissionId)).ReturnsAsync(submission);
        _userRepoMock.Setup(x => x.GetByIdAsync(reviewerId)).ReturnsAsync(reviewer);

        return (submission, reviewer);
    }

    #region Stage Progression & Outcomes

    [Fact]
    public async Task SubmitReview_AtScreening_Pass_TransitionsToVerification()
    {
        // Arrange
        var (submission, reviewer) = SetupReviewState(0, SubmissionStatus.Pending);

        // Act
        var result = await _sut.SubmitReviewAsync(submission.Id, reviewer.Id, 0, "Looks good");

        // Assert
        result.IsSuccess.Should().BeTrue();
        submission.CurrentStage.Should().Be(1);
        submission.Status.Should().Be(SubmissionStatus.Pending); // Still pending
        
        _reviewRepoMock.Verify(x => x.AddAsync(It.Is<Review>(r => r.Stage == 0 && r.Decision == 0)), Times.Once);
        _notificationServiceMock.Verify(x => x.SendNotificationAsync(submission.ContributorId, "Screening Passed", It.IsAny<string>(), "ScreeningPassed", "Submission", submission.Id), Times.Once);
    }

    [Fact]
    public async Task SubmitReview_AtVerification_Pass_TransitionsToApproval()
    {
        // Arrange
        var (submission, reviewer) = SetupReviewState(1, SubmissionStatus.Pending);

        // Act
        var result = await _sut.SubmitReviewAsync(submission.Id, reviewer.Id, 0, "Verified");

        // Assert
        result.IsSuccess.Should().BeTrue();
        submission.CurrentStage.Should().Be(2);
        
        _reviewRepoMock.Verify(x => x.AddAsync(It.Is<Review>(r => r.Stage == 1)), Times.Once);
        _notificationServiceMock.Verify(x => x.SendNotificationAsync(submission.ContributorId, "Verification Passed", It.IsAny<string>(), "VerificationPassed", "Submission", submission.Id), Times.Once);
    }

    [Fact]
    public async Task SubmitReview_AtApproval_Pass_TransitionsToFinalApproved()
    {
        // Arrange
        var (submission, reviewer) = SetupReviewState(2, SubmissionStatus.Pending);

        // Act
        var result = await _sut.SubmitReviewAsync(submission.Id, reviewer.Id, 0, "Approved for publishing");

        // Assert
        result.IsSuccess.Should().BeTrue();
        submission.Status.Should().Be(SubmissionStatus.Approved);
        
        _notificationServiceMock.Verify(x => x.SendNotificationAsync(submission.ContributorId, "Submission Approved", It.IsAny<string>(), "SubmissionApproved", "Submission", submission.Id), Times.Once);
    }

    [Fact]
    public async Task SubmitReview_AtAnyStage_Reject_TransitionsToRejected()
    {
        // Arrange
        var (submission, reviewer) = SetupReviewState(1, SubmissionStatus.Pending);

        // Act
        var result = await _sut.SubmitReviewAsync(submission.Id, reviewer.Id, 1, "Does not meet guidelines");

        // Assert
        result.IsSuccess.Should().BeTrue();
        submission.Status.Should().Be(SubmissionStatus.Rejected);
        
        _reviewRepoMock.Verify(x => x.AddAsync(It.Is<Review>(r => r.Decision == 1)), Times.Once);
        _notificationServiceMock.Verify(x => x.SendNotificationAsync(submission.ContributorId, "Submission Rejected", It.IsAny<string>(), "SubmissionRejected", "Submission", submission.Id), Times.Once);
    }

    [Fact]
    public async Task SubmitReview_OnAlreadyDecidedSubmission_ReturnsFailure()
    {
        // Arrange
        var (submission, reviewer) = SetupReviewState(2, SubmissionStatus.Approved);

        // Act
        var result = await _sut.SubmitReviewAsync(submission.Id, reviewer.Id, 0, "Late review");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Contain("already decided");
        _reviewRepoMock.Verify(x => x.AddAsync(It.IsAny<Review>()), Times.Never);
    }

    #endregion

    #region Role Enforcement & Assignment Rules

    [Fact]
    public async Task SubmitReview_ByContributorRole_ReturnsUnauthorized()
    {
        // Arrange
        var (submission, reviewer) = SetupReviewState(0, SubmissionStatus.Pending, "Contributor");

        // Act
        var result = await _sut.SubmitReviewAsync(submission.Id, reviewer.Id, 0, "Reviewing myself");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Contain("Unauthorized");
    }

    [Fact]
    public async Task SubmitReview_ByUnassignedExpert_ReturnsForbidden()
    {
        // Arrange
        var (submission, reviewer) = SetupReviewState(0, SubmissionStatus.Pending, "Expert", isAssigned: false);

        // Act
        var result = await _sut.SubmitReviewAsync(submission.Id, reviewer.Id, 0, "Stealing review");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Contain("Forbidden");
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task SubmitReview_WithNonExistentSubmission_ReturnsFailure()
    {
        // Arrange
        var submissionId = Guid.NewGuid();
        var reviewerId = Guid.NewGuid();
        _submissionRepoMock.Setup(x => x.GetByIdAsync(submissionId)).ReturnsAsync((Submission?)null);

        // Act
        var result = await _sut.SubmitReviewAsync(submissionId, reviewerId, 0, "Ghost review");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Contain("not found");
    }

    [Fact]
    public async Task SubmitReview_WithEmptyFeedbackOnReject_ReturnsValidationError()
    {
        // Arrange
        var (submission, reviewer) = SetupReviewState(0, SubmissionStatus.Pending);

        // Act - decision 1 is Reject
        var result = await _sut.SubmitReviewAsync(submission.Id, reviewer.Id, 1, "");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Contain("Validation Error: Feedback is required");
    }

    #endregion
}
