using System;

namespace VietTuneArchive.Application.DTOs.KnowledgeBase
{
    public class KBRevisionResponse
    {
        public Guid Id { get; set; }
        public Guid EntryId { get; set; }
        public KBAuthorResponse Editor { get; set; }
        public string? RevisionNote { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
