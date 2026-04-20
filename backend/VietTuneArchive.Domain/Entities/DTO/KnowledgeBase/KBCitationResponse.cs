namespace VietTuneArchive.Domain.Entities.DTO.KnowledgeBase
{
    public class KBCitationResponse
    {
        public Guid Id { get; set; }
        public string Citation { get; set; }
        public string? Url { get; set; }
    }
}
