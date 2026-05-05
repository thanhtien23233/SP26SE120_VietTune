import { useState } from 'react';

import type { DetectedInstrument, MetadataSuggestion } from '@/types/instrumentDetection';

/**
 * Advisory-only state from upload-time AI (Gemini analyze-*).
 * Contributor form fields live in `useUploadForm`; this hook must not be treated as form metadata.
 */
export function useUploadAiAdvisory() {
  const [instrumentPredictions, setInstrumentPredictions] = useState<DetectedInstrument[]>([]);
  const [aiMetadataSuggestions, setAiMetadataSuggestions] = useState<MetadataSuggestion[]>([]);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);

  return {
    instrumentPredictions,
    setInstrumentPredictions,
    aiMetadataSuggestions,
    setAiMetadataSuggestions,
    aiAnalysisLoading,
    setAiAnalysisLoading,
    aiAnalysisError,
    setAiAnalysisError,
  };
}
