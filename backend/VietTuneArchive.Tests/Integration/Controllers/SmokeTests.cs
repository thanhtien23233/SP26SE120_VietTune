using System.Net;
using FluentAssertions;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;

namespace VietTuneArchive.Tests.Integration.Controllers;

/// <summary>
/// Minimal smoke tests — verify WebAppFactory, DB seed, and JWT wiring work
/// before running full test suites.
/// </summary>
public class SmokeTests : ApiTestBase
{
    public SmokeTests(WebAppFactory factory) : base(factory) { }

    [Fact]
    public async Task Smoke_UnauthenticatedRequest_ToProtectedEndpoint_Returns401()
    {
        ClearAuth();
        var response = await GetAsync("/api/User/GetAll");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Smoke_AdminToken_ToAdminEndpoint_Returns200()
    {
        AuthenticateAs("Admin");
        var response = await GetAsync("/api/User/GetAll");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Smoke_ContributorToken_ToAdminEndpoint_Returns403()
    {
        AuthenticateAs("Contributor");
        var response = await GetAsync("/api/User/GetAll");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Smoke_DbContext_SeededUsers_ExistInDatabase()
    {
        var contrib = await DbContext.Users.FindAsync(DatabaseFixture.ContributorId);
        var expert  = await DbContext.Users.FindAsync(DatabaseFixture.ExpertId);
        var admin   = await DbContext.Users.FindAsync(DatabaseFixture.AdminId);

        contrib.Should().NotBeNull();
        expert.Should().NotBeNull();
        admin.Should().NotBeNull();

        contrib!.Role.Should().Be("Contributor");
        expert!.Role.Should().Be("Expert");
        admin!.Role.Should().Be("Admin");
    }

    [Fact]
    public async Task Smoke_DbContext_SeededReferenceData_ExistInDatabase()
    {
        var ethnicGroup = await DbContext.EthnicGroups.FindAsync(DatabaseFixture.EthnicGroupId);
        var instrument  = await DbContext.Instruments.FindAsync(DatabaseFixture.InstrumentId);
        var ceremony    = await DbContext.Ceremonies.FindAsync(DatabaseFixture.CeremonyId);
        var province    = await DbContext.Provinces.FindAsync(DatabaseFixture.ProvinceId);

        ethnicGroup.Should().NotBeNull();
        instrument.Should().NotBeNull();
        ceremony.Should().NotBeNull();
        province.Should().NotBeNull();
    }

    [Fact]
    public async Task Smoke_PublicAuthEndpoint_IsReachable()
    {
        ClearAuth();
        // POST login với body rỗng nên trả 400 (validation), không phải 404/500
        var response = await PostAsync("/api/Auth/login", new { });
        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.InternalServerError);
    }
}
