/**
 * Phase 2 expert moderation: real queue + assign + approve/reject APIs
 * (see docs/PLAN-expert-workflow.md, docs/PLAN-expert-role-apis.md).
 */
export const EXPERT_API_PHASE2 =
  String(import.meta.env.VITE_EXPERT_API_PHASE2 || "").toLowerCase() === "true";

export type ExpertQueueSource = "by-status" | "admin";

/** `by-status`: GET /Submission/get-by-status. `admin`: GET /Admin/submissions (needs role). */
export const EXPERT_QUEUE_SOURCE: ExpertQueueSource =
  String(import.meta.env.VITE_EXPERT_QUEUE_SOURCE || "by-status").toLowerCase() === "admin"
    ? "admin"
    : "by-status";
