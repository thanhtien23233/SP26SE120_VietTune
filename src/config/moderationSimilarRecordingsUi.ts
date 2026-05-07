/**
 * Similar recordings panel in expert moderation detail.
 * Disabled with `VITE_SIMILAR_RECORDINGS=false` or `0`.
 */
const raw = String(import.meta.env.VITE_SIMILAR_RECORDINGS ?? '')
  .trim()
  .toLowerCase();

export const MODERATION_SIMILAR_RECORDINGS_UI_ENABLED = !(raw === 'false' || raw === '0');
