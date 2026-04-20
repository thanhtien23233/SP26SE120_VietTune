namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class DistrictDto
    {
        public Guid Id { get; set; }
        public Guid ProvinceId { get; set; }
        public string Name { get; set; } = default!;
    }
}
