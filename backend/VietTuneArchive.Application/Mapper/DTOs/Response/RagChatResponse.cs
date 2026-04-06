using System;
using System.Collections.Generic;

namespace VietTuneArchive.Application.Mapper.DTOs.Response
{
    public class RagChatResponse
    {
        public class RagConversationResponse
        {
            public Guid Id { get; set; }
            public string? Title { get; set; }
            public DateTime CreatedAt { get; set; }
            public List<RagChatMessageResponse> Messages { get; set; } = new();
        }

        public class RagChatMessageResponse
        {
            public Guid Id { get; set; }
            public int Role { get; set; }  // 0=User, 1=Assistant
            public string Content { get; set; } = default!;
            public List<SourceReference>? Sources { get; set; }
            public decimal? ConfidenceScore { get; set; }
            public DateTime CreatedAt { get; set; }
        }

        public class SourceReference
        {
            public string Type { get; set; } = default!;  // "Recording", "KBEntry", "Instrument"
            public Guid Id { get; set; }
            public string Title { get; set; } = default!;
        }

        public class RetrievedDocument
        {
            public string SourceType { get; set; } = default!; // Recording/KBEntry/Instrument
            public Guid SourceId { get; set; }
            public string Title { get; set; } = default!;
            public string Content { get; set; } = default!;
            public double RelevanceScore { get; set; }
        }
    }
}
