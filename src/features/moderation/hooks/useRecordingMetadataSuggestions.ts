import { useEffect, useMemo, useState } from 'react';

import { PROVINCE_REGION_CODE_TO_NAME } from '@/config/provinceRegionCodes';
import { instrumentDetectionFlags, instrumentDetectionService } from '@/services/instrumentDetectionService';
import { referenceDataService } from '@/services/referenceDataService';
import type { MetadataSuggestion } from '@/types/instrumentDetection';
import { mapInstrumentsToMetadataSuggestions } from '@/utils/instrumentMetadataMapper';

type UseRecordingMetadataSuggestionsResult = {
  suggestions: MetadataSuggestion[];
  loading: boolean;
  error: string | null;
};

const UPLOAD_MACRO_REGION_LABELS = Object.values(PROVINCE_REGION_CODE_TO_NAME).sort();

/**
 * Loads reference data + cached `analyzeRecording` result, then maps to metadata suggestions.
 */
export function useRecordingMetadataSuggestions(
  recordingId: string | undefined,
  enabled: boolean,
): UseRecordingMetadataSuggestionsResult {
  const [suggestions, setSuggestions] = useState<MetadataSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableRegions = useMemo(() => UPLOAD_MACRO_REGION_LABELS, []);

  useEffect(() => {
    if (!enabled || !recordingId || !instrumentDetectionFlags.confidenceEnabled) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [analysis, ethnicGroups, instruments, vocalStyles] = await Promise.all([
          instrumentDetectionService.analyzeRecording(recordingId),
          referenceDataService.getEthnicGroups(),
          referenceDataService.getInstruments(),
          referenceDataService.getVocalStyles(),
        ]);
        if (cancelled) return;
        const mapped = mapInstrumentsToMetadataSuggestions({
          detected: analysis.instruments ?? [],
          instrumentsData: instruments,
          ethnicGroupsData: ethnicGroups,
          vocalStylesData: vocalStyles,
          availableRegions,
        });
        setSuggestions(mapped);
      } catch {
        if (!cancelled) {
          setError('Không tải được gợi ý metadata.');
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, recordingId, availableRegions]);

  return { suggestions, loading, error };
}
