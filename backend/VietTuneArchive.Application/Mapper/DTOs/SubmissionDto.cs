using System;

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
}
