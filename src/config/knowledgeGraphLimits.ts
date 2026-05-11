/**
 * Client-side knowledge graph build runs on the main thread. Cap source recordings to avoid freezes.
 * When exceeded, {@link KnowledgeGraphData.recordingInputTruncated} is set and only the first N are used.
 */
export const KNOWLEDGE_GRAPH_MAX_SOURCE_RECORDINGS = 1000;
