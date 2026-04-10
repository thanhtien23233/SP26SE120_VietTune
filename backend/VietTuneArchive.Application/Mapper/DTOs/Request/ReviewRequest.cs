namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class ReviewRequest
    {
        public class UpdateChecklistRequest
        {
            public Dictionary<string, bool> ChecklistItems { get; set; } = new();  // "audio_quality: true"
            public List<string> Comments { get; set; } = new();
        }

        public class SubmissionMetadataRequest
        {
            public string Title { get; set; } = default!;
            public string Artist { get; set; } = default!;
            public string EthnicGroupId { get; set; } = default!;
            public string RegionId { get; set; } = default!;
            // ... other metadata fields
        }

        public class TranscriptionUpdateRequest
        {
            public string Content { get; set; } = default!;
            public string Language { get; set; } = "vi-VN";
        }

        public class ApproveRequest
        {
            public string? FinalNotes { get; set; }
        }

        public class RejectRequest
        {
            public string Reason { get; set; } = default!;
            public string Feedback { get; set; } = default!;
        }

        public class RequestChangesRequest
        {
            public string Feedback { get; set; } = default!;
            public List<string> RequiredChanges { get; set; } = new();
        }
    }
}
