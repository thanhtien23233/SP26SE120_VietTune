namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class CommuneDto
    {
        public Guid Id { get; set; }
        public Guid DistrictId { get; set; }
        public string Name { get; set; } = default!;
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }
}
