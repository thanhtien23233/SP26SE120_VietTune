using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class CeremonyService : GenericService<Ceremony, CeremonyDto>, ICeremonyService
    {
        private readonly ICeremonyRepository _ceremonyRepository;

        public CeremonyService(ICeremonyRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _ceremonyRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get ceremonies by type
        /// </summary>
        public async Task<ServiceResponse<List<CeremonyDto>>> GetByTypeAsync(string type)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(type))
                    throw new ArgumentException("Type cannot be empty", nameof(type));

                var ceremonies = await _ceremonyRepository.GetAsync(c => c.Type == type);
                var dtos = _mapper.Map<List<CeremonyDto>>(ceremonies);
                return new ServiceResponse<List<CeremonyDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} ceremonies of type {type}"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<CeremonyDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get ceremonies by season
        /// </summary>
        public async Task<ServiceResponse<List<CeremonyDto>>> GetBySeasonAsync(string season)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(season))
                    throw new ArgumentException("Season cannot be empty", nameof(season));

                var ceremonies = await _ceremonyRepository.GetAsync(c => c.Season == season);
                var dtos = _mapper.Map<List<CeremonyDto>>(ceremonies);
                return new ServiceResponse<List<CeremonyDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} ceremonies in {season}"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<CeremonyDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Search ceremonies by name
        /// </summary>
        public async Task<ServiceResponse<List<CeremonyDto>>> SearchByNameAsync(string name)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Search name cannot be empty", nameof(name));

                var ceremonies = await _ceremonyRepository.GetAsync(c => c.Name.Contains(name));
                var dtos = _mapper.Map<List<CeremonyDto>>(ceremonies);
                return new ServiceResponse<List<CeremonyDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} ceremonies"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<CeremonyDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get all ceremony types
        /// </summary>
        public async Task<ServiceResponse<List<string>>> GetAllTypesAsync()
        {
            try
            {
                var ceremonies = await _ceremonyRepository.GetAllAsync();
                var types = ceremonies
                    .Select(c => c.Type)
                    .Distinct()
                    .OrderBy(t => t)
                    .ToList();

                return new ServiceResponse<List<string>>
                {
                    Success = true,
                    Data = types,
                    Message = "Retrieved all ceremony types successfully"
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

        /// <summary>
        /// Get all seasons
        /// </summary>
        public async Task<ServiceResponse<List<string>>> GetAllSeasonsAsync()
        {
            try
            {
                var ceremonies = await _ceremonyRepository.GetAllAsync();
                var seasons = ceremonies
                    .Where(c => !string.IsNullOrEmpty(c.Season))
                    .Select(c => c.Season!)
                    .Distinct()
                    .OrderBy(s => s)
                    .ToList();

                return new ServiceResponse<List<string>>
                {
                    Success = true,
                    Data = seasons,
                    Message = "Retrieved all seasons successfully"
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
