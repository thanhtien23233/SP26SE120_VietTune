using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Application.IServices
{
    public interface IEmbargoService
    {
        Task<ServiceResponse<EmbargoDto>> GetByRecordingIdAsync(Guid recordingId);
        Task<ServiceResponse<EmbargoDto>> CreateOrUpdateAsync(Guid recordingId, EmbargoCreateUpdateDto dto, Guid userId);
        Task<ServiceResponse<EmbargoDto>> LiftEmbargoAsync(Guid recordingId, EmbargoLiftDto dto);
        Task<PagedResponse<EmbargoDto>> GetPagedEmbargoesAsync(EmbargoStatus? status, int page, int pageSize, DateTime? from, DateTime? to);
    }
}
