using AutoMapper;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class EmbargoService : IEmbargoService
    {
        private readonly IEmbargoRepository _repository;
        private readonly IMapper _mapper;

        public EmbargoService(IEmbargoRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<ServiceResponse<EmbargoDto>> GetByRecordingIdAsync(Guid recordingId)
        {
            var embargo = await _repository.GetByRecordingIdAsync(recordingId);
            if (embargo == null)
            {
                return new ServiceResponse<EmbargoDto> { Success = false, Message = "Embargo not found for this recording" };
            }

            return new ServiceResponse<EmbargoDto> { Data = _mapper.Map<EmbargoDto>(embargo) };
        }

        public async Task<ServiceResponse<EmbargoDto>> CreateOrUpdateAsync(Guid recordingId, EmbargoCreateUpdateDto dto, Guid userId)
        {
            var embargo = await _repository.GetByRecordingIdAsync(recordingId);
            
            if (embargo == null)
            {
                embargo = new Embargo
                {
                    Id = Guid.NewGuid(),
                    RecordingId = recordingId,
                    EmbargoStartDate = dto.EmbargoStartDate,
                    EmbargoEndDate = dto.EmbargoEndDate,
                    Reason = dto.Reason,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    Status = DetermineStatus(dto.EmbargoStartDate, dto.EmbargoEndDate)
                };
                await _repository.AddAsync(embargo);
            }
            else
            {
                embargo.EmbargoStartDate = dto.EmbargoStartDate;
                embargo.EmbargoEndDate = dto.EmbargoEndDate;
                embargo.Reason = dto.Reason;
                embargo.UpdatedAt = DateTime.UtcNow;
                embargo.Status = DetermineStatus(dto.EmbargoStartDate, dto.EmbargoEndDate);
                await _repository.UpdateAsync(embargo);
            }

            return new ServiceResponse<EmbargoDto> { Data = _mapper.Map<EmbargoDto>(embargo) };
        }

        public async Task<ServiceResponse<EmbargoDto>> LiftEmbargoAsync(Guid recordingId, EmbargoLiftDto dto)
        {
            var embargo = await _repository.GetByRecordingIdAsync(recordingId);
            if (embargo == null)
            {
                return new ServiceResponse<EmbargoDto> { Success = false, Message = "Embargo not found" };
            }

            embargo.Status = EmbargoStatus.Lifted;
            embargo.Reason = (embargo.Reason ?? "") + " | Lift Reason: " + dto.Reason;
            embargo.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(embargo);
            return new ServiceResponse<EmbargoDto> { Data = _mapper.Map<EmbargoDto>(embargo) };
        }

        public async Task<PagedResponse<EmbargoDto>> GetPagedEmbargoesAsync(EmbargoStatus? status, int page, int pageSize, DateTime? from, DateTime? to)
        {
            Expression<Func<Embargo, bool>> predicate = e => 
                (!status.HasValue || e.Status == status.Value) &&
                (!from.HasValue || e.CreatedAt >= from.Value) &&
                (!to.HasValue || e.CreatedAt <= to.Value);

            var (items, totalItems) = await _repository.GetPaginatedAsync(predicate, page, pageSize);

            return new PagedResponse<EmbargoDto>
            {
                Success = true,
                Data = _mapper.Map<List<EmbargoDto>>(items),
                Page = page,
                PageSize = pageSize,
                Total = totalItems
            };
        }

        private EmbargoStatus DetermineStatus(DateTime? start, DateTime? end)
        {
            var now = DateTime.UtcNow;
            if (start > now) return EmbargoStatus.Scheduled;
            if (end < now) return EmbargoStatus.Expired;
            return EmbargoStatus.Active;
        }
    }
}
