using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using System.Net.Http.Headers;
using System.Text.Json;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.Services
{
    public class InstrumentDetectionService : IInstrumentDetectionService
    {
        private const float DETECTION_THRESHOLD = 0.10f;
        private const float FRAME_DURATION = 0.96f;
        private const float FRAME_HOP = 0.48f;
        private const string BACKGROUND_CLASS = "background";
        private const float CONFIDENCE_THRESHOLD = 0.70f;

        private static InferenceSession? _classifierSession;
        private static string[]? _classNames;
        private static string? _classifierInputName;
        private static readonly object _lock = new object();

        private readonly HttpClient _httpClient;
        private readonly ILogger<InstrumentDetectionService> _logger;

        public InstrumentDetectionService(HttpClient httpClient, IWebHostEnvironment env, ILogger<InstrumentDetectionService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;

            if (_classifierSession == null)
            {
                lock (_lock)
                {
                    if (_classifierSession == null)
                    {
                        Initialize(env);
                    }
                }
            }
        }

        private void Initialize(IWebHostEnvironment env)
        {
            try
            {
                var onnxPath = Path.Combine(env.ContentRootPath, "Models", "AI", "instrument_detector.onnx");
                var classNamesPath = Path.Combine(env.ContentRootPath, "Models", "AI", "class_names.txt");

                if (File.Exists(onnxPath))
                {
                    var options = new SessionOptions { GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL };
                    _classifierSession = new InferenceSession(onnxPath, options);
                    _classifierInputName = _classifierSession.InputMetadata.Keys.First();
                    _logger.LogInformation("Classifier loaded. Input name: {inputName}", _classifierInputName);
                }
                else
                {
                    _logger.LogWarning("ONNX classifier not found at {onnxPath}", onnxPath);
                }

                if (File.Exists(classNamesPath))
                {
                    _classNames = File.ReadAllLines(classNamesPath)
                                      .Where(l => !string.IsNullOrWhiteSpace(l))
                                      .Select(l => l.Trim())
                                      .ToArray();
                    _logger.LogInformation("Loaded {count} classes: [{classes}]", _classNames.Length, string.Join(", ", _classNames));
                }
                else
                {
                    _classNames = Array.Empty<string>();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing static ONNX resources in InstrumentDetectionService");
                _classNames = Array.Empty<string>();
            }
        }

        public string[] SupportedInstruments => _classNames ?? Array.Empty<string>();

        public async Task<MultiInstrumentDetectionResponse> DetectMultipleInstrumentsAsync(Stream audioStream, string fileName)
        {
            if (_classifierSession == null)
            {
                throw new InvalidOperationException("Classifier session is not initialized. Check model folder and logs.");
            }

            // Ensure we are at the beginning of the stream if possible
            if (audioStream.CanSeek) audioStream.Position = 0;

            // GỌI PYTHON FASTAPI
            using var content = new MultipartFormDataContent();
            
            // Read stream into byte array for HttpClient
            byte[] byteArray;
            if (audioStream is MemoryStream ms)
            {
                byteArray = ms.ToArray();
            }
            else
            {
                using var memoryStream = new MemoryStream();
                await audioStream.CopyToAsync(memoryStream);
                byteArray = memoryStream.ToArray();
            }

            using var streamContent = new ByteArrayContent(byteArray);
            streamContent.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");
            content.Add(streamContent, "file", fileName);

            _logger.LogInformation("Sending audio analysis request to embedding service for {fileName} ({size} bytes)", fileName, byteArray.Length);
            var httpResponse = await _httpClient.PostAsync("/extract-embeddings", content);
            
            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorBody = await httpResponse.Content.ReadAsStringAsync();
                _logger.LogError("Embedding service returned error: {code} - {body}", httpResponse.StatusCode, errorBody);
                throw new Exception($"Embedding service failed: {httpResponse.StatusCode}");
            }

            var json = await httpResponse.Content.ReadAsStringAsync();
            
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var yamnetResponse = JsonSerializer.Deserialize<YamNetEmbeddingResponse>(json, options);

            if (yamnetResponse == null || yamnetResponse.Embeddings == null)
            {
                throw new Exception("Invalid response from embedding service.");
            }

            _logger.LogInformation("Received {count} embeddings from YAMNet service", yamnetResponse.Embeddings.Count);

            // CHẠY ONNX CLASSIFIER cho mỗi embedding
            var chunkResults = new List<ChunkResult>();

            for (int i = 0; i < yamnetResponse.Embeddings.Count; i++)
            {
                float[] embedding = yamnetResponse.Embeddings[i].ToArray();

                if (embedding.Length != 1024)
                {
                    _logger.LogWarning("Received embedding with length {length} instead of 1024 at chunk {index}. Skipping.", embedding.Length, i);
                    continue;
                }

                // Tensor [1, 1024]
                var tensor = new DenseTensor<float>(embedding, new[] { 1, 1024 });
                var inputs = new List<NamedOnnxValue>
                {
                    NamedOnnxValue.CreateFromTensor(_classifierInputName, tensor)
                };

                using var results = _classifierSession.Run(inputs);
                float[] scores = results.First().AsEnumerable<float>().ToArray();

                // Argmax
                int topIdx = Array.IndexOf(scores, scores.Max());
                if (scores[topIdx] >= CONFIDENCE_THRESHOLD)
                {
                    chunkResults.Add(new ChunkResult
                    {
                        ChunkIndex = i,
                        StartSeconds = i * FRAME_HOP,
                        EndSeconds = i * FRAME_HOP + FRAME_DURATION,
                        PredictedInstrument = (topIdx >= 0 && topIdx < (_classNames?.Length ?? 0)) ? _classNames![topIdx] : "unknown",
                        Confidence = scores[topIdx],
                    });
                }
            }

            // AGGREGATE
            return AggregateResults(chunkResults, yamnetResponse.DurationSeconds);
        }

        private MultiInstrumentDetectionResponse AggregateResults(List<ChunkResult> chunks, float duration)
        {
            if (chunks.Count == 0)
            {
                return new MultiInstrumentDetectionResponse
                {
                    TotalChunks = 0,
                    AudioDurationSeconds = duration,
                    DetectionThreshold = DETECTION_THRESHOLD,
                    PrimaryInstrument = "unknown"
                };
            }

            // Group chunks by PredictedInstrument
            var instrumentSummaries = chunks
                .GroupBy(c => c.PredictedInstrument)
                .Select(group => new DetectedInstrumentSummary
                {
                    InstrumentName = group.Key,
                    ChunkCount = group.Count(),
                    TotalChunks = chunks.Count,
                    Percentage = group.Count() / (float)chunks.Count,
                    AverageConfidence = group.Average(c => c.Confidence),
                    Segments = MergeConsecutiveChunks(group)
                })
                .Where(summary => summary.InstrumentName != BACKGROUND_CLASS && summary.Percentage >= DETECTION_THRESHOLD)
                .OrderByDescending(summary => summary.Percentage)
                .ToList();

            var response = new MultiInstrumentDetectionResponse
            {
                DetectedInstruments = instrumentSummaries,
                PrimaryInstrument = instrumentSummaries.FirstOrDefault()?.InstrumentName ?? "unknown",
                TotalChunks = chunks.Count,
                AudioDurationSeconds = duration,
                DetectionThreshold = DETECTION_THRESHOLD,
                Timeline = chunks
            };

            return response;
        }

        private List<TimeSegment> MergeConsecutiveChunks(IEnumerable<ChunkResult> chunks)
        {
            var segments = new List<TimeSegment>();
            var sorted = chunks.OrderBy(c => c.ChunkIndex).ToList();

            if (sorted.Count == 0) return segments;

            TimeSegment current = new TimeSegment
            {
                StartSeconds = sorted[0].StartSeconds,
                EndSeconds = sorted[0].EndSeconds
            };

            for (int i = 1; i < sorted.Count; i++)
            {
                if (sorted[i].ChunkIndex == sorted[i-1].ChunkIndex + 1 || Math.Abs(sorted[i].StartSeconds - sorted[i-1].EndSeconds) < 0.1f)
                {
                    current.EndSeconds = sorted[i].EndSeconds;
                }
                else
                {
                    current.DurationSeconds = (float)Math.Round(current.EndSeconds - current.StartSeconds, 2);
                    segments.Add(current);

                    current = new TimeSegment
                    {
                        StartSeconds = sorted[i].StartSeconds,
                        EndSeconds = sorted[i].EndSeconds
                    };
                }
            }

            current.DurationSeconds = (float)Math.Round(current.EndSeconds - current.StartSeconds, 2);
            segments.Add(current);

            return segments;
        }

        public void Dispose()
        {
            // Note: Since _classifierSession is static, it stays across instances.
            // Disposal should usually be handled by a container, but singleton behavior means it lives for app life.
        }
    }
}
