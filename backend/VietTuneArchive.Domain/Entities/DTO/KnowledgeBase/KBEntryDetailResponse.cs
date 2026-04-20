namespace VietTuneArchive.Domain.Entities.DTO.KnowledgeBase
{
    public class KBEntryDetailResponse
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Slug { get; set; }
        public string Content { get; set; }
        public string Category { get; set; }
        public int Status { get; set; }
        public KBAuthorResponse Author { get; set; }
        public List<KBCitationResponse> Citations { get; set; }
        public KBRevisionResponse? LatestRevision { get; set; }
        public int RevisionCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
