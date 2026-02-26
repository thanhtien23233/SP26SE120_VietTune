using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class TagService : GenericService<Tag, TagDto>, ITagService
    {
        private readonly ITagRepository _tagRepository;

        public TagService(ITagRepository repository, IMapper mapper)
            : base(repository, mapper)
        {
            _tagRepository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        /// <summary>
        /// Get tags by category
        /// </summary>
        public async Task<ServiceResponse<List<TagDto>>> GetByCategoryAsync(string category)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(category))
                    throw new ArgumentException("Category cannot be empty", nameof(category));

                var tags = await _tagRepository.GetAsync(t => t.Category == category);
                var dtos = _mapper.Map<List<TagDto>>(tags);
                return new ServiceResponse<List<TagDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} tags in {category}"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<TagDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Search tags by name
        /// </summary>
        public async Task<ServiceResponse<List<TagDto>>> SearchByNameAsync(string name)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Search name cannot be empty", nameof(name));

                var tags = await _tagRepository.GetAsync(t => t.Name.Contains(name));
                var dtos = _mapper.Map<List<TagDto>>(tags);
                return new ServiceResponse<List<TagDto>>
                {
                    Success = true,
                    Data = dtos,
                    Message = $"Found {dtos.Count} tags"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<List<TagDto>>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        /// <summary>
        /// Get all tag categories
        /// </summary>
        public async Task<ServiceResponse<List<string>>> GetAllCategoriesAsync()
        {
            try
            {
                var tags = await _tagRepository.GetAllAsync();
                var categories = tags
                    .Where(t => !string.IsNullOrEmpty(t.Category))
                    .Select(t => t.Category!)
                    .Distinct()
                    .OrderBy(c => c)
                    .ToList();

                return new ServiceResponse<List<string>>
                {
                    Success = true,
                    Data = categories,
                    Message = "Retrieved all tag categories successfully"
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
        /// Get or create tag (for bulk operations)
        /// </summary>
        public async Task<ServiceResponse<TagDto>> GetOrCreateAsync(string name, string? category = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Tag name cannot be empty", nameof(name));

                var existingTag = await _tagRepository.GetFirstOrDefaultAsync(t => t.Name == name);
                if (existingTag != null)
                {
                    var existingDto = _mapper.Map<TagDto>(existingTag);
                    return new ServiceResponse<TagDto>
                    {
                        Success = true,
                        Data = existingDto,
                        Message = "Tag already exists"
                    };
                }

                var newTag = new Tag { Name = name, Category = category };
                var createdTag = await _tagRepository.AddAsync(newTag);
                var dto = _mapper.Map<TagDto>(createdTag);
                return new ServiceResponse<TagDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Tag created successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<TagDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }
    }
}
