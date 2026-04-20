using System.Linq.Expressions;
using AutoMapper;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    /// <summary>
    /// Generic service implementation for business logic operations
    /// </summary>
    /// <typeparam name="TEntity">Entity type</typeparam>
    /// <typeparam name="TDto">DTO type for response</typeparam>
    public class GenericService<TEntity, TDto> : IGenericService<TDto>
        where TEntity : class
        where TDto : class
    {
        protected readonly IGenericRepository<TEntity> _repository;
        protected readonly IMapper _mapper;

        public GenericService(IGenericRepository<TEntity> repository, IMapper mapper)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        }

        public virtual async Task<ServiceResponse<TDto>> GetAllAsync()
        {
            try
            {
                var entities = await _repository.GetAllAsync();
                var dtos = _mapper.Map<IEnumerable<TDto>>(entities);
                return new ServiceResponse<TDto>
                {
                    Success = true,
                    Data = dtos.FirstOrDefault(),
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<TDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public virtual async Task<ServiceResponse<TDto>> GetByIdAsync(Guid id)
        {
            try
            {
                if (id == Guid.Empty)
                    throw new ArgumentException("Id cannot be empty", nameof(id));

                var entity = await _repository.GetByIdAsync(id);
                if (entity == null)
                    return new ServiceResponse<TDto>
                    {
                        Success = false,
                        Message = "Entity not found"
                    };

                var dto = _mapper.Map<TDto>(entity);
                return new ServiceResponse<TDto>
                {
                    Success = true,
                    Data = dto,
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<TDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public virtual async Task<ServiceResponse<TDto>> CreateAsync(TDto dto)
        {
            try
            {
                if (dto == null)
                    throw new ArgumentNullException(nameof(dto));

                var entity = _mapper.Map<TEntity>(dto);
                var createdEntity = await _repository.AddAsync(entity);
                var resultDto = _mapper.Map<TDto>(createdEntity);

                return new ServiceResponse<TDto>
                {
                    Success = true,
                    Data = resultDto,
                    Message = "Created successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<TDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public virtual async Task<ServiceResponse<TDto>> UpdateAsync(Guid id, TDto dto)
        {
            try
            {
                if (id == Guid.Empty)
                    throw new ArgumentException("Id cannot be empty", nameof(id));

                if (dto == null)
                    throw new ArgumentNullException(nameof(dto));

                var entity = await _repository.GetByIdAsync(id);
                if (entity == null)
                    return new ServiceResponse<TDto>
                    {
                        Success = false,
                        Message = "Entity not found"
                    };

                _mapper.Map(dto, entity);
                var updatedEntity = await _repository.UpdateAsync(entity);
                var resultDto = _mapper.Map<TDto>(updatedEntity);

                return new ServiceResponse<TDto>
                {
                    Success = true,
                    Data = resultDto,
                    Message = "Updated successfully"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<TDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public virtual async Task<ServiceResponse<bool>> DeleteAsync(Guid id)
        {
            try
            {
                if (id == Guid.Empty)
                    throw new ArgumentException("Id cannot be empty", nameof(id));

                var result = await _repository.DeleteAsync(id);
                return new ServiceResponse<bool>
                {
                    Success = result,
                    Data = result,
                    Message = result ? "Deleted successfully" : "Failed to delete"
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<bool>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public virtual async Task<PagedResponse<TDto>> GetPaginatedAsync(int pageNumber, int pageSize)
        {
            try
            {
                if (pageNumber < 1)
                    throw new ArgumentException("Page number must be greater than 0", nameof(pageNumber));
                if (pageSize < 1)
                    throw new ArgumentException("Page size must be greater than 0", nameof(pageSize));

                var (entities, total) = await _repository.GetPaginatedAsync(pageNumber, pageSize);
                var dtos = _mapper.Map<List<TDto>>(entities);

                return new PagedResponse<TDto>
                {
                    Success = true,
                    Data = dtos,
                    Total = total,
                    Page = pageNumber,
                    PageSize = pageSize,
                    Message = "Retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new PagedResponse<TDto>
                {
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        // Additional methods for specific services
        public virtual async Task<IEnumerable<TDto>> GetAsync(Expression<Func<TEntity, bool>> predicate)
        {
            var entities = await _repository.GetAsync(predicate);
            return _mapper.Map<IEnumerable<TDto>>(entities);
        }

        public virtual async Task<TDto> GetFirstOrDefaultAsync(Expression<Func<TEntity, bool>> predicate)
        {
            var entity = await _repository.GetFirstOrDefaultAsync(predicate);
            return _mapper.Map<TDto>(entity);
        }

        public virtual async Task<bool> ExistsAsync(Guid id)
        {
            return await _repository.ExistsAsync(id);
        }

        public virtual async Task<int> CountAsync()
        {
            return await _repository.CountAsync();
        }
    }
}
