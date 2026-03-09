using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface ISubmissionRepository : IGenericRepository<Submission>
    {
        Task<Submission> GetSubmissionByIdAsync(Guid id);
        Task<IEnumerable<Submission>> GetAllSubmissionsAsync();
        Task<IEnumerable<Submission>> GetByUserIdAsync(Guid userId);
        Task<IEnumerable<Submission>> GetByStatusAsync(SubmissionStatus status);
    }
}
