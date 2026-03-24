using GenerativeAI.Types;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace VietTuneArchive.Application.IServices
{
    public interface IEnumProviderService
    {
        Dictionary<string, string[]> GetAllEnums();
        Schema BuildAISchema();
        string GetSystemPrompt();
        string GetJsonSchema();
    }
}
