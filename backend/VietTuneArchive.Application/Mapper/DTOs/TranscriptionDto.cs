namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class TranscriptionDto
    {
        public string SubmissionId { get; set; } = default!;
        public string Content { get; set; } = default!;
        public string Language { get; set; } = "vi-VN";
        public string Status { get; set; } = default!;  // Draft, Auto, Verified, Rejected
        public string Version { get; set; } = default!;
        public DateTime UpdatedAt { get; set; }

        public class TranscriptionVersionDto
        {
            public string Version { get; set; } = default!;
            public string Content { get; set; } = default!;
            public DateTime UpdatedAt { get; set; }
            public string UpdatedBy { get; set; } = default!;
        }
    }
}
