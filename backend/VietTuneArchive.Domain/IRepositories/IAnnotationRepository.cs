using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface IAnnotationRepository : IGenericRepository<Annotation>
    {
        Task<IEnumerable<Annotation>> GetByRecordingIdAsync(Guid recordingId);
        Task<IEnumerable<Annotation>> GetByExpertIdAsync(Guid expertId);
    }
}
