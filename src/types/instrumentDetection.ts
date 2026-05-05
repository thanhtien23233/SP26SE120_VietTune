/** One instrument row from AI analyze (`id`, `name`, `confidence`) or aligned ML payloads. */
export interface DetectedInstrument {
  id?: string;
  name: string;
  confidence: number | null;
}

export interface AudioAnalysisInfo {
  filename: string | null;
  duration_seconds: number;
  analyzed_duration: number;
  num_frames: number;
  sample_rate: number;
}

export interface InstrumentTimeSegment {
  instrument: string;
  start_seconds: number;
  end_seconds: number;
  num_frames: number;
}

export interface InstrumentDetectionResult {
  instruments: DetectedInstrument[];
  timeline: InstrumentTimeSegment[] | null;
  audio_info: AudioAnalysisInfo | null;
}

/** Field targeted by rule-based / DB-joined metadata suggestions after instrument detection. */
export type MetadataSuggestionField = 'ethnicity' | 'region' | 'vocalStyle' | 'eventType';

/** One display-level suggestion derived from a detected instrument (human must confirm). */
export interface MetadataSuggestion {
  field: MetadataSuggestionField;
  value: string;
  sourceInstrument: string;
  confidence: number;
}

/** Advisory-only candidate for grouped metadata suggestion UX. */
export type MetadataSuggestionCandidate = {
  value: string;
  label: string;
  score: number;
  sourceInstrument?: string;
  sourceInstruments?: string[];
};

/** Advisory-only grouped suggestion used by Upload Step 1/2 UI. */
export type AdvisoryMetadataSuggestionField = 'region' | 'genre' | 'ethnicGroup' | 'eventType';

export type AdvisoryMetadataSuggestion = {
  field: AdvisoryMetadataSuggestionField;
  candidates: MetadataSuggestionCandidate[];
  conflictDetected: boolean;
  requiresExpert: boolean;
};
