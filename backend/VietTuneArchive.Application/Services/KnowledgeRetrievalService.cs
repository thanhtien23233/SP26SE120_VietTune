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

            float[] questionVector = null;
            // 1. Semantic Search for Recordings and KBEntries
            try
            {
                questionVector = await _embeddingService.GetEmbeddingAsync(question);
                
                // 1a. Similar Recordings
                var similarRecordings = await _embeddingService.SearchSimilarRecordingsAsync(questionVector, 5);
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

                // 1b. Similar KBEntries
                var similarKBs = await _embeddingService.SearchSimilarKBEntriesAsync(questionVector, 5);
                foreach (var kbMatch in similarKBs)
                {
                    var kb = await _context.KBEntries.FirstOrDefaultAsync(k => k.Id == kbMatch.EntryId && k.Status == 1);
                    if (kb != null)
                    {
                        docs.Add(new RetrievedDocument
                        {
                            SourceType = "KBEntry",
                            SourceId = kb.Id,
                            Title = kb.Title,
                            Content = kb.Content.Length > 500 ? kb.Content.Substring(0, 500) : kb.Content,
                            RelevanceScore = kbMatch.Score
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Embedding search failed: {ex.Message}");
            }

            // 2. Fallback: Keyword-based search in KBEntries (if semantic search didn't find enough)
            if (docs.Count(d => d.SourceType == "KBEntry") < 3)
            {
                var existingKbIds = docs.Where(d => d.SourceType == "KBEntry").Select(d => d.SourceId).ToList();
                
                var kbEntries = await _context.KBEntries
                    .Where(kb => kb.Status == 1 && !existingKbIds.Contains(kb.Id) && 
                                (kb.Title.ToLower().Contains(lowerQuery) || lowerQuery.Contains(kb.Title.ToLower())))
                    .Take(3)
                    .ToListAsync();

                foreach (var kb in kbEntries)
                {
                    docs.Add(new RetrievedDocument
                    {
                        SourceType = "KBEntry",
                        SourceId = kb.Id,
                        Title = kb.Title,
                        Content = kb.Content.Substring(0, Math.Min(kb.Content.Length, 500)),
                        RelevanceScore = 0.5 // Lower score for keyword match fallback
                    });
                }
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
