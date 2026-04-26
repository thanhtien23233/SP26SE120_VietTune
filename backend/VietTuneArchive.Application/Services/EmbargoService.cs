using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        private readonly IRecordingRepository _recordingRepository;
        private readonly IMapper _mapper;
        private readonly INotificationService _notificationService;
        private readonly ILogger<EmbargoService> _logger;

        public EmbargoService(IEmbargoRepository repository, IRecordingRepository recordingRepository, IMapper mapper, INotificationService notificationService, ILogger<EmbargoService> logger)
        {
            _repository = repository;
            _recordingRepository = recordingRepository;
            _mapper = mapper;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<ServiceResponse<EmbargoDto>> GetByRecordingIdAsync(Guid recordingId)
        {
            var embargo = await _repository.GetByRecordingIdAsync(recordingId);
            if (embargo == null)
            {
                return new ServiceResponse<EmbargoDto> { Success = false, Message = "Embargo not found for this recording" };
            }

            // Lazy status evaluation
            var newStatus = DetermineStatus(embargo.EmbargoStartDate, embargo.EmbargoEndDate);
            if (newStatus != embargo.Status && embargo.Status != EmbargoStatus.Lifted)
            {
                embargo.Status = newStatus;
                await _repository.UpdateAsync(embargo);
                await SyncRecordingStatusAsync(recordingId, newStatus);
            }

            return new ServiceResponse<EmbargoDto> { Data = _mapper.Map<EmbargoDto>(embargo) };
        }

        public async Task<ServiceResponse<EmbargoDto>> CreateOrUpdateAsync(Guid recordingId, EmbargoCreateUpdateDto dto, Guid userId)
        {
            try
            {
                if (dto.EmbargoStartDate.HasValue && dto.EmbargoEndDate.HasValue && dto.EmbargoStartDate >= dto.EmbargoEndDate)
                {
                    return new ServiceResponse<EmbargoDto> { Success = false, Message = "Start date must be before end date" };
                }

                var embargo = await _repository.GetByRecordingIdAsync(recordingId);
                var status = DetermineStatus(dto.EmbargoStartDate, dto.EmbargoEndDate);

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
                        Status = status
                    };
                    await _repository.AddAsync(embargo);
                }
                else
                {
                    embargo.EmbargoStartDate = dto.EmbargoStartDate;
                    embargo.EmbargoEndDate = dto.EmbargoEndDate;
                    embargo.Reason = dto.Reason;
                    embargo.UpdatedAt = DateTime.UtcNow;
                    embargo.Status = status;
                    await _repository.UpdateAsync(embargo);
                }

                // Sync with Recording Status
                await SyncRecordingStatusAsync(recordingId, status);

                return new ServiceResponse<EmbargoDto> { Success = true, Data = _mapper.Map<EmbargoDto>(embargo) };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create or update embargo for recording {RecordingId}", recordingId);
                return new ServiceResponse<EmbargoDto>
                {
                    Success = false,
                    Message = $"Failed to create or update embargo: {ex.InnerException?.Message ?? ex.Message}"
                };
            }
        }

        public async Task<ServiceResponse<EmbargoDto>> LiftEmbargoAsync(Guid recordingId, EmbargoLiftDto dto)
        {
            var embargo = await _repository.GetByRecordingIdAsync(recordingId);
            if (embargo == null)
            {
                return new ServiceResponse<EmbargoDto> { Success = false, Message = "Embargo not found" };
            }

            if (embargo.Status != EmbargoStatus.Active && embargo.Status != EmbargoStatus.Scheduled)
            {
                return new ServiceResponse<EmbargoDto> { Success = false, Message = "Only Active or Scheduled embargoes can be lifted" };
            }

            embargo.Status = EmbargoStatus.Lifted;
            embargo.Reason = (embargo.Reason ?? "") + " | Lift Reason: " + dto.Reason;
            embargo.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(embargo);
            
            // Sync with Recording Status -> Back to Approved
            await SyncRecordingStatusAsync(recordingId, EmbargoStatus.Lifted);

            // Gửi thông báo cho chủ bản ghi khi embargo được gỡ bỏ
            try
            {
                var recording = await _recordingRepository.GetByIdAsync(recordingId);
                if (recording != null)
                {
                    await _notificationService.SendNotificationAsync(
                        recording.UploadedById,
                        "Embargo đã được gỡ bỏ",
                        $"Bản ghi '{recording.Title}' đã được gỡ embargo và hiện có thể truy cập công khai.",
                        "EmbargoLifted",
                        "Recording",
                        recordingId
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send embargo lifted notification for recording {RecordingId}", recordingId);
            }

            return new ServiceResponse<EmbargoDto> { Data = _mapper.Map<EmbargoDto>(embargo) };
        }

        private async Task SyncRecordingStatusAsync(Guid recordingId, EmbargoStatus embargoStatus)
        {
            var recording = await _recordingRepository.GetByIdAsync(recordingId);
            if (recording != null)
            {
                if (embargoStatus == EmbargoStatus.Active || embargoStatus == EmbargoStatus.Scheduled)
                {
                    recording.Status = SubmissionStatus.Embargoed;
                }
                else if (embargoStatus == EmbargoStatus.Expired || embargoStatus == EmbargoStatus.Lifted)
                {
                    recording.Status = SubmissionStatus.Approved;
                }
                await _recordingRepository.UpdateAsync(recording);
            }
        }

        public async Task<PagedResponse<EmbargoDto>> GetPagedEmbargoesAsync(EmbargoStatus? status, int page, int pageSize, DateTime? from, DateTime? to)
        {
            Expression<Func<Embargo, bool>> predicate = e => 
                (!status.HasValue || e.Status == status.Value) &&
                (!from.HasValue || e.CreatedAt >= from.Value) &&
                (!to.HasValue || e.CreatedAt <= to.Value);

            var (items, totalItems) = await _repository.GetPaginatedAsync(predicate, page, pageSize);

            // Lazy evaluation for the items being returned
            foreach (var embargo in items)
            {
                var newStatus = DetermineStatus(embargo.EmbargoStartDate, embargo.EmbargoEndDate);
                if (newStatus != embargo.Status && embargo.Status != EmbargoStatus.Lifted)
                {
                    embargo.Status = newStatus;
                    await _repository.UpdateAsync(embargo);
                    await SyncRecordingStatusAsync(embargo.RecordingId, newStatus);
                }
            }

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
