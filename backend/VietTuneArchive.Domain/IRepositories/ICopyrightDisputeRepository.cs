using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface ICopyrightDisputeRepository : IGenericRepository<CopyrightDispute>
    {
        Task<(IEnumerable<CopyrightDispute> Data, int Total)> GetPagedAsync(
            CopyrightDisputeStatus? status,
            Guid? assignedReviewerId,
            Guid? recordingId,
            int page,
            int pageSize);
        
        Task<CopyrightDispute?> GetByIdWithDetailsAsync(Guid id);
    }
}
