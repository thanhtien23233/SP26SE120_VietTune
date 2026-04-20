using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Domain.Entities.DTO.KnowledgeBase
{
    public class UpdateKBEntryStatusRequest
    {
        [Required]
        public int Status { get; set; }
    }
}
