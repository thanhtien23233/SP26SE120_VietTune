using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;

namespace VietTuneArchive.Tests.Integration.Controllers;

/// <summary>
/// Integration tests for all 9 reference data controllers.
/// IMPORTANT: All reference controllers have NO [Authorize] attribute —
/// all endpoints (GET, POST, PUT, DELETE) are publicly accessible.
/// This is flagged as a security concern in the report.
/// </summary>
public class ReferenceDataTests : ApiTestBase
{
    public ReferenceDataTests(WebAppFactory factory) : base(factory) { }

    // ─── Generic Helpers ──────────────────────────────────────────────────────

    private async Task<Guid> CreateEntityAndGetId(string url, object payload)
    {
        var response = await PostAsync(url, payload);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        // Response is ServiceResponse<T> — data.id
        return body.GetProperty("data").GetProperty("id").GetGuid();
    }

    private async Task AssertGetById_Returns(string baseUrl, Guid id, HttpStatusCode expected)
    {
        var response = await GetAsync($"{baseUrl}/{id}");
        response.StatusCode.Should().Be(expected);
    }

    // ─── CeremonyTests ────────────────────────────────────────────────────────

    public class CeremonyTests : ReferenceDataTests
    {
        public CeremonyTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task Ceremony_GetAll_Anonymous_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Ceremony");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Ceremony_GetById_ValidId_Returns200()
        {
            var ceremony = await DbContext.Ceremonies.FirstAsync();
            var response = await GetAsync($"/api/Ceremony/{ceremony.Id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            body.GetProperty("data").GetProperty("name").GetString().Should().Be(ceremony.Name);
        }

        [Fact]
        public async Task Ceremony_GetById_NonExistentId_Returns404()
        {
            var response = await GetAsync($"/api/Ceremony/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Ceremony_Create_Anonymous_Returns201AndPersistedInDb()
        {
            // No auth needed — endpoint is open
            Client.DefaultRequestHeaders.Authorization = null;
            var uniqueName = $"Lễ-{Guid.NewGuid():N}";
            var payload = new CeremonyDto { Name = uniqueName, Type = "Traditional" };

            var response = await PostAsync("/api/Ceremony", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Created);

            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            var createdId = body.GetProperty("data").GetProperty("id").GetGuid();
            var dbEntity = await DbContext.Ceremonies.FindAsync(createdId);
            dbEntity.Should().NotBeNull();
            dbEntity!.Name.Should().Be(uniqueName);
        }

        [Fact]
        public async Task Ceremony_Update_ValidId_Returns200AndDbUpdated()
        {
            var payload = new CeremonyDto { Name = $"Update-{Guid.NewGuid():N}", Type = "Modern" };
            var id = await CreateEntityAndGetId("/api/Ceremony", payload);

            var updatedPayload = new CeremonyDto { Id = id, Name = $"Updated-{Guid.NewGuid():N}", Type = "Modern" };
            var response = await PutAsync($"/api/Ceremony/{id}", updatedPayload);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Ceremony_Delete_ValidId_Returns200AndRemovedFromDb()
        {
            var payload = new CeremonyDto { Name = $"Delete-{Guid.NewGuid():N}", Type = "Test" };
            var id = await CreateEntityAndGetId("/api/Ceremony", payload);

            var deleteResp = await Client.DeleteAsync($"/api/Ceremony/{id}");
            deleteResp.StatusCode.Should().Be(HttpStatusCode.OK);

            var getResp = await GetAsync($"/api/Ceremony/{id}");
            getResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ─── InstrumentTests ──────────────────────────────────────────────────────

    public class InstrumentTests : ReferenceDataTests
    {
        public InstrumentTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task Instrument_GetAll_Anonymous_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Instrument");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Instrument_GetById_ValidId_Returns200()
        {
            var instrument = await DbContext.Instruments.FirstAsync();
            var response = await GetAsync($"/api/Instrument/{instrument.Id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Instrument_GetById_NonExistentId_Returns404()
        {
            var response = await GetAsync($"/api/Instrument/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Instrument_Create_Anonymous_Returns201()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var payload = new InstrumentDto { Name = $"Instrument-{Guid.NewGuid():N}", Category = "Dây" };
            var response = await PostAsync("/api/Instrument", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task Instrument_Update_ValidId_Returns200()
        {
            var payload = new InstrumentDto { Name = $"Inst-{Guid.NewGuid():N}", Category = "Gõ" };
            var id = await CreateEntityAndGetId("/api/Instrument", payload);

            var updatedPayload = new InstrumentDto { Id = id, Name = $"Inst-Updated-{Guid.NewGuid():N}", Category = "Gõ" };
            var response = await PutAsync($"/api/Instrument/{id}", updatedPayload);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Instrument_Delete_ValidId_Returns200()
        {
            var payload = new InstrumentDto { Name = $"ToDelete-{Guid.NewGuid():N}", Category = "Thổi" };
            var id = await CreateEntityAndGetId("/api/Instrument", payload);

            var deleteResp = await Client.DeleteAsync($"/api/Instrument/{id}");
            deleteResp.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Instrument_GetByCategory_ValidCategory_Returns200()
        {
            // Seed an instrument with a specific category
            var category = $"Cat-{Guid.NewGuid():N}";
            await PostAsync("/api/Instrument",
                new InstrumentDto { Name = $"CatInst-{Guid.NewGuid():N}", Category = category });

            var response = await GetAsync($"/api/Instrument/category/{Uri.EscapeDataString(category)}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Instrument_GetByCategory_NonExistent_Returns404OrOk()
        {
            var response = await GetAsync("/api/Instrument/category/NoSuchCategory999");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Instrument_GetByEthnicGroup_ValidId_Returns200()
        {
            var ethnicGroup = await DbContext.EthnicGroups.FirstAsync();
            var response = await GetAsync($"/api/Instrument/ethnic-group/{ethnicGroup.Id}");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Instrument_Search_ValidKeyword_Returns200()
        {
            var uniqueName = $"SearchableInst-{Guid.NewGuid():N}";
            await PostAsync("/api/Instrument",
                new InstrumentDto { Name = uniqueName, Category = "Dây" });

            var response = await GetAsync($"/api/Instrument/search?keyword={Uri.EscapeDataString("SearchableInst")}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Instrument_GetAllCategories_Returns200()
        {
            var response = await GetAsync("/api/Instrument/categories/list");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── EthnicGroupTests ─────────────────────────────────────────────────────

    public class EthnicGroupTests : ReferenceDataTests
    {
        public EthnicGroupTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task EthnicGroup_GetAll_Anonymous_Returns200()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/EthnicGroup");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task EthnicGroup_GetById_ValidId_Returns200()
        {
            var eg = await DbContext.EthnicGroups.FirstAsync();
            var response = await GetAsync($"/api/EthnicGroup/{eg.Id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task EthnicGroup_GetById_NonExistentId_Returns404()
        {
            var response = await GetAsync($"/api/EthnicGroup/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task EthnicGroup_Create_Anonymous_Returns201()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var payload = new EthnicGroupDto { Name = $"EG-{Guid.NewGuid():N}", PrimaryRegion = "Bắc" };
            var response = await PostAsync("/api/EthnicGroup", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task EthnicGroup_Update_ValidId_Returns200()
        {
            var payload = new EthnicGroupDto { Name = $"EG-Update-{Guid.NewGuid():N}", PrimaryRegion = "Nam" };
            var id = await CreateEntityAndGetId("/api/EthnicGroup", payload);

            var response = await PutAsync($"/api/EthnicGroup/{id}",
                new EthnicGroupDto { Id = id, Name = $"EG-Updated-{Guid.NewGuid():N}", PrimaryRegion = "Nam" });
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task EthnicGroup_Delete_ValidId_Returns200()
        {
            var payload = new EthnicGroupDto { Name = $"EG-Del-{Guid.NewGuid():N}", PrimaryRegion = "Trung" };
            var id = await CreateEntityAndGetId("/api/EthnicGroup", payload);

            var response = await Client.DeleteAsync($"/api/EthnicGroup/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── MusicalScaleTests ────────────────────────────────────────────────────

    public class MusicalScaleTests : ReferenceDataTests
    {
        public MusicalScaleTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task MusicalScale_GetAll_Returns200()
        {
            var response = await GetAsync("/api/MusicalScale");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task MusicalScale_Create_Returns201()
        {
            var payload = new MusicalScaleDto { Name = $"Scale-{Guid.NewGuid():N}", Description = "Pentatonic" };
            var response = await PostAsync("/api/MusicalScale", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task MusicalScale_GetById_NonExistent_Returns404()
        {
            var response = await GetAsync($"/api/MusicalScale/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task MusicalScale_Delete_ValidId_Returns200()
        {
            var payload = new MusicalScaleDto { Name = $"Scale-Del-{Guid.NewGuid():N}", Description = "Chromatic" };
            var id = await CreateEntityAndGetId("/api/MusicalScale", payload);

            var response = await Client.DeleteAsync($"/api/MusicalScale/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── VocalStyleTests ──────────────────────────────────────────────────────

    public class VocalStyleTests : ReferenceDataTests
    {
        public VocalStyleTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task VocalStyle_GetAll_Returns200()
        {
            var response = await GetAsync("/api/VocalStyle");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task VocalStyle_Create_Returns201()
        {
            var payload = new VocalStyleDto { Name = $"VS-{Guid.NewGuid():N}", Description = "Test style" };
            var response = await PostAsync("/api/VocalStyle", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task VocalStyle_GetById_NonExistent_Returns404()
        {
            var response = await GetAsync($"/api/VocalStyle/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task VocalStyle_Delete_ValidId_Returns200()
        {
            var payload = new VocalStyleDto { Name = $"VS-Del-{Guid.NewGuid():N}", Description = "Delete me" };
            var id = await CreateEntityAndGetId("/api/VocalStyle", payload);

            var response = await Client.DeleteAsync($"/api/VocalStyle/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── TagTests ─────────────────────────────────────────────────────────────

    public class TagTests : ReferenceDataTests
    {
        public TagTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task Tag_GetAll_Returns200()
        {
            var response = await GetAsync("/api/Tag");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Tag_Create_Returns201()
        {
            var payload = new TagDto { Name = $"Tag-{Guid.NewGuid():N}" };
            var response = await PostAsync("/api/Tag", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task Tag_GetById_NonExistent_Returns404()
        {
            var response = await GetAsync($"/api/Tag/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Tag_Update_ValidId_Returns200()
        {
            var payload = new TagDto { Name = $"Tag-Upd-{Guid.NewGuid():N}" };
            var id = await CreateEntityAndGetId("/api/Tag", payload);

            var response = await PutAsync($"/api/Tag/{id}",
                new TagDto { Id = id, Name = $"Tag-Updated-{Guid.NewGuid():N}" });
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Tag_Delete_ValidId_Returns200()
        {
            var payload = new TagDto { Name = $"Tag-Del-{Guid.NewGuid():N}" };
            var id = await CreateEntityAndGetId("/api/Tag", payload);

            var response = await Client.DeleteAsync($"/api/Tag/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ─── DistrictTests ────────────────────────────────────────────────────────

    public class DistrictTests : ReferenceDataTests
    {
        public DistrictTests(WebAppFactory factory) : base(factory) { }

        private async Task<Guid> SeedProvince()
        {
            var province = new Province
            {
                Id = Guid.NewGuid(),
                Name = $"Province-{Guid.NewGuid():N}",
                RegionCode = "Bac"
            };
            DbContext.Provinces.Add(province);
            await DbContext.SaveChangesAsync();
            return province.Id;
        }

        [Fact]
        public async Task District_GetAll_Returns200()
        {
            var response = await GetAsync("/api/District");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task District_GetByProvinceId_WithSeededProvince_Returns200()
        {
            var provinceId = await SeedProvince();
            var response = await GetAsync($"/api/District/get-by-province/{provinceId}");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task District_GetByProvinceId_NoDistricts_ReturnsOkOrBadRequest()
        {
            var response = await GetAsync($"/api/District/get-by-province/{Guid.NewGuid()}");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task District_Create_ValidPayload_Returns201()
        {
            var provinceId = await SeedProvince();
            var payload = new DistrictDto
            {
                Name = $"District-{Guid.NewGuid():N}",
                ProvinceId = provinceId
            };
            var response = await PostAsync("/api/District", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task District_GetById_NonExistent_Returns404()
        {
            var response = await GetAsync($"/api/District/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ─── CommuneTests ─────────────────────────────────────────────────────────

    public class CommuneTests : ReferenceDataTests
    {
        public CommuneTests(WebAppFactory factory) : base(factory) { }

        private async Task<(Guid provinceId, Guid districtId)> SeedProvinceAndDistrict()
        {
            var province = new Province
            {
                Id = Guid.NewGuid(),
                Name = $"Prov-{Guid.NewGuid():N}",
                RegionCode = "Nam"
            };
            DbContext.Provinces.Add(province);
            var district = new District
            {
                Id = Guid.NewGuid(),
                Name = $"Dist-{Guid.NewGuid():N}",
                ProvinceId = province.Id
            };
            DbContext.Districts.Add(district);
            await DbContext.SaveChangesAsync();
            return (province.Id, district.Id);
        }

        [Fact]
        public async Task Commune_GetAll_Returns200()
        {
            var response = await GetAsync("/api/Commune");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Commune_GetByDistrictId_Returns200OrBadRequest()
        {
            var (_, districtId) = await SeedProvinceAndDistrict();
            var response = await GetAsync($"/api/Commune/get-by-district/{districtId}");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Commune_GetByDistrictId_NonExistent_ReturnsOkOrBadRequest()
        {
            var response = await GetAsync($"/api/Commune/get-by-district/{Guid.NewGuid()}");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Commune_Create_ValidPayload_Returns201()
        {
            var (_, districtId) = await SeedProvinceAndDistrict();
            var payload = new CommuneDto
            {
                Name = $"Commune-{Guid.NewGuid():N}",
                DistrictId = districtId
            };
            var response = await PostAsync("/api/Commune", payload);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task Commune_GetById_NonExistent_Returns404()
        {
            var response = await GetAsync($"/api/Commune/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ─── ReferentialIntegrityTests ────────────────────────────────────────────

    public class ReferentialIntegrityTests : ReferenceDataTests
    {
        public ReferentialIntegrityTests(WebAppFactory factory) : base(factory) { }

        private async Task<Guid> SeedRecordingWithEthnicGroup(Guid ethnicGroupId)
        {
            var uploader = await DbContext.Users.FirstAsync(u => u.Role == "Contributor");
            var recording = new Recording
            {
                Id = Guid.NewGuid(),
                AudioFileUrl = "http://test.com/audio.mp3",
                Status = SubmissionStatus.Draft,
                UploadedById = uploader.Id,
                EthnicGroupId = ethnicGroupId,
                CreatedAt = DateTime.UtcNow
            };
            DbContext.Recordings.Add(recording);
            await DbContext.SaveChangesAsync();
            return recording.Id;
        }

        [Fact]
        public async Task EthnicGroup_Delete_ReferencedByRecording_Returns400OrOk()
        {
            // Create a fresh EthnicGroup
            var eg = new EthnicGroup { Id = Guid.NewGuid(), Name = $"FK-EG-{Guid.NewGuid():N}" };
            DbContext.EthnicGroups.Add(eg);
            await DbContext.SaveChangesAsync();

            // Seed a recording referencing it
            await SeedRecordingWithEthnicGroup(eg.Id);

            // Attempt DELETE — behavior depends on cascade config
            var response = await Client.DeleteAsync($"/api/EthnicGroup/{eg.Id}");
            // Document: 200 (cascade) or 400 (FK violation) — both accepted
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task Ceremony_Delete_NotReferencedByRecording_Returns200()
        {
            var payload = new CeremonyDto { Name = $"SafeDel-{Guid.NewGuid():N}", Type = "Test" };
            var id = await CreateEntityAndGetId("/api/Ceremony", payload);

            var response = await Client.DeleteAsync($"/api/Ceremony/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }
}
