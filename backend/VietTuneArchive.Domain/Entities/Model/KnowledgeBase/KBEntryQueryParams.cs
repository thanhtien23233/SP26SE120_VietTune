namespace VietTuneArchive.Application.DTOs.KnowledgeBase
{
    public class KBEntryQueryParams
    {
        public string? Category { get; set; }
        public int? Status { get; set; }
        public string? Search { get; set; }
        public string? SortBy { get; set; }
        public string? SortOrder { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
