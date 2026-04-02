using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;

namespace VietTuneArchive.API.Controllers
{
    [ApiController]
    [Route("api/search")]
    public class SemanticSearchController : ControllerBase
    {
        private readonly ISemanticSearchService _searchService;

        public SemanticSearchController(ISemanticSearchService searchService)
        {
            _searchService = searchService;
        }

        /// <summary>
        /// GET /api/search/semantic?q=...&topK=10&minScore=0.5
        /// Tìm kiếm recording theo ngữ nghĩa.
        /// </summary>
        [HttpGet("semantic")]
        public async Task<IActionResult> SemanticSearch(
            [FromQuery(Name = "q")] string query,
            [FromQuery] int topK = 10,
            [FromQuery] float minScore = 0.5f,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new { message = "Query parameter 'q' is required." });

            topK = Math.Clamp(topK, 1, 50);
            minScore = Math.Clamp(minScore, 0f, 1f);

            var results = await _searchService.SearchAsync(query, topK, minScore, ct);

            return Ok(new
            {
                query,
                totalResults = results.Count,
                results
            });
        }
    }
}
