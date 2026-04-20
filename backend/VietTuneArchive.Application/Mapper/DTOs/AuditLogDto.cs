namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AuditLogDto
    {
        public Guid Id { get; set; }
        public Guid? UserId { get; set; }
        public string EntityType { get; set; } = default!;
        public string EntityId { get; set; } = default!;
        public string Action { get; set; } = default!;
        public string? OldValuesJson { get; set; }
        public string? NewValuesJson { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
