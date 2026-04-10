using VietTuneArchive.Application.Responses;

namespace VietTuneArchive.Application.IServices
{
    /// <summary>
    /// Generic service interface for business logic operations
    /// </summary>
    /// <typeparam name="T">DTO type</typeparam>
    public interface IGenericService<T> where T : class
    {
        /// <summary>
        /// Get paginated entities
        /// </summary>
        Task<PagedResponse<T>> GetPaginatedAsync(int pageNumber, int pageSize);

        /// <summary>
        /// Get entity by id
        /// </summary>
        Task<ServiceResponse<T>> GetByIdAsync(Guid id);

        /// <summary>
        /// Create new entity
        /// </summary>
        Task<ServiceResponse<T>> CreateAsync(T dto);

        /// <summary>
        /// Update existing entity
        /// </summary>
        Task<ServiceResponse<T>> UpdateAsync(Guid id, T dto);

        /// <summary>
        /// Delete entity by id
        /// </summary>
        Task<ServiceResponse<bool>> DeleteAsync(Guid id);

        /// <summary>
        /// Check if entity exists
        /// </summary>
        Task<bool> ExistsAsync(Guid id);

        /// <summary>
        /// Get count of entities
        /// </summary>
        Task<int> CountAsync();
    }
}
