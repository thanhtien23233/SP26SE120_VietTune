using static VietTuneArchive.Application.Mapper.DTOs.CommonDto;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class MediaDto
    {
        public class MediaFileDetailDto : MediaFileDto
        {
            public string SubmissionId { get; set; } = default!;
            public string MimeType { get; set; } = default!;
            public long FileSize { get; set; }
            public string? Type { get; set; }
            public string? Duration { get; set; }
            public DateTime UploadedAt { get; set; }
            public string? ThumbnailUrl { get; set; }
            public object? Metadata { get; set; }
            public string? UploadUrl { get; set; }
        }
    }
}
