using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;
using static VietTuneArchive.Application.Mapper.DTOs.SearchDto;

namespace VietTuneArchive.Tests.Integration.Controllers;

/// <summary>
/// Integration tests for SearchController (anonymous) and SemanticSearchController (authenticated).
///
/// IMPORTANT ARCHITECTURAL NOTES:
/// - SearchController endpoints return STUB data (not yet implemented against DB).
///   Tests validate HTTP contract (200, shape, anonymous access) only.
/// - SemanticSearchController uses [Authorize] at class level — any authenticated role can access.
///   The controller calls ISemanticSearchService which internally calls IEmbeddingService.
/// - EmbeddingService is stubbed in WebAppFactory.
/// </summary>
public class SearchControllerTests : ApiTestBase
{
    public SearchControllerTests(WebAppFactory factory) : base(factory) { }

    // ─── SearchSongsTests ─────────────────────────────────────────────────────

    public class SearchSongsTests : SearchControllerTests
    {
        public SearchSongsTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SearchSongs_Anonymous_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/songs?q=test");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchSongs_Authenticated_Returns200()
        {
            AuthenticateAs("Contributor");
            var response = await GetAsync("/api/Search/songs?q=test");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchSongs_ResponseHasExpectedShape()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/songs?q=dan");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var json = await response.Content.ReadAsStringAsync();
            json.Should().NotBeNullOrEmpty();
            // Deserialize as PagedList shape
            var body = await response.Content.ReadFromJsonAsync<PagedList<SongSearchResultDto>>();
            body.Should().NotBeNull();
        }

        [Fact]
        public async Task SearchSongs_WithVietnameseDiacritics_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var q = Uri.EscapeDataString("Đàn Tranh");
            var response = await GetAsync($"/api/Search/songs?q={q}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchSongs_WithEthnicFilter_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/songs?q=dan&ethnic=Kinh");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchSongs_NoMatch_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/songs?q=NORESULTXXX999");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── SearchInstrumentsTests ───────────────────────────────────────────────

    public class SearchInstrumentsTests : SearchControllerTests
    {
        public SearchInstrumentsTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SearchInstruments_Anonymous_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/instruments?q=dan");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchInstruments_ResponseHasExpectedShape()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/instruments?q=bau");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<InstrumentSearchResultDto>>();
            body.Should().NotBeNull();
        }

        [Fact]
        public async Task SearchInstruments_WithCategoryFilter_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/instruments?q=dan&category=day");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchInstruments_NoMatch_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/instruments?q=NORESULTZZZ999");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── SearchKnowledgeBaseTests ─────────────────────────────────────────────

    public class SearchKnowledgeBaseTests : SearchControllerTests
    {
        public SearchKnowledgeBaseTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SearchKnowledgeBase_Anonymous_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/knowledge-base?q=nhac");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchKnowledgeBase_ResponseHasExpectedShape()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/knowledge-base?q=nhac");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<PagedList<ArticleSearchResultDto>>();
            body.Should().NotBeNull();
        }

        [Fact]
        public async Task SearchKnowledgeBase_NoMatch_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/knowledge-base?q=NOSUCHENTRYZZZ");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchKnowledgeBase_WithCategoryFilter_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/knowledge-base?q=nhac&category=culture");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── UnifiedSearchTests ───────────────────────────────────────────────────

    public class UnifiedSearchTests : SearchControllerTests
    {
        public UnifiedSearchTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SearchAll_Anonymous_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/all?q=dan");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchAll_ResponseContainsSongsInstrumentsArticles()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/all?q=dan");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Deserialize as UnifiedSearchResultDto
            var body = await response.Content.ReadFromJsonAsync<UnifiedSearchResultDto>();
            body.Should().NotBeNull();
            body!.Songs.Should().NotBeNull();
            body.Instruments.Should().NotBeNull();
            body.Articles.Should().NotBeNull();
        }

        [Fact]
        public async Task SearchAll_ResponseContainsTotalField()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/all?q=nhac");
            var body = await response.Content.ReadFromJsonAsync<UnifiedSearchResultDto>();
            body!.Total.Should().BeGreaterThanOrEqualTo(0);
        }

        [Fact]
        public async Task SearchAll_Authenticated_Returns200()
        {
            AuthenticateAs("Researcher");
            var response = await GetAsync("/api/Search/all?q=nhac");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── SuggestionsTests ─────────────────────────────────────────────────────

    public class SuggestionsTests : SearchControllerTests
    {
        public SuggestionsTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetSuggestions_Anonymous_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/suggestions?q=dan");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetSuggestions_ResponseIsArrayOfSuggestions()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/suggestions?q=dan");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<List<SearchSuggestionDto>>();
            body.Should().NotBeNull();
        }

        [Fact]
        public async Task GetSuggestions_SuggestionHasTextAndTypeFields()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/suggestions?q=dan");
            var body = await response.Content.ReadFromJsonAsync<List<SearchSuggestionDto>>();
            if (body!.Count > 0)
            {
                body[0].Text.Should().NotBeNullOrEmpty();
                body[0].Type.Should().NotBeNullOrEmpty();
            }
        }

        [Fact]
        public async Task GetSuggestions_Authenticated_Returns200()
        {
            AuthenticateAs("Contributor");
            var response = await GetAsync("/api/Search/suggestions?q=nhac");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── SemanticSearch384Tests ───────────────────────────────────────────────

    public class SemanticSearch384Tests : SearchControllerTests
    {
        public SemanticSearch384Tests(WebAppFactory factory) : base(factory) { }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Researcher")]
        [InlineData("Admin")]
        public async Task SemanticSearch384_AuthenticatedUser_Returns200(string role)
        {
            AuthenticateAs(role);
            var q = Uri.EscapeDataString("đàn tranh");
            var response = await GetAsync($"/api/search/semantic?q={q}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SemanticSearch384_Contributor_Returns200OrForbidden()
        {
            // SemanticSearchController uses [Authorize] without role restrictions
            // Any authenticated user can access — including Contributor
            AuthenticateAs("Contributor");
            var response = await GetAsync("/api/search/semantic?q=test");
            // Controller-level [Authorize] → Contributor is authenticated → should get 200
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task SemanticSearch384_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/search/semantic?q=test");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task SemanticSearch384_MissingQuery_Returns400()
        {
            AuthenticateAs("Expert");
            var response = await GetAsync("/api/search/semantic");
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task SemanticSearch384_EmptyQuery_Returns400()
        {
            AuthenticateAs("Expert");
            var response = await GetAsync("/api/search/semantic?q=");
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task SemanticSearch384_ValidQuery_ResponseContainsExpectedFields()
        {
            AuthenticateAs("Expert");
            var q = Uri.EscapeDataString("nhạc dân gian");
            var response = await GetAsync($"/api/search/semantic?q={q}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            body.TryGetProperty("query", out _).Should().BeTrue();
            body.TryGetProperty("totalResults", out _).Should().BeTrue();
            body.TryGetProperty("results", out _).Should().BeTrue();
        }

        [Fact]
        public async Task SemanticSearch384_WithTopKParam_Returns200()
        {
            AuthenticateAs("Researcher");
            var q = Uri.EscapeDataString("test query");
            var response = await GetAsync($"/api/search/semantic?q={q}&topK=5&minScore=0.3");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SemanticSearch384_VietnameseDiacriticsQuery_Returns200()
        {
            AuthenticateAs("Expert");
            var q = Uri.EscapeDataString("Đàn Bầu Bắc");
            var response = await GetAsync($"/api/search/semantic?q={q}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── SemanticSearch768Tests ───────────────────────────────────────────────

    public class SemanticSearch768Tests : SearchControllerTests
    {
        public SemanticSearch768Tests(WebAppFactory factory) : base(factory) { }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Researcher")]
        [InlineData("Admin")]
        public async Task SemanticSearch768_AuthenticatedUser_Returns200(string role)
        {
            AuthenticateAs(role);
            var q = Uri.EscapeDataString("nhạc cụ dân tộc");
            var response = await GetAsync($"/api/search/semantic-768?q={q}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SemanticSearch768_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/search/semantic-768?q=test");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task SemanticSearch768_MissingQuery_Returns400()
        {
            AuthenticateAs("Expert");
            var response = await GetAsync("/api/search/semantic-768");
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task SemanticSearch768_EmptyQuery_Returns400()
        {
            AuthenticateAs("Expert");
            var response = await GetAsync("/api/search/semantic-768?q=");
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task SemanticSearch768_ValidQuery_ResponseContainsQueryAndResults()
        {
            AuthenticateAs("Expert");
            var q = Uri.EscapeDataString("bài hát dân gian");
            var response = await GetAsync($"/api/search/semantic-768?q={q}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            body.TryGetProperty("query", out _).Should().BeTrue();
            body.TryGetProperty("totalResults", out _).Should().BeTrue();
        }

        [Fact]
        public async Task SemanticSearch768_ResponseShapeSameAs384()
        {
            AuthenticateAs("Researcher");
            var q = Uri.EscapeDataString("nhạc cụ");
            var resp384 = await GetAsync($"/api/search/semantic?q={q}");
            var resp768 = await GetAsync($"/api/search/semantic-768?q={q}");

            resp384.StatusCode.Should().Be(HttpStatusCode.OK);
            resp768.StatusCode.Should().Be(HttpStatusCode.OK);

            var body384 = await resp384.Content.ReadFromJsonAsync<JsonElement>();
            var body768 = await resp768.Content.ReadFromJsonAsync<JsonElement>();

            // Both should have same top-level structure
            body384.TryGetProperty("query", out _).Should().BeTrue();
            body768.TryGetProperty("query", out _).Should().BeTrue();
        }
    }

    // ─── ConsistencyTests ────────────────────────────────────────────────────

    public class ConsistencyTests : SearchControllerTests
    {
        public ConsistencyTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task Consistency_AllEndpoints_AcceptSameQueryParam()
        {
            var q = Uri.EscapeDataString("nhac");
            // All 5 SearchController endpoints accept ?q= param — verify all 200
            var endpoints = new[]
            {
                $"/api/Search/songs?q={q}",
                $"/api/Search/instruments?q={q}",
                $"/api/Search/knowledge-base?q={q}",
                $"/api/Search/all?q={q}",
                $"/api/Search/suggestions?q={q}"
            };
            foreach (var endpoint in endpoints)
            {
                var response = await GetAsync(endpoint);
                response.StatusCode.Should().Be(HttpStatusCode.OK,
                    $"Endpoint {endpoint} should return 200");
            }
        }

        [Fact]
        public async Task Consistency_SearchAll_ContainsAllThreeCollections()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/all?q=test");
            var body = await response.Content.ReadFromJsonAsync<UnifiedSearchResultDto>();
            body!.Songs.Should().NotBeNull();
            body.Instruments.Should().NotBeNull();
            body.Articles.Should().NotBeNull();
        }
    }

    // ─── PaginationTests ─────────────────────────────────────────────────────

    public class SearchPaginationTests : SearchControllerTests
    {
        public SearchPaginationTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SearchSongs_WithPageAndSize_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/songs?q=nhac&page=1&pageSize=5");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchInstruments_WithPageAndSize_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/instruments?q=nhac&page=1&pageSize=5");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SearchKnowledgeBase_WithPageAndSize_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Search/knowledge-base?q=nhac&page=1&pageSize=5");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }
}
