using GenerativeAI.Types;
using Microsoft.AspNetCore.Hosting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using VietTuneArchive.Application.IServices;

namespace VietTuneArchive.Application.Services
{
    public class EnumProviderService : IEnumProviderService
    {
        private readonly Dictionary<string, string[]> _enums;
        private readonly string _systemPrompt;
        private readonly string _jsonSchema;
        public EnumProviderService(IWebHostEnvironment env)
        {
            var assetsPath = Path.Combine(env.ContentRootPath, "Assets");
            var enumsPath = Path.Combine(assetsPath, "enums.txt");
            var promptPath = Path.Combine(assetsPath, "system_prompt.txt");
            var schemaPath = Path.Combine(assetsPath, "music_schema.txt");

            _enums = LoadEnumsFromTxt(enumsPath);
            _systemPrompt = LoadPromptFromTxt(promptPath);

            if (File.Exists(schemaPath))
            {
                _jsonSchema = File.ReadAllText(schemaPath, Encoding.UTF8).Trim();
            }
            else
            {
                throw new FileNotFoundException("music_schema.txt not found", schemaPath);
            }
        }

        public Dictionary<string, string[]> GetAllEnums() => _enums;
        public string GetSystemPrompt() => _systemPrompt;

        private static Dictionary<string, string[]> LoadEnumsFromTxt(string path)
        {
            var dict = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

            if (!File.Exists(path))
                throw new FileNotFoundException("enums.txt not found", path);

            foreach (var raw in File.ReadAllLines(path, Encoding.UTF8))
            {
                var line = raw.Trim();
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;

                var parts = line.Split(':', 2);
                if (parts.Length != 2) continue;

                var key = parts[0].Trim().ToUpperInvariant();
                var values = parts[1]
                    .Split('|', StringSplitOptions.RemoveEmptyEntries)
                    .Select(v => v.Trim())
                    .Where(v => v.Length > 0)
                    .ToArray();

                if (values.Length > 0)
                    dict[key] = values;
            }

            return dict;
        }

        private static string LoadPromptFromTxt(string path)
        {
            if (!File.Exists(path))
                throw new FileNotFoundException("system_prompt.txt not found", path);

            return File.ReadAllText(path, Encoding.UTF8).Trim();
        }

        public Schema BuildAISchema()
        {
            return new Schema
            {
                Type = "object",
                Properties = _enums.ToDictionary(
                    kvp => kvp.Key,
                    kvp => new Schema { Type = "string", Enum = kvp.Value.ToList() }
                )
            };
        }
        public string GetJsonSchema() => _jsonSchema;
    }
}
