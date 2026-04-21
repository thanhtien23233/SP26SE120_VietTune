using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;

namespace VietTuneArchive.API.Controllers
{
    [ApiController]
    [Route("api/search")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin, Expert, Researcher")] // Allowing all authenticated users (or specific roles)
    public class SemanticSearchController : ControllerBase
    {
        private readonly ISemanticSearchService _searchService;

        public SemanticSearchController(ISemanticSearchService searchService)
        {
            _searchService = searchService;
        }

    //     /// <summary>
    //     /// GET /api/search/semantic?q=...&topK=10&minScore=0.5
    //     /// Tìm kiếm recording theo ngữ nghĩa.
    //     /// </summary>
    //     [HttpGet("semantic")]
    //     public async Task<IActionResult> SemanticSearch(
    //         [FromQuery(Name = "q")] string query,
    //         [FromQuery] int topK = 10,
    //         [FromQuery] float minScore = 0.5f,
    //         CancellationToken ct = default)
    //     {
    //         if (string.IsNullOrWhiteSpace(query))
    //             return BadRequest(new { message = "Query parameter 'q' is required." });

    //         topK = Math.Clamp(topK, 1, 50);
    //         minScore = Math.Clamp(minScore, 0f, 1f);

    //         var results = await _searchService.SearchAsync(query, topK, minScore, ct);

    //         return Ok(new
    //         {
    //             query,
    //             totalResults = results.Count,
    //             results
    //         });
    //     }

    //     /// <summary>
    //     /// GET /api/search/semantic-768?q=...
    //     /// Tìm kiếm recording sử dụng Gemini (768-dim).
    //     /// </summary>
    //     [HttpGet("semantic-768")]
    //     public async Task<IActionResult> SemanticSearch768(
    //         [FromQuery(Name = "q")] string query,
    //         [FromQuery] int topK = 10,
    //         [FromQuery] float minScore = 0.5f,
    //         CancellationToken ct = default)
    //     {
    //         if (string.IsNullOrWhiteSpace(query))
    //             return BadRequest(new { message = "Query parameter 'q' is required." });

    //         topK = Math.Clamp(topK, 1, 50);
    //         minScore = Math.Clamp(minScore, 0f, 1f);

    //         var results = await _searchService.Search768Async(query, topK, minScore, ct);

    //         return Ok(new
    //         {
    //             query,
    //             totalResults = results.Count,
    //             results
    //         });
    //     }
     }
}
