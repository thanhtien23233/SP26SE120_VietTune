namespace VietTuneArchive.Domain.Entities.DTO.KnowledgeBase
{
    public class KBRevisionDetailResponse
    {
        public Guid Id { get; set; }
        public Guid EntryId { get; set; }
        public string Content { get; set; }
        public string? RevisionNote { get; set; }
        public KBAuthorResponse Editor { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
