using System.ComponentModel.DataAnnotations;

namespace VietTuneArchive.Application.DTOs.KnowledgeBase
{
    public class UpdateKBEntryRequest
    {
        [Required, MaxLength(500)]
        public string Title { get; set; }

        [Required]
        public string Content { get; set; }

        public string Category { get; set; }

        [MaxLength(500)]
        public string? RevisionNote { get; set; }
    }
}
