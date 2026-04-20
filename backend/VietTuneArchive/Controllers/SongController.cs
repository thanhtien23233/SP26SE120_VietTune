using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.Mapper.DTOs;
using static VietTuneArchive.Application.Mapper.DTOs.CommonDto;
using static VietTuneArchive.Application.Mapper.DTOs.MediaDto;
using static VietTuneArchive.Application.Mapper.DTOs.SongDto;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SongController : ControllerBase
    {
        // GET: /api/songs
        [HttpGet]
        public ActionResult<PagedList<SongSummaryDto>> GetSongs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? sort = "created")
        {
            var songs = new PagedList<SongSummaryDto>
            {
                Items = new List<SongSummaryDto>(),
                Page = page,
                PageSize = pageSize,
                Total = 1250
            };
            return Ok(songs);
        }

        // GET: /api/songs/{songId}
        [HttpGet("{songId}")]
        public ActionResult<SongDetailDto> GetSong(string songId)
        {
            var song = new SongDetailDto
            {
                Id = songId,
                Title = "Hò khoan Lệ Thủy",
                Region = "Bắc Trung Bộ",
                Artist = "Nghệ sĩ dân gian",
                Duration = "4:23",
                PublishedAt = DateTime.UtcNow.AddMonths(-3)
            };
            return Ok(song);
        }

        // GET: /api/songs/{songId}/media
        [HttpGet("{songId}/media")]
        public ActionResult<List<MediaFileDetailDto>> GetSongMedia(string songId)
        {
            var media = new List<MediaFileDetailDto>
            {
                new() { Id = "media-001", Type = "Audio", Url = "https://cdn.song.mp3", IsPrimary = true },
                new() { Id = "media-002", Type = "Video", Url = "https://cdn.video.mp4", IsPrimary = false }
            };
            return Ok(media);
        }

        // GET: /api/songs/{songId}/transcription
        [HttpGet("{songId}/transcription")]
        public ActionResult<TranscriptionDto> GetTranscription(string songId)
        {
            var transcription = new TranscriptionDto
            {
                Content = "Hò ơi... Lệ Thủy hò khoan ai nghe mà chẳng say đắm...",
                Language = "vi-VN"
            };
            return Ok(transcription);
        }

        // GET: /api/songs/{songId}/annotations
        [HttpGet("{songId}/annotations")]
        public ActionResult<PagedList<AnnotationDto>> GetAnnotations(string songId)
        {
            var annotations = new PagedList<AnnotationDto>();
            return Ok(annotations);
        }

        // GET: /api/songs/{songId}/related
        [HttpGet("{songId}/related")]
        public ActionResult<List<SongSummaryDto>> GetRelatedSongs(string songId, [FromQuery] int limit = 5)
        {
            var related = new List<SongSummaryDto>();
            return Ok(related);
        }

        // POST: /api/songs/{songId}/view
        [HttpPost("{songId}/view")]
        public ActionResult<BaseResponse> RecordView(string songId)
        {
            return Ok(new BaseResponse { Success = true });
        }

        // GET: /api/songs/featured
        [HttpGet("featured")]
        public ActionResult<List<SongSummaryDto>> GetFeatured([FromQuery] int limit = 10)
        {
            var featured = new List<SongSummaryDto>();
            return Ok(featured);
        }

        // GET: /api/songs/recent
        [HttpGet("recent")]
        public ActionResult<List<SongSummaryDto>> GetRecent([FromQuery] int limit = 20)
        {
            var recent = new List<SongSummaryDto>();
            return Ok(recent);
        }

        // GET: /api/songs/popular
        [HttpGet("popular")]
        public ActionResult<List<SongSummaryDto>> GetPopular([FromQuery] int limit = 20)
        {
            var popular = new List<SongSummaryDto>();
            return Ok(popular);
        }

        // GET: /api/songs/by-ethnic-group/{id}
        [HttpGet("by-ethnic-group/{id}")]
        public ActionResult<PagedList<SongSummaryDto>> GetByEthnicGroup(string id,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var songs = new PagedList<SongSummaryDto>();
            return Ok(songs);
        }

        // GET: /api/songs/by-genre/{id}
        [HttpGet("by-genre/{id}")]
        public ActionResult<PagedList<SongSummaryDto>> GetByGenre(string id,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var songs = new PagedList<SongSummaryDto>();
            return Ok(songs);
        }
    }
}
