using System;

namespace VietTuneArchive.Application.DTOs.KnowledgeBase
{
    public class KBCitationResponse
    {
        public Guid Id { get; set; }
        public string Citation { get; set; }
        public string? Url { get; set; }
    }
}
