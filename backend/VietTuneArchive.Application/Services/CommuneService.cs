using AutoMapper;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class CommuneService : GenericService<Commune, CommuneDto>, ICommuneService
    {
        private readonly ICommuneRepository _communeRepository;

        public CommuneService(ICommuneRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _communeRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get all communes by district id
        /// </summary>
        public async Task<Result<IEnumerable<CommuneDto>>> GetByDistrictIdAsync(Guid districtId)
        {
            try
            {
                if (districtId == Guid.Empty)
                    return Result<IEnumerable<CommuneDto>>.Failure("District id cannot be empty");
                var communes = await _communeRepository.GetByDistrictIdAsync(districtId);
                var dtos = _mapper.Map<List<CommuneDto>>(communes);
                return Result<IEnumerable<CommuneDto>>.Success(dtos, $"Found {dtos.Count} communes");
            }
            catch (Exception ex)
            {
                return Result<IEnumerable<CommuneDto>>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// Search communes by name within a district
        /// </summary>
        public async Task<ServiceResponse<List<CommuneDto>>> SearchByNameAsync(Guid districtId, string name)
        {
            try
            {
                if (districtId == Guid.Empty)
                    throw new ArgumentException("District id cannot be empty", nameof(districtId));

                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Search name cannot be empty", nameof(name));

                var communes = await _communeRepository.GetAsync(c =>
                    c.DistrictId == districtId && c.Name.Contains(name));
                var dtos = _mapper.Map<List<CommuneDto>>(communes);
                return new ServiceResponse<List<CommuneDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} communes"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<CommuneDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get communes by GPS coordinates within radius
        /// </summary>
        public async Task<ServiceResponse<List<CommuneDto>>> GetByLocationAsync(decimal latitude, decimal longitude, decimal radiusKm = 5)
        {
            try
            {
                var communes = await _communeRepository.GetAsync(c =>
                    c.Latitude.HasValue && c.Longitude.HasValue);

                var filteredCommunesList = communes
                    .Where(c => CalculateDistance(latitude, longitude, c.Latitude!.Value, c.Longitude!.Value) <= radiusKm)
                    .ToList();

                var dtos = _mapper.Map<List<CommuneDto>>(filteredCommunesList);
                return new ServiceResponse<List<CommuneDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} communes within {radiusKm}km"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<CommuneDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Calculate distance between two coordinates (Haversine formula)
        /// </summary>
        private decimal CalculateDistance(decimal lat1, decimal lon1, decimal lat2, decimal lon2)
        {
            const decimal R = 6371; // Earth radius in km
            var dLat = (lat2 - lat1) * (decimal)Math.PI / 180;
            var dLon = (lon2 - lon1) * (decimal)Math.PI / 180;
            var a = (decimal)Math.Sin((double)dLat / 2) * (decimal)Math.Sin((double)dLat / 2) +
                    (decimal)Math.Cos((double)lat1 * Math.PI / 180) * (decimal)Math.Cos((double)lat2 * Math.PI / 180) *
                    (decimal)Math.Sin((double)dLon / 2) * (decimal)Math.Sin((double)dLon / 2);
            var c = 2 * (decimal)Math.Atan2(Math.Sqrt((double)a), Math.Sqrt((double)(1 - a)));
            return R * c;
        }

        /// <summary>
        /// Count communes in a district
        /// </summary>
        public async Task<ServiceResponse<int>> CountByDistrictAsync(Guid districtId)
        {
            try
            {
                if (districtId == Guid.Empty)
                    throw new ArgumentException("District id cannot be empty", nameof(districtId));

                var count = await _communeRepository.CountAsync(c => c.DistrictId == districtId);
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
