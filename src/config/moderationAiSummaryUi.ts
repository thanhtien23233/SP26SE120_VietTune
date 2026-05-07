/**
 * Summary card above expert detail panels (`AIAnalysisSummaryCard`).
 * Disabled with `VITE_MODERATION_AI_SUMMARY_CARD=false` (instrument confidence must still be on).
 */
const raw = String(import.meta.env.VITE_MODERATION_AI_SUMMARY_CARD ?? '')
  .trim()
  .toLowerCase();

export const MODERATION_AI_SUMMARY_CARD_UI_ENABLED = !(raw === 'false' || raw === '0');
