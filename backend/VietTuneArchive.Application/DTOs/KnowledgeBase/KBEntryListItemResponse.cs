using System;

namespace VietTuneArchive.Application.DTOs.KnowledgeBase
{
    public class KBEntryListItemResponse
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Slug { get; set; }
        public string Category { get; set; }
        public int Status { get; set; }
        public KBAuthorResponse Author { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
