using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class KBEntryService : GenericService<KBEntry, KBEntryDto>, IKBEntryService
    {
        private readonly IKBEntryRepository _kbEntryRepository;

        public KBEntryService(IKBEntryRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _kbEntryRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get entry by slug
        /// </summary>
        public async Task<ServiceResponse<KBEntryDto>> GetBySlugAsync(string slug)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(slug))
                    throw new ArgumentException("Slug cannot be empty", nameof(slug));

                var entry = await _kbEntryRepository.GetFirstOrDefaultAsync(e => e.Slug == slug);
                if (entry == null)
                    return new ServiceResponse<KBEntryDto>
                    {
                        Success = false,
                        Message = "Entry not found"
                    };

                var dto = _mapper.Map<KBEntryDto>(entry);
                return new ServiceResponse<KBEntryDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<KBEntryDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get entries by category
        /// </summary>
        public async Task<ServiceResponse<List<KBEntryDto>>> GetByCategoryAsync(string category)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(category))
                    throw new ArgumentException("Category cannot be empty", nameof(category));

                var entries = await _kbEntryRepository.GetAsync(e => e.Category == category);
                var dtos = _mapper.Map<List<KBEntryDto>>(entries);
                return new ServiceResponse<List<KBEntryDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} entries"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<KBEntryDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get published entries
        /// </summary>
        public async Task<ServiceResponse<List<KBEntryDto>>> GetPublishedAsync()
        {
            try
            {
                var entries = await _kbEntryRepository.GetAsync(e => e.Status == 1); // 1 = published
                var dtos = _mapper.Map<List<KBEntryDto>>(entries.OrderByDescending(e => e.CreatedAt).ToList());
                return new ServiceResponse<List<KBEntryDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = "Retrieved published entries successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<KBEntryDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Search entries by title or content
        /// </summary>
        public async Task<ServiceResponse<List<KBEntryDto>>> SearchAsync(string keyword)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(keyword))
                    throw new ArgumentException("Search keyword cannot be empty", nameof(keyword));

                var entries = await _kbEntryRepository.GetAsync(e => 
                    e.Title.Contains(keyword) || e.Content.Contains(keyword));
                var dtos = _mapper.Map<List<KBEntryDto>>(entries);
                return new ServiceResponse<List<KBEntryDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} entries"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<KBEntryDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get entries by author
        /// </summary>
        public async Task<ServiceResponse<List<KBEntryDto>>> GetByAuthorAsync(Guid authorId)
        {
            try
            {
                if (authorId == Guid.Empty)
                    throw new ArgumentException("Author id cannot be empty", nameof(authorId));

                var entries = await _kbEntryRepository.GetAsync(e => e.AuthorId == authorId);
                var dtos = _mapper.Map<List<KBEntryDto>>(entries);
                return new ServiceResponse<List<KBEntryDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} entries"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<KBEntryDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get all categories
        /// </summary>
        public async Task<ServiceResponse<List<string>>> GetAllCategoriesAsync()
        {
            try
            {
                var entries = await _kbEntryRepository.GetAllAsync();
                var categories = entries
                    .Select(e => e.Category)
                    .Distinct()
                    .OrderBy(c => c)
                    .ToList();

                return new ServiceResponse<List<string>>
                {
                    Success = true,
                    Data = categories,
                    Message = "Retrieved all categories successfully"
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
