namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class RecordingFilterDto
    {
        public Guid? EthnicGroupId { get; set; }
        public Guid? InstrumentId { get; set; }
        public Guid? CeremonyId { get; set; }
        public string? RegionCode { get; set; }
        public Guid? CommuneId { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SortOrder { get; set; } = "desc"; // asc or desc
    }
}
