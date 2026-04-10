namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class VocalStyleDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public Guid? EthnicGroupId { get; set; }
    }
}
