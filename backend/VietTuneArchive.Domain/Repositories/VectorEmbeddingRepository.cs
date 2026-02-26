using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class VectorEmbeddingRepository : GenericRepository<VectorEmbedding>, IVectorEmbeddingRepository
    {
        public VectorEmbeddingRepository(DBContext context) : base(context)
        {
        }
    }
}
