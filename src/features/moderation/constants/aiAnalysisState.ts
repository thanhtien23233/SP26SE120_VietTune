import type { InstrumentDetectionResult } from '@/types/instrumentDetection';

/**
 * Explicit AI analysis lifecycle state.
 * Distinguishes between "not yet generated", "loading", "ready", and "failed".
 */
export enum AIAnalysisState {
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  LOADING = 'LOADING',
  READY = 'READY',
  FAILED = 'FAILED',
}

/**
 * Derives the AI analysis state from hook/component loading/error/result signals.
 *
 * NOT_AVAILABLE:  API returned 404 or result is empty (no instruments, no audio_info)
 * LOADING:        Fetch in-flight
 * READY:          Data present with at least one instrument or audio_info
 * FAILED:         Network / server error (non-404)
 */
export function deriveAIAnalysisState(params: {
  loading: boolean;
  error: string | null;
  result: InstrumentDetectionResult | null;
  httpStatus?: number | null;
}): AIAnalysisState {
  const { loading, error, result, httpStatus } = params;

  if (loading) return AIAnalysisState.LOADING;

  if (error) {
    if (httpStatus === 404 || httpStatus === 400) {
      return AIAnalysisState.NOT_AVAILABLE;
    }
    return AIAnalysisState.FAILED;
  }

  if (!result) return AIAnalysisState.NOT_AVAILABLE;

  const hasInstruments = (result.instruments?.length ?? 0) > 0;
  const hasAudioInfo = result.audio_info !== null;

  if (!hasInstruments && !hasAudioInfo) {
    return AIAnalysisState.NOT_AVAILABLE;
  }

  return AIAnalysisState.READY;
}

export const AI_STATE_MESSAGES_VI = {
  [AIAnalysisState.NOT_AVAILABLE]: {
    confidence: 'Chưa có dữ liệu AI — bản thu chưa được phân tích. Chọn "Phân tích" để tạo kết quả.',
    comparison: 'Chưa có dữ liệu AI để đối chiếu nhạc cụ — bản thu chưa được phân tích.',
    metadata: 'Chưa có gợi ý metadata — bản thu chưa được AI phân tích.',
  },
  [AIAnalysisState.LOADING]: {
    confidence: 'Đang phân tích nhạc cụ...',
    comparison: 'Đang đối chiếu nhạc cụ...',
    metadata: 'Đang tải gợi ý metadata...',
  },
  [AIAnalysisState.READY]: {
    confidence: '',
    comparison: '',
    metadata: '',
  },
  [AIAnalysisState.FAILED]: {
    confidence: 'Lỗi khi tải phân tích AI. Vui lòng thử lại sau.',
    comparison: 'Lỗi khi tải dữ liệu đối chiếu từ AI. Vui lòng thử lại sau.',
    metadata: 'Lỗi khi tải gợi ý metadata từ AI. Vui lòng thử lại sau.',
  },
} as const;
