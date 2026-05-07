/**
 * Review 3: optional stage filter pills on expert moderation sidebar.
 * Set `VITE_MODERATION_STAGE_FILTERS=true` to enable (default off for incremental rollout).
 */
const raw = String(import.meta.env.VITE_MODERATION_STAGE_FILTERS ?? '')
  .trim()
  .toLowerCase();

export const MODERATION_STAGE_FILTERS_UI_ENABLED = raw === 'true' || raw === '1';
