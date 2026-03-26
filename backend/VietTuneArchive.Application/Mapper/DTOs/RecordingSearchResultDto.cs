namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class RecordingSearchResultDto
    {
        public IEnumerable<GetRecordingDto> Data { get; set; } = new List<GetRecordingDto>();
        public int Total { get; set; }
    }
}
