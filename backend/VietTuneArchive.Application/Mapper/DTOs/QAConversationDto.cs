namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class QAConversationDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string? Title { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
