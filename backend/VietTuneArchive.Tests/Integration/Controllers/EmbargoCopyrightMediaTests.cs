using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Mapper.DTOs.Request;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;
using System.Net.Http.Headers;
using System.Text;

namespace VietTuneArchive.Tests.Integration.Controllers;

public class EmbargoCopyrightMediaTests : ApiTestBase
{
    public EmbargoCopyrightMediaTests(WebAppFactory factory) : base(factory) { }

    // ─── EmbargoController Tests ──────────────────────────────────────────────

    public class EmbargoControllerTests : EmbargoCopyrightMediaTests
    {
        public EmbargoControllerTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetByRecording_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync($"/api/Embargo/recording/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Theory]
        [InlineData("Contributor")]
        [InlineData("Researcher")]
        public async Task GetByRecording_UnauthorizedRoles_Returns403(string role)
        {
            AuthenticateAs(role);
            var response = await GetAsync($"/api/Embargo/recording/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Theory]
        [InlineData("Expert")]
        [InlineData("Admin")]
        public async Task GetByRecording_AuthorizedRoles_ReturnsOkOrNotFound(string role)
        {
            AuthenticateAs(role);
            var response = await GetAsync($"/api/Embargo/recording/{Guid.NewGuid()}");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task CreateUpdate_Admin_ReturnsOkOrBadRequest()
        {
            AuthenticateAs("Admin");
            var dto = new EmbargoCreateUpdateDto
            {
                Reason = "Test Embargo",
                EmbargoStartDate = DateTime.UtcNow,
                EmbargoEndDate = DateTime.UtcNow.AddDays(30)
            };
            var response = await PutAsync($"/api/Embargo/recording/{Guid.NewGuid()}", dto);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task LiftEmbargo_Expert_ReturnsOkOrBadRequest()
        {
            AuthenticateAs("Expert");
            var dto = new EmbargoLiftDto { Reason = "Lifting for testing" };
            var response = await PostAsync($"/api/Embargo/recording/{Guid.NewGuid()}/lift", dto);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GetList_Admin_ReturnsOk()
        {
            AuthenticateAs("Admin");
            var response = await GetAsync("/api/Embargo");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── CopyrightDisputeController Tests ────────────────────────────────────

    public class CopyrightDisputeControllerTests : EmbargoCopyrightMediaTests
    {
        public CopyrightDisputeControllerTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task CreateDispute_Anonymous_ReturnsOkOrBadRequest()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var req = new CreateCopyrightDisputeRequest
            {
                RecordingId = Guid.NewGuid(),
                ReportedByUserId = Guid.NewGuid(),
                ReasonCode = "plagiarism",
                Description = "Test Dispute"
            };
            var response = await PostAsync("/api/CopyrightDispute", req);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task ListDisputes_Anonymous_ReturnsOk()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/CopyrightDispute");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetDetail_Anonymous_ReturnsOkOrNotFound()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync($"/api/CopyrightDispute/{Guid.NewGuid()}");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task AssignReviewer_Anonymous_ReturnsOkOrBadRequest()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var req = new AssignReviewerRequest { ReviewerId = Guid.NewGuid() };
            var response = await PostAsync($"/api/CopyrightDispute/{Guid.NewGuid()}/assign", req);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task ResolveDispute_Anonymous_ReturnsOkOrBadRequest()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var req = new ResolveDisputeRequest { Resolution = "resolved_keep", ResolutionNotes = "Test" };
            var response = await PostAsync($"/api/CopyrightDispute/{Guid.NewGuid()}/resolve", req);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task AddEvidence_Anonymous_ReturnsOkOrBadRequest()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var content = new MultipartFormDataContent();
            var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("dummy content"));
            fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("text/plain");
            content.Add(fileContent, "file", "evidence.txt");

            var response = await Client.PostAsync($"/api/CopyrightDispute/{Guid.NewGuid()}/evidence", content);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }
    }

}
