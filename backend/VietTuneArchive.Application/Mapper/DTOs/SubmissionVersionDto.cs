using System;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class SubmissionVersionDto
    {
        public Guid Id { get; set; }
        public Guid SubmissionId { get; set; }
        public int VersionNumber { get; set; }
        public string? ChangesJson { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
