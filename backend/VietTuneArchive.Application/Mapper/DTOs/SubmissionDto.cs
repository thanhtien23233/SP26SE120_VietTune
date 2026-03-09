using System;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class SubmissionDto
    {
        public string AudioFileUrl { get; set; }
        public Guid UploadedById { get; set; }
    }
    public class SubmissionResponseDto
    {
        public string AudioFileUrl { get; set; }
        public Guid UploadedById { get; set; }
        public Guid SubmissionId { get; set; }
        public Guid RecordingId { get; set; }
    }
    public class GetSubmissionDto
    {
        public Guid Id { get; set; }
        public Guid RecordingId { get; set; }
        public Guid ContributorId { get; set; }
        public int CurrentStage { get; set; }
        public SubmissionStatus Status { get; set; }
        public string? Notes { get; set; }
        public DateTime SubmittedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public RecordingDto Recording { get; set; }
    }
}
