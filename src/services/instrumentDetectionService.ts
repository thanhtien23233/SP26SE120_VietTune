import { apiFetchLoose, apiOk, asApiEnvelope } from '@/api';
import { legacyPost } from '@/api/legacyHttp';
import { logServiceWarn } from '@/services/serviceLogger';
import type {
  AudioAnalysisInfo,
  DetectedInstrument,
  InstrumentDetectionResult,
  InstrumentTimeSegment,
} from '@/types/instrumentDetection';
import { mapInstrumentDetectionRow, peelAiAnalysisEnvelope } from '@/utils/mapInstrumentDetectionRow';

const FEATURE_FLAG_INSTRUMENT_CONFIDENCE = String(
  import.meta.env.VITE_INSTRUMENT_CONFIDENCE ?? 'true',
).toLowerCase() === 'true';
const FEATURE_FLAG_INSTRUMENT_DETECTION_MOCK = String(
  import.meta.env.VITE_INSTRUMENT_DETECTION_MOCK ?? 'false',
).toLowerCase() === 'true';

type ServiceResponse<T> = {
  success?: boolean;
  message?: string | null;
  data?: T | null;
  errors?: string[] | null;
};

type ApiAudioAnalyzePayload = {
  instruments?: unknown;
  timeline?: unknown;
  audio_info?: unknown;
  audioInfo?: unknown;
};

type InstrumentDetectionApiClient = {
  GET: (path: string, init?: unknown) => Promise<unknown>;
  POST: (path: string, init?: unknown) => Promise<unknown>;
};

const mockAnalyzeResult: InstrumentDetectionResult = {
  instruments: [
    { id: 'mock-1', name: 'Dan tranh', confidence: 0.92 },
    { id: 'mock-2', name: 'Sao truc', confidence: 0.68 },
    { id: 'mock-3', name: 'Dan bau', confidence: 0.33 },
  ],
  timeline: null,
  audio_info: {
    filename: 'mock.wav',
    duration_seconds: 120,
    analyzed_duration: 120,
    num_frames: 197,
    sample_rate: 44100,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapTimelineSegment(raw: unknown): InstrumentTimeSegment | null {
  if (!isRecord(raw)) return null;
  const instrument = asString(raw.instrument);
  if (!instrument) return null;
  return {
    instrument,
    start_seconds: asNumber(raw.start_seconds),
    end_seconds: asNumber(raw.end_seconds),
    num_frames: asNumber(raw.num_frames),
  };
}

function mapAudioInfo(raw: unknown): AudioAnalysisInfo | null {
  if (!isRecord(raw)) return null;
  return {
    filename: typeof raw.filename === 'string' ? raw.filename : null,
    duration_seconds: asNumber(raw.duration_seconds),
    analyzed_duration: asNumber(raw.analyzed_duration),
    num_frames: asNumber(raw.num_frames),
    sample_rate: asNumber(raw.sample_rate),
  };
}

function normalizeAnalyzeResult(raw: unknown): InstrumentDetectionResult {
  const payload = (isRecord(raw) ? raw : {}) as ApiAudioAnalyzePayload;
  const rawInstruments = Array.isArray(payload.instruments)
    ? payload.instruments
    : extractInstrumentsArray(raw);
  const instruments = rawInstruments
    .map(mapInstrumentDetectionRow)
    .filter((item): item is DetectedInstrument => !!item);
  const timelineSource = Array.isArray(payload.timeline) ? payload.timeline : null;
  const timeline = timelineSource
    ? timelineSource.map(mapTimelineSegment).filter((item): item is InstrumentTimeSegment => !!item)
    : null;

  return {
    instruments,
    timeline,
    audio_info: mapAudioInfo(payload.audio_info ?? payload.audioInfo),
  };
}

function extractInstrumentsArray(raw: unknown): unknown[] {
  const r = isRecord(raw) ? raw : null;
  if (!r) return [];
  if (Array.isArray(r.instruments)) return r.instruments;
  const d = isRecord(r.data) ? r.data : null;
  if (d && Array.isArray(d.instruments)) return d.instruments;
  if (d) {
    const dd = isRecord(d.data) ? d.data : null;
    if (dd && Array.isArray(dd.instruments)) return dd.instruments;
  }
  const v = isRecord(r.value) ? r.value : null;
  if (v && Array.isArray(v.instruments)) return v.instruments;
  return [];
}

function normalizeAiAnalyzeOnlyResponse(raw: unknown): InstrumentDetectionResult {
  const peeled = peelAiAnalysisEnvelope(raw);
  const source = peeled ?? (isRecord(raw) ? raw : null);
  const rawInstruments = Array.isArray(source?.instruments)
    ? source.instruments
    : extractInstrumentsArray(raw);
  const instruments = rawInstruments
    .map(mapInstrumentDetectionRow)
    .filter((item): item is DetectedInstrument => !!item);
  return {
    instruments,
    timeline: null,
    audio_info: null,
  };
}

function unwrapServiceData<T>(raw: unknown): T | null {
  if (!isRecord(raw)) return null;
  if ('data' in raw) return (raw as ServiceResponse<T>).data ?? null;
  return raw as T;
}

/** In-memory cache for `analyzeRecording` (shared with moderation + researcher flows). */
const recordingAnalyzeCache = new Map<string, InstrumentDetectionResult>();

export function createInstrumentDetectionService(client: InstrumentDetectionApiClient) {
  return {
    /**
     * Gemini analyze-only (multipart). Replaces deprecated `POST /api/audio-analysis/detect-instruments`.
     */
    analyzeOnlyFromFile: async (
      file: File,
      options?: { timeout?: number },
    ): Promise<InstrumentDetectionResult> => {
      if (!FEATURE_FLAG_INSTRUMENT_CONFIDENCE) {
        return { instruments: [], timeline: null, audio_info: null };
      }
      if (FEATURE_FLAG_INSTRUMENT_DETECTION_MOCK) {
        const mockInfo = mockAnalyzeResult.audio_info;
        return {
          ...mockAnalyzeResult,
          audio_info: {
            filename: file?.name ?? mockInfo?.filename ?? null,
            duration_seconds: mockInfo?.duration_seconds ?? 0,
            analyzed_duration: mockInfo?.analyzed_duration ?? 0,
            num_frames: mockInfo?.num_frames ?? 0,
            sample_rate: mockInfo?.sample_rate ?? 0,
          },
        };
      }
      const form = new FormData();
      form.append('audioFile', file);
      const raw = await legacyPost<unknown>('/AIAnalysis/analyze-only', form, {
        timeout: options?.timeout ?? 300000,
      });
      return normalizeAiAnalyzeOnlyResponse(raw);
    },

    analyzeRecording: async (recordingId: string): Promise<InstrumentDetectionResult> => {
      if (!FEATURE_FLAG_INSTRUMENT_CONFIDENCE) {
        return { instruments: [], timeline: null, audio_info: null };
      }
      const cached = recordingAnalyzeCache.get(recordingId);
      if (cached) return cached;

      if (FEATURE_FLAG_INSTRUMENT_DETECTION_MOCK) {
        const mockInfo = mockAnalyzeResult.audio_info;
        const mockResult: InstrumentDetectionResult = {
          ...mockAnalyzeResult,
          audio_info: {
            filename: recordingId,
            duration_seconds: mockInfo?.duration_seconds ?? 0,
            analyzed_duration: mockInfo?.analyzed_duration ?? 0,
            num_frames: mockInfo?.num_frames ?? 0,
            sample_rate: mockInfo?.sample_rate ?? 0,
          },
        };
        recordingAnalyzeCache.set(recordingId, mockResult);
        return mockResult;
      }
      const raw = await apiOk(
        asApiEnvelope<ServiceResponse<ApiAudioAnalyzePayload>>(
          client.POST('/api/audio-analysis/analyze-recording/{recordingId}', {
            params: { path: { recordingId } },
          }),
        ),
      );
      const result = normalizeAnalyzeResult(unwrapServiceData<ApiAudioAnalyzePayload>(raw));
      recordingAnalyzeCache.set(recordingId, result);
      return result;
    },

    getSupportedInstruments: async (): Promise<string[]> => {
      if (!FEATURE_FLAG_INSTRUMENT_CONFIDENCE) return [];
      if (FEATURE_FLAG_INSTRUMENT_DETECTION_MOCK) {
        return mockAnalyzeResult.instruments.map((i) => i.name);
      }
      try {
        const raw = await apiOk(
          asApiEnvelope<ServiceResponse<string[]>>(client.GET('/api/audio-analysis/supported-instruments')),
        );
        const data = unwrapServiceData<string[]>(raw);
        if (!Array.isArray(data)) return [];
        return data.filter((item): item is string => typeof item === 'string');
      } catch (error) {
        logServiceWarn('Failed to load supported instruments', error);
        return [];
      }
    },
  };
}

export const instrumentDetectionService = createInstrumentDetectionService(apiFetchLoose);
export const instrumentDetectionFlags = {
  confidenceEnabled: FEATURE_FLAG_INSTRUMENT_CONFIDENCE,
  mockEnabled: FEATURE_FLAG_INSTRUMENT_DETECTION_MOCK,
} as const;
