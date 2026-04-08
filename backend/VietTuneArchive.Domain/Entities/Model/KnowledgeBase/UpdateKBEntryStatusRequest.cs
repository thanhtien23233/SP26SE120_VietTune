using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Application.DTOs.KnowledgeBase
{
    public class UpdateKBEntryStatusRequest
    {
        [Required]
        public int Status { get; set; }
    }
}
