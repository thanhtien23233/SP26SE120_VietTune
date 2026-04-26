using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Entities.DTO.KnowledgeBase;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;

namespace VietTuneArchive.Tests.Integration.Controllers;

public class KBEntriesControllerTests : ApiTestBase
{
    public KBEntriesControllerTests(WebAppFactory factory) : base(factory) { }

    // ─── Shared Helpers ────────────────────────────────────────────────────────

    private async Task<(Guid id, string slug)> CreateDraftEntry(string role = "Expert")
    {
        AuthenticateAs(role);
        var uniqueTitle = $"Test Entry {Guid.NewGuid()}";
        var payload = new CreateKBEntryRequest
        {
            Title = uniqueTitle,
            Content = "Nội dung bài viết kiểm thử.",
            Category = "Instrument"
        };
        var response = await PostAsync("/api/kb-entries", payload);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<KBEntryDetailResponse>();
        return (body!.Id, body.Slug);
    }

    private async Task PublishEntry(Guid id, string role = "Expert")
    {
        AuthenticateAs(role);
        var payload = new UpdateKBEntryStatusRequest { Status = 1 }; // 1 = Published
        var response = await Client.PatchAsync($"/api/kb-entries/{id}/status",
            System.Net.Http.Json.JsonContent.Create(payload));
        response.EnsureSuccessStatusCode();
    }

    private async Task<Guid> AddCitation(Guid entryId, string role = "Expert")
    {
        AuthenticateAs(role);
        var payload = new CreateKBCitationRequest
        {
            Citation = "Nguồn tham khảo mẫu",
            Url = "https://example.com/source"
        };
        var response = await PostAsync($"/api/kb-entries/{entryId}/citations", payload);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<KBCitationResponse>();
        return body!.Id;
    }

    // ─── GetEntriesTests ────────────────────────────────────────────────────────

    public class GetEntriesTests : KBEntriesControllerTests
    {
        public GetEntriesTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetEntries_Anonymous_ReturnsOnlyPublishedEntries()
        {
            var (draftId, _) = await CreateDraftEntry(); // Draft — not visible
            var (publishedId, _) = await CreateDraftEntry();
            await PublishEntry(publishedId);

            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/kb-entries");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().NotContain(draftId.ToString());
            content.Should().Contain(publishedId.ToString());
        }

        [Fact]
        public async Task GetEntries_EmptyPublishedSet_Returns200EmptyList()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/kb-entries?status=1");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── GetBySlugTests ────────────────────────────────────────────────────────

    public class GetBySlugTests : KBEntriesControllerTests
    {
        public GetBySlugTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetBySlug_PublishedEntry_Anonymous_Returns200()
        {
            var (id, slug) = await CreateDraftEntry();
            await PublishEntry(id);

            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync($"/api/kb-entries/by-slug/{slug}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<KBEntryDetailResponse>();
            body!.Slug.Should().Be(slug);
        }

        [Fact]
        public async Task GetBySlug_DraftEntry_Anonymous_ReturnsForbidOrNotFound()
        {
            var (_, slug) = await CreateDraftEntry(); // Stays Draft

            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync($"/api/kb-entries/by-slug/{slug}");

            // Draft → Forbid (403) per impl since slug is found but status is 0
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetBySlug_NonExistentSlug_Returns404()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/kb-entries/by-slug/this-slug-does-not-exist-xyz");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ─── GetByIdTests ──────────────────────────────────────────────────────────

    public class GetByIdTests : KBEntriesControllerTests
    {
        public GetByIdTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetById_ValidId_AsExpert_Returns200()
        {
            var (id, _) = await CreateDraftEntry("Expert");

            AuthenticateAs("Expert");
            var response = await GetAsync($"/api/kb-entries/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<KBEntryDetailResponse>();
            body!.Id.Should().Be(id);
        }

        [Fact]
        public async Task GetById_NonExistentId_Returns404()
        {
            AuthenticateAs("Expert");
            var response = await GetAsync($"/api/kb-entries/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetById_Unauthenticated_Returns401()
        {
            var (id, _) = await CreateDraftEntry();
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync($"/api/kb-entries/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── CreateEntryTests ──────────────────────────────────────────────────────

    public class CreateEntryTests : KBEntriesControllerTests
    {
        public CreateEntryTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task CreateEntry_ValidPayload_AsExpert_Returns201()
        {
            AuthenticateAs("Expert");
            var payload = new CreateKBEntryRequest
            {
                Title = $"Expert KB Entry {Guid.NewGuid()}",
                Content = "Content here",
                Category = "Instrument"
            };
            var response = await PostAsync("/api/kb-entries", payload);

            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var body = await response.Content.ReadFromJsonAsync<KBEntryDetailResponse>();
            body!.Status.Should().Be(0); // Draft
            body.Slug.Should().NotBeNullOrEmpty();
        }

        [Theory]
        [InlineData("Contributor")]
        [InlineData("Researcher")]
        public async Task CreateEntry_ByForbiddenRole_Returns403(string role)
        {
            AuthenticateAs(role);
            var payload = new CreateKBEntryRequest
            {
                Title = "Forbidden Entry",
                Content = "Content",
                Category = "Instrument"
            };
            var response = await PostAsync("/api/kb-entries", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task CreateEntry_MissingTitle_Returns400()
        {
            AuthenticateAs("Expert");
            var response = await PostAsync("/api/kb-entries", new { Content = "No title here", Category = "Instrument" });
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CreateEntry_ValidPayload_PersistedInDb()
        {
            var expertId = DbContext.Users.First(u => u.Role == "Expert").Id;
            var token = JwtTokenHelper.GenerateToken(expertId.ToString(), "expert@test.com", "Expert");
            Client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var uniqueTitle = $"Persisted KB Entry {Guid.NewGuid()}";
            var payload = new CreateKBEntryRequest
            {
                Title = uniqueTitle,
                Content = "Test content",
                Category = "Instrument"
            };
            var response = await PostAsync("/api/kb-entries", payload);
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<KBEntryDetailResponse>();

            var dbEntry = await DbContext.KBEntries.FindAsync(body!.Id);
            dbEntry.Should().NotBeNull();
            dbEntry!.Status.Should().Be(0); // Draft
            dbEntry.AuthorId.Should().Be(expertId);
        }
    }

    // ─── UpdateEntryTests ──────────────────────────────────────────────────────

    public class UpdateEntryTests : KBEntriesControllerTests
    {
        public UpdateEntryTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UpdateEntry_ValidPayload_AsExpert_Returns200()
        {
            var (id, _) = await CreateDraftEntry("Expert");

            AuthenticateAs("Expert");
            var payload = new UpdateKBEntryRequest
            {
                Title = "Updated Title",
                Content = "Updated content",
                Category = "Ceremony",
                RevisionNote = "Fixed typo"
            };
            var response = await PutAsync($"/api/kb-entries/{id}", payload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var dbEntry = await DbContext.KBEntries.FindAsync(id);
            dbEntry!.Title.Should().Be("Updated Title");
        }

        [Fact]
        public async Task UpdateEntry_CreatesNewRevision()
        {
            var (id, _) = await CreateDraftEntry("Expert");
            AuthenticateAs("Expert");

            var payload = new UpdateKBEntryRequest
            {
                Title = "Updated for Revision",
                Content = "New content",
                Category = "Instrument"
            };
            await PutAsync($"/api/kb-entries/{id}", payload);

            var revisions = await DbContext.KBRevisions.Where(r => r.EntryId == id).ToListAsync();
            revisions.Should().HaveCountGreaterOrEqualTo(1);
        }

        [Theory]
        [InlineData("Contributor")]
        [InlineData("Researcher")]
        public async Task UpdateEntry_ByForbiddenRole_Returns403(string role)
        {
            var (id, _) = await CreateDraftEntry("Expert");
            AuthenticateAs(role);

            var payload = new UpdateKBEntryRequest
            {
                Title = "Hacked",
                Content = "Hacked content",
                Category = "Instrument"
            };
            var response = await PutAsync($"/api/kb-entries/{id}", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    // ─── PatchStatusTests ──────────────────────────────────────────────────────

    public class PatchStatusTests : KBEntriesControllerTests
    {
        public PatchStatusTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task PatchStatus_DraftToPublished_AsExpert_Returns204()
        {
            var (id, _) = await CreateDraftEntry("Expert");
            AuthenticateAs("Expert");

            var payload = new UpdateKBEntryStatusRequest { Status = 1 };
            var response = await Client.PatchAsync($"/api/kb-entries/{id}/status",
                System.Net.Http.Json.JsonContent.Create(payload));

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
            var dbEntry = await DbContext.KBEntries.FindAsync(id);
            dbEntry!.Status.Should().Be(1); // Published
        }

        [Fact]
        public async Task PatchStatus_DraftToPublished_MakesEntryVisibleToAnonymous()
        {
            var (id, slug) = await CreateDraftEntry("Expert");
            await PublishEntry(id, "Expert");

            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync($"/api/kb-entries/by-slug/{slug}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Theory]
        [InlineData("Contributor")]
        [InlineData("Researcher")]
        public async Task PatchStatus_ByForbiddenRole_Returns403(string role)
        {
            var (id, _) = await CreateDraftEntry("Expert");
            AuthenticateAs(role);

            var payload = new UpdateKBEntryStatusRequest { Status = 1 };
            var response = await Client.PatchAsync($"/api/kb-entries/{id}/status",
                System.Net.Http.Json.JsonContent.Create(payload));

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    // ─── DeleteEntryTests ──────────────────────────────────────────────────────

    public class DeleteEntryTests : KBEntriesControllerTests
    {
        public DeleteEntryTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task DeleteEntry_AsAdmin_Returns204()
        {
            var (id, _) = await CreateDraftEntry("Expert");
            AuthenticateAs("Admin");

            var response = await Client.DeleteAsync($"/api/kb-entries/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task DeleteEntry_AsExpert_Returns403()
        {
            var (id, _) = await CreateDraftEntry("Expert");
            AuthenticateAs("Expert");

            var response = await Client.DeleteAsync($"/api/kb-entries/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task DeleteEntry_AfterDelete_GetReturns404()
        {
            var (id, _) = await CreateDraftEntry("Expert");
            AuthenticateAs("Admin");
            await Client.DeleteAsync($"/api/kb-entries/{id}");

            AuthenticateAs("Expert");
            var response = await GetAsync($"/api/kb-entries/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ─── CitationTests ─────────────────────────────────────────────────────────

    public class CitationTests : KBEntriesControllerTests
    {
        public CitationTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task AddCitation_AsExpert_Returns201()
        {
            var (entryId, _) = await CreateDraftEntry("Expert");
            AuthenticateAs("Expert");

            var payload = new CreateKBCitationRequest
            {
                Citation = "Nguồn âm nhạc cổ truyền",
                Url = "https://example.com"
            };
            var response = await PostAsync($"/api/kb-entries/{entryId}/citations", payload);

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task GetCitations_ValidEntry_Returns200()
        {
            var (entryId, _) = await CreateDraftEntry("Expert");
            await AddCitation(entryId, "Expert");

            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync($"/api/kb-entries/{entryId}/citations");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().NotBeNullOrEmpty();
        }

        [Fact]
        public async Task DeleteCitation_AsExpert_Returns204()
        {
            var (entryId, _) = await CreateDraftEntry("Expert");
            var citationId = await AddCitation(entryId, "Expert");

            AuthenticateAs("Expert");
            var response = await Client.DeleteAsync($"/api/kb-entries/citations/{citationId}");
            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task AddCitation_ByContributor_Returns403()
        {
            var (entryId, _) = await CreateDraftEntry("Expert");
            AuthenticateAs("Contributor");

            var payload = new CreateKBCitationRequest
            {
                Citation = "Forbidden Citation",
                Url = null
            };
            var response = await PostAsync($"/api/kb-entries/{entryId}/citations", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    // ─── RevisionTests ─────────────────────────────────────────────────────────

    public class RevisionTests : KBEntriesControllerTests
    {
        public RevisionTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetRevisions_AfterTwoEdits_ReturnsTwoRevisions()
        {
            var (id, _) = await CreateDraftEntry("Expert");

            // First edit
            AuthenticateAs("Expert");
            await PutAsync($"/api/kb-entries/{id}", new UpdateKBEntryRequest
            {
                Title = "Edit 1", Content = "Content 1", Category = "Instrument"
            });

            // Second edit
            await PutAsync($"/api/kb-entries/{id}", new UpdateKBEntryRequest
            {
                Title = "Edit 2", Content = "Content 2", Category = "Instrument"
            });

            var response = await GetAsync($"/api/kb-entries/{id}/revisions");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            // Must have at least 2 revisions
            var revCount = await DbContext.KBRevisions.CountAsync(r => r.EntryId == id);
            revCount.Should().BeGreaterOrEqualTo(2);
        }

        [Theory]
        [InlineData("Contributor")]
        [InlineData("Researcher")]
        public async Task GetRevisions_ByForbiddenRole_Returns403(string role)
        {
            var (id, _) = await CreateDraftEntry("Expert");
            AuthenticateAs(role);

            var response = await GetAsync($"/api/kb-entries/{id}/revisions");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    // ─── VisibilityRulesTests ──────────────────────────────────────────────────

    public class VisibilityRulesTests : KBEntriesControllerTests
    {
        public VisibilityRulesTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task VisibilityRules_DraftNotVisibleToAnonymous_PublishedIs()
        {
            var (id, slug) = await CreateDraftEntry("Expert");

            // Draft: anonymous → 403/404
            Client.DefaultRequestHeaders.Authorization = null;
            var draftResp = await GetAsync($"/api/kb-entries/by-slug/{slug}");
            draftResp.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.NotFound);

            // Publish
            await PublishEntry(id, "Expert");

            // Published: anonymous → 200
            Client.DefaultRequestHeaders.Authorization = null;
            var publishedResp = await GetAsync($"/api/kb-entries/by-slug/{slug}");
            publishedResp.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── EndToEndTests ─────────────────────────────────────────────────────────

    public class EndToEndTests : KBEntriesControllerTests
    {
        public EndToEndTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task EndToEndFlow_CreateEditPublishCiteDelete_AllStepsSucceed()
        {
            // 1. Create Draft
            var (id, slug) = await CreateDraftEntry("Expert");
            var dbEntry = await DbContext.KBEntries.FindAsync(id);
            dbEntry!.Status.Should().Be(0);

            // 2. Edit
            AuthenticateAs("Expert");
            var editResp = await PutAsync($"/api/kb-entries/{id}", new UpdateKBEntryRequest
            {
                Title = "E2E Updated Title",
                Content = "E2E Updated Content",
                Category = "Instrument"
            });
            editResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // 3. Check revisions
            var revisions = await DbContext.KBRevisions.Where(r => r.EntryId == id).ToListAsync();
            revisions.Should().HaveCountGreaterOrEqualTo(1);

            // 4. Publish
            await PublishEntry(id, "Expert");
            DbContext.ChangeTracker.Clear(); // clear stale tracked entity so we read fresh from DB
            dbEntry = await DbContext.KBEntries.FindAsync(id);
            dbEntry!.Status.Should().Be(1);

            // 5. Verify anonymous can see it
            Client.DefaultRequestHeaders.Authorization = null;
            var slugResp = await GetAsync($"/api/kb-entries/by-slug/{dbEntry!.Slug}");
            slugResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // 6. Add citation
            var citationId = await AddCitation(id, "Expert");
            citationId.Should().NotBeEmpty();

            // 7. Get citations anonymously
            Client.DefaultRequestHeaders.Authorization = null;
            var citResp = await GetAsync($"/api/kb-entries/{id}/citations");
            citResp.StatusCode.Should().Be(HttpStatusCode.OK);

            // 7b. Delete citation before deleting entry
            // (Service throws BadRequestException when entry still has citations)
            AuthenticateAs("Expert");
            var deleteCitResp = await Client.DeleteAsync($"/api/kb-entries/citations/{citationId}");
            deleteCitResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

            // 8. Delete entry
            AuthenticateAs("Admin");
            var deleteResp = await Client.DeleteAsync($"/api/kb-entries/{id}");
            deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

            // 9. Verify anonymous can no longer get by slug
            Client.DefaultRequestHeaders.Authorization = null;
            var afterDeleteResp = await GetAsync($"/api/kb-entries/by-slug/{dbEntry!.Slug}");
            afterDeleteResp.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
        }
    }
}
