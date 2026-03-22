import axios from "axios";
import apiClient, { api } from "@/services/api";
import {
  extractSubmissionRows,
  mapSubmissionToLocalRecording,
} from "@/services/submissionApiMapper";
import type { LocalRecording } from "@/types";
import type { ExpertQueueSource } from "@/config/expertWorkflowPhase";

const DEFAULT_PAGE_SIZE = 200;

async function getSubmissionsByStatus(params: {
  status?: number;
  page?: number;
  pageSize?: number;
}): Promise<LocalRecording[]> {
  const res = await api.get<unknown>("/Submission/get-by-status", {
    params: {
      ...(params.status !== undefined ? { status: params.status } : {}),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    },
  });
  return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row));
}

async function getAdminSubmissions(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  reviewer?: string;
}): Promise<LocalRecording[]> {
  const res = await api.get<unknown>("/Admin/submissions", {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
      ...(params.status ? { status: params.status } : {}),
      ...(params.reviewer ? { reviewer: params.reviewer } : {}),
    },
  });
  return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row));
}

/**
 * Phase 2 queue: merge distinct statuses for expert view (dedupe by id).
 * Without `status`, some backends return a default slice only — we still try one unfiltered call first.
 */
export async function fetchExpertQueueBase(source: ExpertQueueSource): Promise<LocalRecording[]> {
  if (source === "admin") {
    return getAdminSubmissions({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  }
  const unfiltered = await getSubmissionsByStatus({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  if (unfiltered.length > 0) return dedupeById(unfiltered);

  const merged: LocalRecording[] = [];
  const seen = new Set<string>();
  for (const status of [0, 1, 2, 3, 4]) {
    try {
      const chunk = await getSubmissionsByStatus({ status, page: 1, pageSize: DEFAULT_PAGE_SIZE });
      for (const row of chunk) {
        const id = row.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(row);
      }
    } catch {
      /* ignore per-status failures */
    }
  }
  return merged;
}

function dedupeById(rows: LocalRecording[]): LocalRecording[] {
  const map = new Map<string, LocalRecording>();
  for (const r of rows) {
    if (r.id) map.set(r.id, r);
  }
  return [...map.values()];
}

/** Result of POST /Admin/submissions/{id}/assign — never throws. */
export type AssignReviewerResult =
  | { ok: true }
  | { ok: false; forbidden: boolean; httpStatus?: number };

/**
 * POST /Admin/submissions/{id}/assign — wrapped in try/catch.
 * On 403 Forbidden: returns `{ ok: false, forbidden: true }` and logs a console warning (RBAC not ready).
 */
export async function assignSubmissionReviewer(
  submissionId: string,
  reviewerId: string | null,
): Promise<AssignReviewerResult> {
  try {
    await apiClient.post(`/Admin/submissions/${submissionId}/assign`, {
      reviewerId,
    });
    return { ok: true };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 403) {
        console.warn(
          "[expertModerationApi] Assign reviewer forbidden (403). RBAC may not allow this role yet. submissionId=",
          submissionId,
          "reviewerId=",
          reviewerId,
        );
        return { ok: false, forbidden: true, httpStatus: 403 };
      }
      console.warn(
        "[expertModerationApi] Assign reviewer failed",
        { submissionId, reviewerId, status, message: err.message },
      );
      return { ok: false, forbidden: false, httpStatus: status };
    }
    console.warn("[expertModerationApi] Assign reviewer unexpected error", err);
    return { ok: false, forbidden: false };
  }
}

export async function approveSubmissionOnServer(submissionId: string): Promise<boolean> {
  try {
    await api.put("/Submission/approve-submission", undefined, {
      params: { submissionId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function rejectSubmissionOnServer(submissionId: string): Promise<boolean> {
  try {
    await api.put("/Submission/reject-submission", undefined, {
      params: { submissionId },
    });
    return true;
  } catch {
    return false;
  }
}

/** OpenAPI AuditLogDto — POST /AuditLog (expert moderation trail, Phase 2). */
export type ExpertModerationAuditPayload = {
  userId: string;
  submissionId: string;
  action: "expert_approve" | "expert_reject";
  /** Serialized into newValuesJson */
  notesSummary: string;
};

export async function postExpertModerationAuditLog(
  params: ExpertModerationAuditPayload,
): Promise<boolean> {
  try {
    const newValuesJson = JSON.stringify({
      submissionId: params.submissionId,
      expertNotes: params.notesSummary,
      source: "expert_moderation",
    });
    await api.post("/AuditLog", {
      userId: params.userId,
      entityType: "Submission",
      entityId: params.submissionId,
      action: params.action,
      oldValuesJson: null,
      newValuesJson,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn("[expertModerationApi] Audit log POST failed", err);
    return false;
  }
}
