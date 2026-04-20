using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.Mapper.DTOs;
using static VietTuneArchive.Application.Mapper.DTOs.SearchDto;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SearchController : ControllerBase
    {
        // GET: /api/search/songs?q=lệ+thủy&ethnic=tày
        [HttpGet("songs")]
        public ActionResult<PagedList<SongSearchResultDto>> SearchSongs(
            [FromQuery] string q,
            [FromQuery] string? ethnic = null,
            [FromQuery] string? genre = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var results = new PagedList<SongSearchResultDto>();
            return Ok(results);
        }

        // GET: /api/search/instruments?q=đàn+bầu&category=dây
        [HttpGet("instruments")]
        public ActionResult<PagedList<InstrumentSearchResultDto>> SearchInstruments(
            [FromQuery] string q,
            [FromQuery] string? category = null,
            [FromQuery] string? ethnic = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var results = new PagedList<InstrumentSearchResultDto>();
            return Ok(results);
        }

        // GET: /api/search/knowledge-base?q=nhạc+cụ&category=culture
        [HttpGet("knowledge-base")]
        public ActionResult<PagedList<ArticleSearchResultDto>> SearchKnowledgeBase(
            [FromQuery] string q,
            [FromQuery] string? category = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 15)
        {
            var results = new PagedList<ArticleSearchResultDto>();
            return Ok(results);
        }

        // GET: /api/search/all?q=đàn bầu lệ thủy
        [HttpGet("all")]
        public ActionResult<UnifiedSearchResultDto> SearchAll(
            [FromQuery] string q,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = new UnifiedSearchResultDto
            {
                Songs = new PagedList<SongSearchResultDto>(),
                Instruments = new PagedList<InstrumentSearchResultDto>(),
                Articles = new PagedList<ArticleSearchResultDto>(),
                Total = 45
            };
            return Ok(result);
        }

        // GET: /api/search/suggestions?q=đàn
        [HttpGet("suggestions")]
        public ActionResult<List<SearchSuggestionDto>> GetSuggestions([FromQuery] string q)
        {
            var suggestions = new List<SearchSuggestionDto>
            {
                new() { Text = "đàn bầu", Type = "instrument", Score = 95 },
                new() { Text = "đàn tính", Type = "instrument", Score = 88 },
                new() { Text = "Đàn bầu - Lịch sử", Type = "article", Score = 75 }
            };
            return Ok(suggestions);
        }
    }
}
