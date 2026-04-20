using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Domain.Repositories
{
    public class EthnicGroupRepository : GenericRepository<EthnicGroup>, IEthnicGroupRepository
    {
        public EthnicGroupRepository(DBContext context) : base(context)
        {
        }
    }
}
