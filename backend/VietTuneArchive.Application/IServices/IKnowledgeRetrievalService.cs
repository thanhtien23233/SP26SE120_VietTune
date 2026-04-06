using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using static VietTuneArchive.Application.Mapper.DTOs.Response.RagChatResponse;

namespace VietTuneArchive.Application.IServices
{
    public interface IKnowledgeRetrievalService
    {
        Task<List<RetrievedDocument>> RetrieveAsync(string question, int maxResults = 10);
    }
}
