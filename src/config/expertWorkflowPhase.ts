/**
 * Phase 2 expert moderation: real queue + assign + approve/reject APIs
 * (see docs/PLAN-expert-workflow.md, docs/PLAN-expert-role-apis.md).
 *
 * Default **on** so `/moderation` loads from API (`get-by-status` + `get-by-reviewer`).
 * Set `VITE_EXPERT_API_PHASE2=false` to use Phase 1 (local IndexedDB queue only).
 */
const phase2Raw = String(import.meta.env.VITE_EXPERT_API_PHASE2 ?? '')
  .trim()
  .toLowerCase();
export const EXPERT_API_PHASE2 =
  phase2Raw === '' ? true : phase2Raw === 'true' || phase2Raw === '1';

export type ExpertQueueSource = 'by-status' | 'admin';

/** `by-status`: GET /Submission/get-by-status. `admin`: GET /Admin/submissions (needs role). */
export const EXPERT_QUEUE_SOURCE: ExpertQueueSource =
  String(import.meta.env.VITE_EXPERT_QUEUE_SOURCE || 'by-status').toLowerCase() === 'admin'
    ? 'admin'
    : 'by-status';
