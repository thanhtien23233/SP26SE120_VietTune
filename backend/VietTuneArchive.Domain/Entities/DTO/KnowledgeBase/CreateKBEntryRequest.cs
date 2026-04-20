using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Domain.Entities.DTO.KnowledgeBase
{
    public class CreateKBEntryRequest
    {
        [Required, MaxLength(500)]
        public string Title { get; set; }

        [Required]
        public string Content { get; set; }

        [Required]
        public string Category { get; set; }

        public List<CreateKBCitationRequest>? Citations { get; set; }
    }
}
