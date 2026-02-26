using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class VocalStyleService : GenericService<VocalStyle, VocalStyleDto>, IVocalStyleService
    {
        private readonly IVocalStyleRepository _vocalStyleRepository;

        public VocalStyleService(IVocalStyleRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _vocalStyleRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get vocal styles by ethnic group
        /// </summary>
        public async Task<ServiceResponse<List<VocalStyleDto>>> GetByEthnicGroupAsync(Guid ethnicGroupId)
        {
            try
            {
                if (ethnicGroupId == Guid.Empty)
                    throw new ArgumentException("Ethnic group id cannot be empty", nameof(ethnicGroupId));

                var vocalStyles = await _vocalStyleRepository.GetAsync(vs => vs.EthnicGroupId == ethnicGroupId);
                var dtos = _mapper.Map<List<VocalStyleDto>>(vocalStyles);
                return new ServiceResponse<List<VocalStyleDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} vocal styles"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<VocalStyleDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Search vocal styles by name
        /// </summary>
        public async Task<ServiceResponse<List<VocalStyleDto>>> SearchByNameAsync(string name)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Search name cannot be empty", nameof(name));

                var vocalStyles = await _vocalStyleRepository.GetAsync(vs => vs.Name.Contains(name));
                var dtos = _mapper.Map<List<VocalStyleDto>>(vocalStyles);
                return new ServiceResponse<List<VocalStyleDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} vocal styles"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<VocalStyleDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get vocal styles with descriptions
        /// </summary>
        public async Task<ServiceResponse<List<VocalStyleDto>>> GetWithDescriptionsAsync()
        {
            try
            {
                var vocalStyles = await _vocalStyleRepository.GetAsync(vs => vs.Description != null);
                var dtos = _mapper.Map<List<VocalStyleDto>>(vocalStyles);
                return new ServiceResponse<List<VocalStyleDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = "Retrieved vocal styles with descriptions successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<VocalStyleDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
