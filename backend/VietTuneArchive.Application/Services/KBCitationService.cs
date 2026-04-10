using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class KBCitationService : GenericService<KBCitation, KBCitationDto>, IKBCitationService
    {
        private readonly IKBCitationRepository _citationRepository;

        public KBCitationService(IKBCitationRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _citationRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get citations for an entry
        /// </summary>
        public async Task<ServiceResponse<List<KBCitationDto>>> GetByEntryAsync(Guid entryId)
        {
            try
            {
                if (entryId == Guid.Empty)
                    throw new ArgumentException("Entry id cannot be empty", nameof(entryId));

                var citations = await _citationRepository.GetAsync(c => c.EntryId == entryId);
                var dtos = _mapper.Map<List<KBCitationDto>>(citations);
                return new ServiceResponse<List<KBCitationDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} citations"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<KBCitationDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get citations with URLs
        /// </summary>
        public async Task<ServiceResponse<List<KBCitationDto>>> GetWithUrlsAsync()
        {
            try
            {
                var citations = await _citationRepository.GetAsync(c => c.Url != null);
                var dtos = _mapper.Map<List<KBCitationDto>>(citations);
                return new ServiceResponse<List<KBCitationDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = "Retrieved citations with URLs successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<KBCitationDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Search citations by text
        /// </summary>
        public async Task<ServiceResponse<List<KBCitationDto>>> SearchAsync(string keyword)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(keyword))
                    throw new ArgumentException("Search keyword cannot be empty", nameof(keyword));

                var citations = await _citationRepository.GetAsync(c =>
                    c.Citation.Contains(keyword) || (c.Url != null && c.Url.Contains(keyword)));
                var dtos = _mapper.Map<List<KBCitationDto>>(citations);
                return new ServiceResponse<List<KBCitationDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} citations"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<KBCitationDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get citation count for an entry
        /// </summary>
        public async Task<ServiceResponse<int>> GetCitationCountAsync(Guid entryId)
        {
            try
            {
                if (entryId == Guid.Empty)
                    throw new ArgumentException("Entry id cannot be empty", nameof(entryId));

                var count = await _citationRepository.CountAsync(c => c.EntryId == entryId);
                return new ServiceResponse<int>
                {
                    Success = true,
                    Data = count,
                    Message = "Citation count retrieved successfully"
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

        /// <summary>
        /// Add citation to entry
        /// </summary>
        public async Task<ServiceResponse<KBCitationDto>> AddCitationAsync(Guid entryId, string citation, string? url = null)
        {
            try
            {
                if (entryId == Guid.Empty)
                    throw new ArgumentException("Entry id cannot be empty", nameof(entryId));

                if (string.IsNullOrWhiteSpace(citation))
                    throw new ArgumentException("Citation text cannot be empty", nameof(citation));

                var newCitation = new KBCitation
                {
                    EntryId = entryId,
                    Citation = citation,
                    Url = url
                };

                var createdCitation = await _citationRepository.AddAsync(newCitation);
                var dto = _mapper.Map<KBCitationDto>(createdCitation);
                return new ServiceResponse<KBCitationDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Citation added successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<KBCitationDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
