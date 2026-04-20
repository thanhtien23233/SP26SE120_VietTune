using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReferenceDataController : ControllerBase
    {
        private readonly IProvinceService _provinceService;
        private readonly IEthnicGroupService _ethnicGroupService;
        private readonly ICeremonyService _ceremonyService;
        private readonly IVocalStyleService _vocalStyleService;
        private readonly IMusicalScaleService _musicalScaleService;
        private readonly ITagService _tagService;

        public ReferenceDataController(
            IProvinceService provinceService,
            IEthnicGroupService ethnicGroupService,
            ICeremonyService ceremonyService,
            IVocalStyleService vocalStyleService,
            IMusicalScaleService musicalScaleService,
            ITagService tagService)
        {
            _provinceService = provinceService;
            _ethnicGroupService = ethnicGroupService;
            _ceremonyService = ceremonyService;
            _vocalStyleService = vocalStyleService;
            _musicalScaleService = musicalScaleService;
            _tagService = tagService;
        }

        // GET: /api/reference/ethnic-groups
        [HttpGet("ethnic-groups")]
        public async Task<ActionResult<PagedResponse<EthnicGroupDto>>> GetEthnicGroups(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _ethnicGroupService.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        // GET: /api/reference/ethnic-groups/{id}
        [HttpGet("ethnic-groups/{id}")]
        public async Task<ActionResult<ServiceResponse<EthnicGroupDto>>> GetEthnicGroup(Guid id)
        {
            var result = await _ethnicGroupService.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/reference/provinces
        [HttpGet("provinces")]
        public async Task<ActionResult<PagedResponse<ProvinceDto>>> GetProvinces(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _provinceService.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        // GET: /api/reference/provinces/{id}
        [HttpGet("provinces/{id}")]
        public async Task<ActionResult<ServiceResponse<ProvinceDto>>> GetProvince(Guid id)
        {
            var result = await _provinceService.GetByIdAsync(id);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/reference/ceremonies
        [HttpGet("ceremonies")]
        public async Task<ActionResult<PagedResponse<CeremonyDto>>> GetCeremonies(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _ceremonyService.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        // GET: /api/reference/vocal-styles
        [HttpGet("vocal-styles")]
        public async Task<ActionResult<PagedResponse<VocalStyleDto>>> GetVocalStyles(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _vocalStyleService.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        // GET: /api/reference/musical-scales
        [HttpGet("musical-scales")]
        public async Task<ActionResult<PagedResponse<MusicalScaleDto>>> GetMusicalScales(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _musicalScaleService.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        // GET: /api/reference/tags
        [HttpGet("tags")]
        public async Task<ActionResult<PagedResponse<TagDto>>> GetTags(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _tagService.GetPaginatedAsync(page, pageSize);
            return Ok(result);
        }

        // GET: /api/reference/ethnic-groups/search
        [HttpGet("ethnic-groups/search")]
        public async Task<ActionResult<ServiceResponse<List<EthnicGroupDto>>>> SearchEthnicGroups([FromQuery] string keyword)
        {
            var result = await _ethnicGroupService.SearchAsync(keyword);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/reference/provinces/search
        [HttpGet("provinces/search")]
        public async Task<ActionResult<ServiceResponse<List<ProvinceDto>>>> SearchProvinces([FromQuery] string keyword)
        {
            var result = await _provinceService.SearchByNameAsync(keyword);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/reference/ceremonies/search
        [HttpGet("ceremonies/search")]
        public async Task<ActionResult<ServiceResponse<List<CeremonyDto>>>> SearchCeremonies([FromQuery] string keyword)
        {
            var result = await _ceremonyService.SearchByNameAsync(keyword);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/reference/vocal-styles/search
        [HttpGet("vocal-styles/search")]
        public async Task<ActionResult<ServiceResponse<List<VocalStyleDto>>>> SearchVocalStyles([FromQuery] string keyword)
        {
            var result = await _vocalStyleService.SearchByNameAsync(keyword);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/reference/musical-scales/search
        [HttpGet("musical-scales/search")]
        public async Task<ActionResult<ServiceResponse<List<MusicalScaleDto>>>> SearchMusicalScales([FromQuery] string keyword)
        {
            var result = await _musicalScaleService.SearchByNameAsync(keyword);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // GET: /api/reference/tags/search
        [HttpGet("tags/search")]
        public async Task<ActionResult<ServiceResponse<List<TagDto>>>> SearchTags([FromQuery] string keyword)
        {
            var result = await _tagService.SearchByNameAsync(keyword);
            return result.Success ? Ok(result) : NotFound(result);
        }
    }
}
