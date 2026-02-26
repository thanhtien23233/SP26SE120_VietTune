using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class ProvinceService : GenericService<Province, ProvinceDto>, IProvinceService
    {
        private readonly IProvinceRepository _provinceRepository;

        public ProvinceService(IProvinceRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _provinceRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get all provinces with details
        /// </summary>
        public async Task<ServiceResponse<List<ProvinceDto>>> GetAllWithDetailsAsync()
        {
            try
            {
                var provinces = await _provinceRepository.GetAllAsync();
                var dtos = _mapper.Map<List<ProvinceDto>>(provinces);
                return new ServiceResponse<List<ProvinceDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = "Retrieved all provinces successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<ProvinceDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get province by region code
        /// </summary>
        public async Task<ServiceResponse<ProvinceDto>> GetByRegionCodeAsync(string regionCode)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(regionCode))
                    throw new ArgumentException("Region code cannot be empty", nameof(regionCode));

                var province = await _provinceRepository.GetFirstOrDefaultAsync(p => p.RegionCode == regionCode);
                if (province == null)
                    return new ServiceResponse<ProvinceDto>
                    {
                        Success = false,
                        Message = "Province not found"
                    };

                var dto = _mapper.Map<ProvinceDto>(province);
                return new ServiceResponse<ProvinceDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<ProvinceDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Search provinces by name
        /// </summary>
        public async Task<ServiceResponse<List<ProvinceDto>>> SearchByNameAsync(string name)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Search name cannot be empty", nameof(name));

                var provinces = await _provinceRepository.GetAsync(p => p.Name.Contains(name));
                var dtos = _mapper.Map<List<ProvinceDto>>(provinces);
                return new ServiceResponse<List<ProvinceDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} provinces"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<ProvinceDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
