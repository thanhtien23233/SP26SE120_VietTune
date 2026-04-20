using System;
using System.Threading.Tasks;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.IRepositories
{
    public interface IEmbargoRepository : IGenericRepository<Embargo>
    {
        Task<Embargo?> GetByRecordingIdAsync(Guid recordingId);
    }
}
