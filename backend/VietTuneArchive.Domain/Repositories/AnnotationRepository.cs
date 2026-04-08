using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class AnnotationRepository : GenericRepository<Annotation>, IAnnotationRepository
    {
        private readonly DBContext _context;
        public AnnotationRepository(DBContext context) : base(context)
        {
            _context = context;
        }
        public async Task<IEnumerable<Annotation>> GetByRecordingIdAsync(Guid recordingId)
        {
            return await _context.Annotations
                .Where(a => a.RecordingId == recordingId)
                .ToListAsync();
        }
        public async Task<IEnumerable<Annotation>> GetByExpertIdAsync(Guid expertId)
        {
            return await _context.Annotations
                .Where(a => a.ExpertId == expertId)
                .ToListAsync();
        }
    }
}
