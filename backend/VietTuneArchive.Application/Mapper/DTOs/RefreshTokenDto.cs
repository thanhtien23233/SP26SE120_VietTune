namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class RefreshTokenDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Token { get; set; } = default!;
        public DateTime ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
