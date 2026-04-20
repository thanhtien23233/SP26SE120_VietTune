namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class KnowledgeBaseRequest
    {
        public class CreateArticleRequest
        {
            public string Title { get; set; } = default!;
            public string Category { get; set; } = default!;
            public string Content { get; set; } = default!;
            public string[] RelatedSongIds { get; set; } = default!;
        }

        public class UpdateArticleRequest
        {
            public string? Title { get; set; }
            public string? Category { get; set; }
            public string? Content { get; set; }
            public string[]? RelatedSongIds { get; set; }
        }
    }
}
