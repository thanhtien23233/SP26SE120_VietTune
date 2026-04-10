namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class AnnotationRequest
    {
        public class CreateAnnotationRequest
        {
            public double TimeStart { get; set; }
            public double TimeEnd { get; set; }
            public string Content { get; set; } = default!;
            public string Type { get; set; } = default!;
        }

        public class UpdateAnnotationRequest
        {
            public double? TimeStart { get; set; }
            public double? TimeEnd { get; set; }
            public string? Content { get; set; }
            public string? Type { get; set; }
        }
    }
}
