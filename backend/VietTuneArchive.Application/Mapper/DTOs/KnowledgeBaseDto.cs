namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class KnowledgeBaseDto
    {
        public class ArticleSummaryDto
        {
            public string Id { get; set; } = default!;
            public string Title { get; set; } = default!;
            public string Category { get; set; } = default!;
            public string Excerpt { get; set; } = default!;
            public string Author { get; set; } = default!;
            public DateTime PublishedAt { get; set; }
            public int Views { get; set; }
        }

        public class ArticleDetailDto : ArticleSummaryDto
        {
            public string Content { get; set; } = default!;
            public string[] RelatedSongIds { get; set; } = default!;
        }
    }
}
