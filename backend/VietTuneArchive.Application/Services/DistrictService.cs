using AutoMapper;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class DistrictService : GenericService<District, DistrictDto>, IDistrictService
    {
        private readonly IDistrictRepository _districtRepository;

        public DistrictService(IDistrictRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _districtRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        public async Task<Result<IEnumerable<DistrictDto>>> GetByProvinceIdAsync(Guid provinceId)
        {
            try
            {
                if (provinceId == Guid.Empty)
                    return Result<IEnumerable<DistrictDto>>.Failure("Province id cannot be empty");
                var districts = await _districtRepository.GetByProvinceAsync(provinceId);
                var dtos = _mapper.Map<List<DistrictDto>>(districts);
                return Result<IEnumerable<DistrictDto>>.Success(dtos, $"Found {dtos.Count} districts");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<DistrictDto>>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// Search districts by name within a province
        /// </summary>
        public async Task<ServiceResponse<List<DistrictDto>>> SearchByNameAsync(Guid provinceId, string name)
        {
            try
            {
                if (provinceId == Guid.Empty)
                    throw new ArgumentException("Province id cannot be empty", nameof(provinceId));

                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Search name cannot be empty", nameof(name));

                var districts = await _districtRepository.GetAsync(d =>
                    d.ProvinceId == provinceId && d.Name.Contains(name));
                var dtos = _mapper.Map<List<DistrictDto>>(districts);
                return new ServiceResponse<List<DistrictDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} districts"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<DistrictDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Count districts in a province
        /// </summary>
        public async Task<ServiceResponse<int>> CountByProvinceAsync(Guid provinceId)
        {
            try
            {
                if (provinceId == Guid.Empty)
                    throw new ArgumentException("Province id cannot be empty", nameof(provinceId));

                var count = await _districtRepository.CountAsync(d => d.ProvinceId == provinceId);
                return new ServiceResponse<int>
                {
                    Success = true,
                    Data = count,
                    Message = "Counted successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<int>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
