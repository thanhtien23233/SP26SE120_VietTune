using AutoMapper;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Mapper.DTOs.Request;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.Entities.Enum;
using VietTuneArchive.Domain.IRepositories;

namespace VietTuneArchive.Application.Services
{
    public class CopyrightDisputeService : ICopyrightDisputeService
    {
        private readonly ICopyrightDisputeRepository _repository;
        private readonly IMapper _mapper;
        private readonly INotificationService _notificationService;
        private readonly ILogger<CopyrightDisputeService> _logger;

        public CopyrightDisputeService(ICopyrightDisputeRepository repository, IMapper mapper, INotificationService notificationService, ILogger<CopyrightDisputeService> logger)
        {
            _repository = repository;
            _mapper = mapper;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<ServiceResponse<CopyrightDisputeDto>> CreateDisputeAsync(CreateCopyrightDisputeRequest request)
        {
            try
            {
                var dispute = new CopyrightDispute
                {
                    Id = Guid.NewGuid(),
                    RecordingId = request.RecordingId,
                    SubmissionId = request.SubmissionId,
                    ReportedByUserId = request.ReportedByUserId,
                    Description = request.Description,
                    EvidenceUrls = request.EvidenceUrls,
                    CreatedAt = DateTime.UtcNow,
                    Status = CopyrightDisputeStatus.Pending
                };

                if (Enum.TryParse<CopyrightDisputeReason>(request.ReasonCode, true, out var reason))
                {
                    dispute.ReasonCode = reason;
                }
                else
                {
                    dispute.ReasonCode = CopyrightDisputeReason.Other;
                }

                await _repository.AddAsync(dispute);
                return new ServiceResponse<CopyrightDisputeDto>
                {
                    Success = true,
                    Data = _mapper.Map<CopyrightDisputeDto>(dispute),
                    Message = "Dispute created successfully"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create copyright dispute");
                return new ServiceResponse<CopyrightDisputeDto>
                {
                    Success = false,
                    Message = $"Failed to create dispute: {ex.InnerException?.Message ?? ex.Message}"
                };
            }
        }

        public async Task<PagedResponse<CopyrightDisputeDto>> ListDisputesAsync(
            CopyrightDisputeStatus? status,
            Guid? assignedReviewerId,
            Guid? recordingId,
            int page,
            int pageSize)
        {
            var (data, total) = await _repository.GetPagedAsync(status, assignedReviewerId, recordingId, page, pageSize);
            return new PagedResponse<CopyrightDisputeDto>
            {
                Success = true,
                Data = _mapper.Map<List<CopyrightDisputeDto>>(data),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<ServiceResponse<CopyrightDisputeDto>> GetDisputeDetailAsync(Guid disputeId)
        {
            var dispute = await _repository.GetByIdWithDetailsAsync(disputeId);
            if (dispute == null) return new ServiceResponse<CopyrightDisputeDto> { Success = false, Message = "Dispute not found" };

            return new ServiceResponse<CopyrightDisputeDto> 
            { 
                Success = true,
                Data = _mapper.Map<CopyrightDisputeDto>(dispute) 
            };
        }

        public async Task<ServiceResponse<bool>> AssignReviewerAsync(Guid disputeId, AssignReviewerRequest request)
        {
            var dispute = await _repository.GetByIdAsync(disputeId);
            if (dispute == null) return new ServiceResponse<bool> { Success = false, Message = "Dispute not found" };

            dispute.AssignedReviewerId = request.ReviewerId;
            dispute.Status = CopyrightDisputeStatus.Assigned;
            dispute.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(dispute);
            return new ServiceResponse<bool> { Success = true, Data = true, Message = "Reviewer assigned successfully" };
        }

        public async Task<ServiceResponse<bool>> ResolveDisputeAsync(Guid disputeId, ResolveDisputeRequest request)
        {
            var dispute = await _repository.GetByIdAsync(disputeId);
            if (dispute == null) return new ServiceResponse<bool> { Success = false, Message = "Dispute not found" };

            if (Enum.TryParse<CopyrightDisputeResolution>(request.Resolution.Replace("_", ""), true, out var resolution))
            {
                dispute.Resolution = resolution;
            }
            
            dispute.ResolutionNotes = request.ResolutionNotes;
            dispute.Status = CopyrightDisputeStatus.Resolved;
            dispute.ResolvedAt = DateTime.UtcNow;
            dispute.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(dispute);

            // Gửi thông báo cho người báo cáo khi tranh chấp được giải quyết
            try
            {
                await _notificationService.SendNotificationAsync(
                    dispute.ReportedByUserId,
                    "Tranh chấp bản quyền đã được giải quyết",
                    $"Tranh chấp bản quyền của bạn đã được giải quyết. Kết quả: {request.Resolution}.",
                    "DisputeResolved",
                    "CopyrightDispute",
                    disputeId
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send dispute resolved notification for dispute {DisputeId}", disputeId);
            }

            return new ServiceResponse<bool> { Success = true, Data = true, Message = "Dispute resolved successfully" };
        }

        public async Task<ServiceResponse<string>> AddEvidenceAsync(Guid disputeId, string fileUrl)
        {
            var dispute = await _repository.GetByIdAsync(disputeId);
            if (dispute == null) return new ServiceResponse<string> { Success = false, Message = "Dispute not found" };

            dispute.EvidenceUrls.Add(fileUrl);
            dispute.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(dispute);
            return new ServiceResponse<string> { Success = true, Data = fileUrl, Message = "Evidence added successfully" };
        }
    }
}
