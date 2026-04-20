namespace VietTuneArchive.Domain.Entities.DTO.KnowledgeBase
{
    public class KBAuthorResponse
    {
        public Guid Id { get; set; }
        public string FullName { get; set; }
        public string? AvatarUrl { get; set; }
        public string Role { get; set; }
    }
}
