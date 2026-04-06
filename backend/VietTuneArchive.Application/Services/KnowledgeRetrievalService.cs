using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Context;
using static VietTuneArchive.Application.Mapper.DTOs.Response.RagChatResponse;

namespace VietTuneArchive.Application.Services
{
    public class KnowledgeRetrievalService : IKnowledgeRetrievalService
    {
        private readonly DBContext _context;
        private readonly IEmbeddingService _embeddingService;

        public KnowledgeRetrievalService(DBContext context, IEmbeddingService embeddingService)
        {
            _context = context;
            _embeddingService = embeddingService;
        }

        public async Task<List<RetrievedDocument>> RetrieveAsync(string question, int maxResults = 10)
        {
            var docs = new List<RetrievedDocument>();
            var lowerQuery = question.ToLower();

            // 1. Semantic Search for Recordings
            try
            {
                var questionVector = await _embeddingService.GetEmbeddingAsync(question);
                var similarRecordings = await _embeddingService.SearchSimilarAsync(questionVector, 5);
                
                foreach (var recMatch in similarRecordings)
                {
                    var rec = await _context.Recordings
                        .Include(r => r.EthnicGroup)
                        .Include(r => r.Ceremony)
                        .FirstOrDefaultAsync(r => r.Id == recMatch.RecordingId);
                        
                    if (rec != null)
                    {
                        docs.Add(new RetrievedDocument
                        {
                            SourceType = "Recording",
                            SourceId = rec.Id,
                            Title = rec.Title ?? "Unknown Recording",
                            Content = $"Id: {rec.Id}, Mo ta: {rec.Description}, Dan toc: {rec.EthnicGroup?.Name}, Nghi le: {rec.Ceremony?.Name}",
                            RelevanceScore = recMatch.Score
                        });
                    }
                }
            }
            catch
            {
                // Fallback to text search if embedding fails
            }

            // 2. Full-text search in KBEntries
            var kbEntries = await _context.KBEntries
                .Where(kb => kb.Status == 1 && (kb.Title.ToLower().Contains(lowerQuery) || kb.Content.ToLower().Contains(lowerQuery)))
                .Take(5)
                .ToListAsync();

            foreach (var kb in kbEntries)
            {
                docs.Add(new RetrievedDocument
                {
                    SourceType = "KBEntry",
                    SourceId = kb.Id,
                    Title = kb.Title,
                    Content = kb.Content.Substring(0, Math.Min(kb.Content.Length, 500)),
                    RelevanceScore = 0.8
                });
            }

            // 3. Instruments
            var instruments = await _context.Instruments
                .Where(i => i.Name.ToLower().Contains(lowerQuery) || (i.Description != null && i.Description.ToLower().Contains(lowerQuery)))
                .Take(3)
                .ToListAsync();
            
            foreach (var inst in instruments)
            {
                docs.Add(new RetrievedDocument
                {
                    SourceType = "Instrument",
                    SourceId = inst.Id,
                    Title = inst.Name,
                    Content = $"Phan loai: {inst.Category}, Mo ta: {inst.Description}",
                    RelevanceScore = 0.7
                });
            }

            return docs.OrderByDescending(d => d.RelevanceScore).Take(maxResults).ToList();
        }
    }
}
