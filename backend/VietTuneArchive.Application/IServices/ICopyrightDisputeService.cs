using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Application.Mapper.DTOs.Request;
using VietTuneArchive.Application.Responses;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Application.IServices
{
    public interface ICopyrightDisputeService
    {
        Task<ServiceResponse<CopyrightDisputeDto>> CreateDisputeAsync(CreateCopyrightDisputeRequest request);
        Task<PagedResponse<CopyrightDisputeDto>> ListDisputesAsync(
            CopyrightDisputeStatus? status,
            Guid? assignedReviewerId,
            Guid? recordingId,
            int page,
            int pageSize);
        Task<ServiceResponse<CopyrightDisputeDto>> GetDisputeDetailAsync(Guid disputeId);
        Task<ServiceResponse<bool>> AssignReviewerAsync(Guid disputeId, AssignReviewerRequest request);
        Task<ServiceResponse<bool>> ResolveDisputeAsync(Guid disputeId, ResolveDisputeRequest request);
        Task<ServiceResponse<string>> AddEvidenceAsync(Guid disputeId, string fileUrl);
    }
}
