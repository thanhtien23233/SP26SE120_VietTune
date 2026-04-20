using System.Linq.Expressions;

namespace VietTuneArchive.Domain.IRepositories
{
    /// <summary>
    /// Generic repository interface for CRUD operations
    /// </summary>
    /// <typeparam name="T">Entity type</typeparam>
    public interface IGenericRepository<T> where T : class
    {
        /// <summary>
        /// Get all entities
        /// </summary>
        Task<IEnumerable<T>> GetAllAsync();

        /// <summary>
        /// Get entity by id
        /// </summary>
        /// <param name="id">Entity id</param>
        Task<T> GetByIdAsync(Guid id);

        /// <summary>
        /// Get entities by predicate
        /// </summary>
        /// <param name="predicate">Filter expression</param>
        Task<IEnumerable<T>> GetAsync(Expression<Func<T, bool>> predicate);

        /// <summary>
        /// Get first or default entity by predicate
        /// </summary>
        /// <param name="predicate">Filter expression</param>
        Task<T> GetFirstOrDefaultAsync(Expression<Func<T, bool>> predicate);

        /// <summary>
        /// Add new entity
        /// </summary>
        /// <param name="entity">Entity to add</param>
        Task<T> AddAsync(T entity);

        /// <summary>
        /// Add multiple entities
        /// </summary>
        /// <param name="entities">Entities to add</param>
        Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entities);

        /// <summary>
        /// Update existing entity
        /// </summary>
        /// <param name="entity">Entity to update</param>
        Task<T> UpdateAsync(T entity);

        /// <summary>
        /// Delete entity by id
        /// </summary>
        /// <param name="id">Entity id</param>
        Task<bool> DeleteAsync(Guid id);

        /// <summary>
        /// Delete entity
        /// </summary>
        /// <param name="entity">Entity to delete</param>
        Task<bool> DeleteAsync(T entity);

        /// <summary>
        /// Delete multiple entities
        /// </summary>
        /// <param name="entities">Entities to delete</param>
        Task<bool> DeleteRangeAsync(IEnumerable<T> entities);

        /// <summary>
        /// Check if entity exists
        /// </summary>
        /// <param name="id">Entity id</param>
        Task<bool> ExistsAsync(Guid id);

        /// <summary>
        /// Get count of entities
        /// </summary>
        Task<int> CountAsync();

        /// <summary>
        /// Get count of entities by predicate
        /// </summary>
        /// <param name="predicate">Filter expression</param>
        Task<int> CountAsync(Expression<Func<T, bool>> predicate);

        /// <summary>
        /// Get paginated entities
        /// </summary>
        /// <param name="pageNumber">Page number (1-based)</param>
        /// <param name="pageSize">Page size</param>
        Task<(IEnumerable<T> Data, int Total)> GetPaginatedAsync(int pageNumber, int pageSize);

        /// <summary>
        /// Get paginated entities with filter
        /// </summary>
        /// <param name="predicate">Filter expression</param>
        /// <param name="pageNumber">Page number (1-based)</param>
        /// <param name="pageSize">Page size</param>
        Task<(IEnumerable<T> Data, int Total)> GetPaginatedAsync(Expression<Func<T, bool>> predicate, int pageNumber, int pageSize);
    }
}
