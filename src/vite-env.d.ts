/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_VIETTUNE_AI_BASE_URL?: string;
  readonly VITE_VIETTUNE_AI_CHAT_PATH?: string;
  /** `true` → expert queue + claim/approve/reject use Archive API (Phase 2). */
  readonly VITE_EXPERT_API_PHASE2?: string;
  /** `by-status` (default) or `admin` → GET /Admin/submissions for queue. */
  readonly VITE_EXPERT_QUEUE_SOURCE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_BUCKET?: string;
  readonly VITE_RESEARCHER_VERIFIED_SUBMISSION_STATUS?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SIGNALR_HUB_URL?: string;
  readonly VITE_INSTRUMENT_CONFIDENCE?: string;
  readonly VITE_INSTRUMENT_DETECTION_MOCK?: string;
  readonly VITE_ENABLE_SPECTROGRAM_COMPARE?: string;
  /** `custom` → custom FFT canvas renderer; any other/absent → WaveSurfer Spectrogram plugin (default). */
  readonly VITE_COMPARE_SPECTROGRAM_RENDERER?: string;
  /** `true` → console.debug FFT + canvas checkpoints (dev only). */
  readonly VITE_SPECTROGRAM_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
