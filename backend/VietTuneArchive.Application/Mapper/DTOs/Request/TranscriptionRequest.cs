namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class TranscriptionRequest
    {
        public class UpdateTranscriptionRequest
        {
            public string Content { get; set; } = default!;
            public string Language { get; set; } = "vi-VN";
        }

        public class VerifyTranscriptionRequest
        {
            public bool IsApproved { get; set; }
            public string? Feedback { get; set; }
        }
    }
}
