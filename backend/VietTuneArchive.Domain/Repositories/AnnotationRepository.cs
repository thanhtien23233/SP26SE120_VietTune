using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class AnnotationRepository : GenericRepository<Annotation>, IAnnotationRepository
    {
        public AnnotationRepository(DBContext context) : base(context)
        {
        }
    }
}
