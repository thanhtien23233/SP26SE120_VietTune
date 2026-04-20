using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class EthnicGroupService : GenericService<EthnicGroup, EthnicGroupDto>, IEthnicGroupService
    {
        private readonly IEthnicGroupRepository _ethnicGroupRepository;

        public EthnicGroupService(IEthnicGroupRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _ethnicGroupRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Search ethnic groups by name or description
        /// </summary>
        public async Task<ServiceResponse<List<EthnicGroupDto>>> SearchAsync(string keyword)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(keyword))
                    throw new ArgumentException("Search keyword cannot be empty", nameof(keyword));

                var ethnicGroups = await _ethnicGroupRepository.GetAsync(eg =>
                    eg.Name.Contains(keyword) ||
                    (eg.Description != null && eg.Description.Contains(keyword)) ||
                    (eg.PrimaryRegion != null && eg.PrimaryRegion.Contains(keyword)));

                var dtos = _mapper.Map<List<EthnicGroupDto>>(ethnicGroups);
                return new ServiceResponse<List<EthnicGroupDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} ethnic groups"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<EthnicGroupDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get ethnic groups by primary region
        /// </summary>
        public async Task<ServiceResponse<List<EthnicGroupDto>>> GetByRegionAsync(string region)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(region))
                    throw new ArgumentException("Region cannot be empty", nameof(region));

                var ethnicGroups = await _ethnicGroupRepository.GetAsync(eg =>
                    eg.PrimaryRegion == region);

                var dtos = _mapper.Map<List<EthnicGroupDto>>(ethnicGroups);
                return new ServiceResponse<List<EthnicGroupDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} ethnic groups in {region}"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<EthnicGroupDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get ethnic groups by language family
        /// </summary>
        public async Task<ServiceResponse<List<EthnicGroupDto>>> GetByLanguageFamilyAsync(string languageFamily)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(languageFamily))
                    throw new ArgumentException("Language family cannot be empty", nameof(languageFamily));

                var ethnicGroups = await _ethnicGroupRepository.GetAsync(eg =>
                    eg.LanguageFamily == languageFamily);

                var dtos = _mapper.Map<List<EthnicGroupDto>>(ethnicGroups);
                return new ServiceResponse<List<EthnicGroupDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} ethnic groups with {languageFamily} language"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<EthnicGroupDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get all distinct regions
        /// </summary>
        public async Task<ServiceResponse<List<string>>> GetAllRegionsAsync()
        {
            try
            {
                var ethnicGroups = await _ethnicGroupRepository.GetAllAsync();
                var regions = ethnicGroups
                    .Where(eg => !string.IsNullOrEmpty(eg.PrimaryRegion))
                    .Select(eg => eg.PrimaryRegion!)
                    .Distinct()
                    .OrderBy(r => r)
                    .ToList();

                return new ServiceResponse<List<string>>
                {
                    Success = true,
                    Data = regions,
                    Message = "Retrieved all regions successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<string>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
