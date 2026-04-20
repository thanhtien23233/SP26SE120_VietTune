using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Domain.Entities.DTO.KnowledgeBase
{
    public class CreateKBCitationRequest
    {
        [Required, MaxLength(1000)]
        public string Citation { get; set; }

        [MaxLength(500)]
        public string? Url { get; set; }
    }
}
