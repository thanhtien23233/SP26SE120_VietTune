using System;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class EmbargoDto
    {
        public Guid RecordingId { get; set; }
        public EmbargoStatus Status { get; set; }
        public DateTime? EmbargoStartDate { get; set; }
        public DateTime? EmbargoEndDate { get; set; }
        public string? Reason { get; set; }
        public Guid CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class EmbargoCreateUpdateDto
    {
        public DateTime? EmbargoStartDate { get; set; }
        public DateTime? EmbargoEndDate { get; set; }
        public string? Reason { get; set; }
    }

    public class EmbargoLiftDto
    {
        public string? Reason { get; set; }
    }
}
