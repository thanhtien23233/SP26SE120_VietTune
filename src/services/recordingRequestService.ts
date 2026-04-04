/**
 * Recording request service — now uses real backend API endpoints.
 *
 * Endpoints used:
 *  - /api/Notification          — notifications CRUD
 *  - /api/Review                — review/moderation workflows
 *  - /api/Submission            — submissions management
 *  - /api/Admin/submissions     — admin submission management
 */

import { api } from "@/services/api";
import type {
  DeleteRecordingRequest,
  EditRecordingRequest,
  EditSubmissionForReview,
  AppNotification,
} from "@/types";
import { UserRole } from "@/types";

// Helper: safely extract array from API response (handles paged .items wrapper)
function safeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Paged response: { items: [...], page, pageSize, total }
    if ("items" in obj && Array.isArray(obj.items)) return obj.items as T[];
    // Envelope: { data: [...] } or { data: { items: [...] } }
    if ("data" in obj) {
      const inner = obj.data;
      if (Array.isArray(inner)) return inner as T[];
      if (inner && typeof inner === "object") {
        const innerObj = inner as Record<string, unknown>;
        if ("items" in innerObj && Array.isArray(innerObj.items)) return innerObj.items as T[];
      }
    }
  }
  return [];
}

/**
 * Map backend NotificationDto → frontend AppNotification.
 * BE fields: message, isRead, relatedId
 * FE fields: body, read, recordingId
 */
function mapNotificationDto(raw: Record<string, unknown>): AppNotification {
  return {
    id: String(raw.id ?? ""),
    type: (raw.type ?? "recording_edited") as AppNotification["type"],
    title: String(raw.title ?? ""),
    body: String(raw.message ?? raw.body ?? ""),
    forRoles: Array.isArray(raw.forRoles) ? raw.forRoles as UserRole[] : [],
    recordingId: String(raw.relatedId ?? raw.recordingId ?? "") || undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    read: typeof raw.isRead === "boolean" ? raw.isRead : (typeof raw.read === "boolean" ? raw.read : false),
  };
}

/** Loose shape returned by `/Review/*` list/detail endpoints */
type ReviewDecisionRow = {
  id?: string;
  submissionId?: string;
  recordingId?: string;
  decision?: string;
  stage?: string;
  recordingTitle?: string;
  comments?: string;
  status?: string;
};

function asReviewRowRecord(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== "object") return null;
  const top = res as Record<string, unknown>;
  const inner = top.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as Record<string, unknown>;
  return top;
}

export const recordingRequestService = {
  // --- Delete recording requests ---

  /** Contributor: send delete recording request */
  async requestDeleteRecording(
    recordingId: string,
    recordingTitle: string,
    contributorId: string,
    contributorName: string
  ): Promise<void> {
    try {
      await api.post("/Review", {
        submissionId: recordingId,
        reviewerId: contributorId,
        decision: "delete_request",
        stage: "pending_admin",
        comments: `Yêu cầu xóa bản thu "${recordingTitle}" bởi ${contributorName}`,
      });
    } catch (err) {
      console.error("Failed to request delete recording", err);
      throw err;
    }
  },

  /** Admin: get pending delete requests */
  async getDeleteRecordingRequests(): Promise<DeleteRecordingRequest[]> {
    try {
      const res = await api.get("/Review/decision/delete_request");
      return safeArray<DeleteRecordingRequest>(res);
    } catch {
      return [];
    }
  },

  /** Admin: forward delete to expert */
  async forwardDeleteToExpert(requestId: string, expertId: string): Promise<void> {
    try {
      await api.put(`/Review/${requestId}`, {
        decision: "forwarded_to_expert",
        reviewerId: expertId,
      });
    } catch (err) {
      console.error("Failed to forward delete to expert", err);
    }
  },

  /** Expert: get forwarded delete requests */
  async getForwardedDeleteRequestsForExpert(expertId: string): Promise<DeleteRecordingRequest[]> {
    if (!expertId) return [];
    try {
      const res = await api.get(`/Review/reviewer/${expertId}`);
      const all = safeArray<DeleteRecordingRequest & { decision?: string }>(res);
      return all.filter((r) => r.decision === "forwarded_to_expert" || r.status === "forwarded_to_expert");
    } catch (err: unknown) {
      // 400/404 = no data yet from backend; not a real error
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 404) return [];
      console.warn("[recordingRequestService] getForwardedDeleteRequestsForExpert failed", status);
      return [];
    }
  },

  /** Expert: complete delete recording */
  async completeDeleteRecording(
    requestId: string,
    removeRecordingFromStorage: (id: string) => Promise<void>
  ): Promise<{ recordingId: string; recordingTitle: string } | null> {
    try {
      // Get the request details first
      const res = await api.get<unknown>(`/Review/${requestId}`);
      const req = asReviewRowRecord(res);
      if (!req) return null;

      const recordingId = String(req.submissionId ?? req.recordingId ?? "");
      if (!recordingId) return null;
      const recordingTitle = String(req.recordingTitle ?? req.comments ?? "Bản thu");

      await removeRecordingFromStorage(recordingId);

      // Mark as completed
      await api.put(`/Review/${requestId}`, { decision: "completed" });

      return { recordingId, recordingTitle };
    } catch (err) {
      console.error("Failed to complete delete recording", err);
      return null;
    }
  },

  /** Remove a delete request */
  async removeDeleteRequest(requestId: string): Promise<void> {
    try {
      await api.delete(`/Review/${requestId}`);
    } catch (err) {
      console.error("Failed to remove delete request", err);
    }
  },

  /** Get pending delete recording IDs for contributor */
  async getPendingDeleteRecordingIdsForContributor(contributorId: string): Promise<string[]> {
    try {
      const res = await api.get(`/Review/reviewer/${contributorId}`);
      const all = safeArray<ReviewDecisionRow>(res);
      return all
        .filter((r) => r.decision === "delete_request")
        .map((r) => r.submissionId || r.recordingId)
        .filter((id): id is string => !!id);
    } catch {
      return [];
    }
  },

  /** Get delete-approved recording IDs for contributor */
  async getDeleteApprovedRecordingIdsForContributor(contributorId: string): Promise<string[]> {
    try {
      const res = await api.get(`/Review/reviewer/${contributorId}`);
      const all = safeArray<ReviewDecisionRow>(res);
      return all
        .filter((r) => r.decision === "delete_approved")
        .map((r) => r.submissionId || r.recordingId)
        .filter((id): id is string => !!id);
    } catch {
      return [];
    }
  },

  /** Admin: approve delete for contributor */
  async approveDeleteForContributor(recordingId: string, contributorId: string): Promise<void> {
    try {
      await api.post("/Review", {
        submissionId: recordingId,
        reviewerId: contributorId,
        decision: "delete_approved",
        stage: "approved",
      });
    } catch (err) {
      console.error("Failed to approve delete for contributor", err);
    }
  },

  /** Revoke delete approval */
  async revokeDeleteApproval(recordingId: string, contributorId: string): Promise<void> {
    void contributorId;
    try {
      // Find and remove the approval review
      const res = await api.get(`/Review/decision/delete_approved`);
      const all = safeArray<ReviewDecisionRow>(res);
      const match = all.find((r) => (r.submissionId || r.recordingId) === recordingId);
      if (match) {
        await api.delete(`/Review/${match.id}`);
      }
    } catch (err) {
      console.error("Failed to revoke delete approval", err);
    }
  },

  // --- Edit recording requests ---

  /** Contributor: request to edit an approved recording */
  async requestEditRecording(
    recordingId: string,
    recordingTitle: string,
    contributorId: string,
    contributorName: string
  ): Promise<void> {
    try {
      await api.post("/Review", {
        submissionId: recordingId,
        reviewerId: contributorId,
        decision: "edit_request",
        stage: "pending",
        comments: `Yêu cầu chỉnh sửa bản thu "${recordingTitle}" bởi ${contributorName}`,
      });
    } catch (err) {
      console.error("Failed to request edit recording", err);
      throw err;
    }
  },

  /** Admin: get edit recording requests */
  async getEditRecordingRequests(): Promise<EditRecordingRequest[]> {
    try {
      const res = await api.get("/Review/decision/edit_request");
      return safeArray<EditRecordingRequest>(res);
    } catch {
      return [];
    }
  },

  /** Admin: approve edit request */
  async approveEditRequest(requestId: string): Promise<void> {
    try {
      await api.put(`/Review/${requestId}`, {
        decision: "edit_approved",
        stage: "approved",
      });
    } catch (err) {
      console.error("Failed to approve edit request", err);
    }
  },

  /** Check if edit is approved for a recording */
  async isEditApprovedForRecording(recordingId: string): Promise<boolean> {
    try {
      const res = await api.get("/Review/decision/edit_approved");
      const all = safeArray<ReviewDecisionRow>(res);
      return all.some(
        (r) => (r.submissionId || r.recordingId) === recordingId
      );
    } catch {
      return false;
    }
  },

  /** Get pending edit recording IDs for contributor */
  async getPendingEditRecordingIdsForContributor(contributorId: string): Promise<string[]> {
    try {
      const res = await api.get(`/Review/reviewer/${contributorId}`);
      const all = safeArray<ReviewDecisionRow>(res);
      return all
        .filter((r) => r.decision === "edit_request" && r.stage === "pending")
        .map((r) => r.submissionId || r.recordingId)
        .filter((id): id is string => !!id);
    } catch {
      return [];
    }
  },

  /** Revoke approved edit */
  async revokeApprovedEdit(recordingId: string): Promise<void> {
    try {
      const res = await api.get("/Review/decision/edit_approved");
      const all = safeArray<ReviewDecisionRow>(res);
      const match = all.find((r) => (r.submissionId || r.recordingId) === recordingId);
      if (match) {
        await api.delete(`/Review/${match.id}`);
      }
    } catch (err) {
      console.error("Failed to revoke approved edit", err);
    }
  },

  // --- Edit submissions for expert review ---

  /** Contributor: submit edit for expert review */
  async submitEditForExpertReview(
    recordingId: string,
    recordingTitle: string,
    contributorId: string,
    contributorName: string
  ): Promise<void> {
    try {
      await api.post("/Review", {
        submissionId: recordingId,
        reviewerId: contributorId,
        decision: "edit_submission",
        stage: "pending_expert",
        comments: `Chỉnh sửa bản thu "${recordingTitle}" bởi ${contributorName} chờ chuyên gia duyệt`,
      });
    } catch (err) {
      console.error("Failed to submit edit for expert review", err);
    }
  },

  /** Expert: get pending edit submissions */
  async getPendingEditSubmissionsForExpert(): Promise<EditSubmissionForReview[]> {
    try {
      const res = await api.get("/Review/decision/edit_submission");
      return safeArray<EditSubmissionForReview>(res);
    } catch (err: unknown) {
      // 400/404 = no data yet from backend; not a real error
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 404) return [];
      console.warn("[recordingRequestService] getPendingEditSubmissionsForExpert failed", status);
      return [];
    }
  },

  /** Expert: approve edit submission */
  async approveEditSubmission(submissionId: string): Promise<{ recordingId: string; recordingTitle: string } | null> {
    try {
      const res = await api.get<unknown>(`/Review/${submissionId}`);
      const req = asReviewRowRecord(res);
      if (!req) return null;

      await api.put(`/Review/${submissionId}`, {
        decision: "edit_submission_approved",
        stage: "completed",
      });

      return {
        recordingId: String(req.submissionId ?? req.recordingId ?? ""),
        recordingTitle: String(req.recordingTitle ?? ""),
      };
    } catch {
      return null;
    }
  },

  /** Get pending edit submission recording IDs for contributor */
  async getPendingEditSubmissionRecordingIdsForContributor(contributorId: string): Promise<string[]> {
    try {
      const res = await api.get(`/Review/reviewer/${contributorId}`);
      const all = safeArray<ReviewDecisionRow>(res);
      return all
        .filter((r) => r.decision === "edit_submission")
        .map((r) => r.submissionId || r.recordingId)
        .filter((id): id is string => !!id);
    } catch {
      return [];
    }
  },

  // --- Notifications (uses /api/Notification endpoints) ---

  async addNotification(n: Omit<AppNotification, "id" | "createdAt" | "read">): Promise<void> {
    try {
      await api.post("/Notification", {
        type: n.type,
        title: n.title,
        message: n.body,
        relatedId: n.recordingId,
      });
    } catch (err) {
      console.error("Failed to add notification", err);
    }
  },

  /** Get notifications for current user (JWT-based, backend filters by user) */
  async getNotificationsForRole(role: UserRole): Promise<AppNotification[]> {
    void role;
    try {
      const res = await api.get("/Notification");
      const rawItems = safeArray<Record<string, unknown>>(res);
      return rawItems.map(mapNotificationDto);
    } catch {
      return [];
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      await api.put(`/Notification/${id}/read`, {});
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  },

  /** Mark all notifications as read for current role */
  async markAllNotificationsReadForRole(role: UserRole): Promise<void> {
    void role;
    try {
      await api.put("/Notification/read-all", {});
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    }
  },
};
