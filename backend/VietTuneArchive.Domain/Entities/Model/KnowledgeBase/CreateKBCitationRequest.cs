using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Application.DTOs.KnowledgeBase
{
    public class CreateKBCitationRequest
    {
        [Required, MaxLength(1000)]
        public string Citation { get; set; }

        [MaxLength(500)]
        public string? Url { get; set; }
    }
}
