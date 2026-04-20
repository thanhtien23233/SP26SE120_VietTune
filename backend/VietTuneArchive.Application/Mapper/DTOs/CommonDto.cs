// VietTuneArchive.Application.Mapper.DTOs/CommonDto.cs
namespace VietTuneArchive.Application.Mapper.DTOs
{
    // 1. Pagination
    public class PagedList<T>
    {
        public List<T> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int Total { get; set; }
    }

    // 2. Base Response
    public class BaseResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = default!;
        public object? Data { get; set; }

    }

    public static class CommonDto
    {
        // 3. Song
        public class SongSummaryDto
        {
            public string Id { get; set; } = default!;
            public string Title { get; set; } = default!;
        }

        // 4. Category
        public class CategoryDto
        {
            public string Id { get; set; } = default!;
            public string Name { get; set; } = default!;
            public string Icon { get; set; } = default!;
            public string? Code { get; set; }
        }

        // 5. User
        public class UserSummaryDto
        {
            public string Id { get; set; } = default!;
            public string Email { get; set; } = default!;
            public string FullName { get; set; } = default!;
            public string Role { get; set; } = default!;
        }

        // 6. Submission
        public class SubmissionSummaryDto
        {
            public string Id { get; set; } = default!;
            public string Title { get; set; } = default!;
            public string Status { get; set; } = default!;
        }

        // 7. Media File
        public class MediaFileDto
        {
            public string Id { get; set; } = default!;
            public string FileName { get; set; } = default!;
            public string Url { get; set; } = default!;
            public bool IsPrimary { get; set; }
        }

        // 8. Reference Item
        public class ReferenceItemDto
        {
            public string Id { get; set; } = default!;
            public string Name { get; set; } = default!;
            public string Code { get; set; } = default!;
        }

        // 9. Transcription
        public class SongTranscriptionDto
        {
            public string Content { get; set; } = default!;
            public string Language { get; set; } = "vi-VN";
        }

        // 10. Annotation
        public class SongAnnotationDto
        {
            public string Id { get; set; } = default!;
            public double TimeStart { get; set; }
            public string Content { get; set; } = default!;
        }

        // 11. Audit Log
        public class AuditLogDto
        {
            public string Id { get; set; } = default!;
            public string UserId { get; set; } = default!;
            public string Action { get; set; } = default!;
            public DateTime Timestamp { get; set; }
        }
        public class JobDto
        {
            public string Id { get; set; } = default!;
            public string Status { get; set; } = default!;
            public int Progress { get; set; }
            public string? Error { get; set; }
            public DateTime RequestedAt { get; set; }
        }

        public class TranscriptionJobDto : JobDto
        {
            public string MediaFileId { get; set; } = default!;
            public string Language { get; set; } = "vi-VN";
            public string? Transcript { get; set; }
            public string? SubmissionId { get; set; }
        }
    }
}
