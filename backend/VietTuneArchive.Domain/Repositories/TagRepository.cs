using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class TagRepository : GenericRepository<Tag>, ITagRepository
    {
        public TagRepository(DBContext context) : base(context)
        {
        }
    }
}
