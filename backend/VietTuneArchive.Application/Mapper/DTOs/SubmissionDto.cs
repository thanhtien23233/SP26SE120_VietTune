using System;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class SubmissionDto
    {
        public Guid Id { get; set; }
        public Guid RecordingId { get; set; }
        public Guid ContributorId { get; set; }
        public int CurrentStage { get; set; }
        public int Status { get; set; }
        public string? Notes { get; set; }
        public DateTime SubmittedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
