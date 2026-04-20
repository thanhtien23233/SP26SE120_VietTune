namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class SearchDto
    {
        public class SongSearchResultDto
        {
            public string Id { get; set; } = default!;
            public string Title { get; set; } = default!;
            public string Artist { get; set; } = default!;
            public double Score { get; set; }  // Relevance score 0-100
            public string EthnicGroup { get; set; } = default!;
        }

        public class InstrumentSearchResultDto
        {
            public string Id { get; set; } = default!;
            public string Name { get; set; } = default!;
            public string Category { get; set; } = default!;
            public double Score { get; set; }
        }

        public class ArticleSearchResultDto
        {
            public string Id { get; set; } = default!;
            public string Title { get; set; } = default!;
            public string Excerpt { get; set; } = default!;
            public double Score { get; set; }
        }

        public class UnifiedSearchResultDto
        {
            public PagedList<SongSearchResultDto> Songs { get; set; } = new();
            public PagedList<InstrumentSearchResultDto> Instruments { get; set; } = new();
            public PagedList<ArticleSearchResultDto> Articles { get; set; } = new();
            public int Total { get; set; }
        }

        public class SearchSuggestionDto
        {
            public string Text { get; set; } = default!;
            public string Type { get; set; } = default!;  // song, instrument, article
            public double Score { get; set; }
        }
    }
}
