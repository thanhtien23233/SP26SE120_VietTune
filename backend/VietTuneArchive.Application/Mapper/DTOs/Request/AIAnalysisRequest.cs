namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class AIAnalysisRequest
    {
        public class AnalyzeRequest
        {
            public string[] Tasks { get; set; } = default!;  // ["bpm", "key", "genre", "instruments"]
            public string Language { get; set; } = "vi-VN";
        }
        public class SuggestMetadataRequest
        {
            public string MediaFileId { get; set; } = default!;
            public string AudioFeatures { get; set; } = default!;  // JSON BPM/key/etc
            public string SubmissionContext { get; set; } = default!;  // Để AI hiểu context VN
        }
    }
}
