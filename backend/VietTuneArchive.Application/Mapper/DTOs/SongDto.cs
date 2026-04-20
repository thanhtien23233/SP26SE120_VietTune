using static VietTuneArchive.Application.Mapper.DTOs.CommonDto;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class SongDto
    {

        public class SongDetailDto : SongSummaryDto
        {
            public string Artist { get; set; } = default!;
            public string Region { get; set; } = default!;
            public string Duration { get; set; } = default!;
            public DateTime PublishedAt { get; set; }
            public string Description { get; set; } = default!;
        }
    }
}
