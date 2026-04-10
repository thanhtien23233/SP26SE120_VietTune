using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class InstrumentService : GenericService<Instrument, InstrumentDto>, IInstrumentService
    {
        private readonly IInstrumentRepository _instrumentRepository;
        private readonly IMapper _mapper;

        public InstrumentService(IInstrumentRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _instrumentRepository = repository;
            _mapper = mapper;
        }

        public async Task<ServiceResponse<List<InstrumentDto>>> GetByCategoryAsync(string category)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(category))
                    return new ServiceResponse<List<InstrumentDto>>
                    {
                        Success = false,
                        Message = "Category cannot be empty"
                    };

                var instruments = await _instrumentRepository.GetAsync(i => i.Category == category);
                var dtos = _mapper.Map<List<InstrumentDto>>(instruments.ToList());

                return new ServiceResponse<List<InstrumentDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} instruments in category: {category}"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<InstrumentDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<ServiceResponse<List<InstrumentDto>>> GetByEthnicGroupAsync(Guid ethnicGroupId)
        {
            try
            {
                if (ethnicGroupId == Guid.Empty)
                    return new ServiceResponse<List<InstrumentDto>>
                    {
                        Success = false,
                        Message = "Ethnic group ID cannot be empty"
                    };

                var instruments = await _instrumentRepository.GetAsync(i => i.OriginEthnicGroupId == ethnicGroupId);
                var dtos = _mapper.Map<List<InstrumentDto>>(instruments.ToList());

                return new ServiceResponse<List<InstrumentDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} instruments for ethnic group"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<InstrumentDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<ServiceResponse<List<InstrumentDto>>> SearchAsync(string keyword)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(keyword))
                    return new ServiceResponse<List<InstrumentDto>>
                    {
                        Success = false,
                        Message = "Search keyword cannot be empty"
                    };

                var instruments = await _instrumentRepository.GetAsync(i =>
                    i.Name.Contains(keyword) ||
                    (i.Description != null && i.Description.Contains(keyword)));

                var dtos = _mapper.Map<List<InstrumentDto>>(instruments.ToList());

                return new ServiceResponse<List<InstrumentDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} instruments matching: {keyword}"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<InstrumentDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<ServiceResponse<List<string>>> GetAllCategoriesAsync()
        {
            try
            {
                var instruments = await _instrumentRepository.GetAllAsync();
                var categories = instruments
                    .Select(i => i.Category)
                    .Distinct()
                    .OrderBy(c => c)
                    .ToList();

                return new ServiceResponse<List<string>>
                {
                    Success = true,
                    Data = categories,
                    Message = "Retrieved all instrument categories successfully"
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
