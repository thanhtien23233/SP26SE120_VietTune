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

// Helper: safely extract array from API response
function safeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "data" in data) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
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
    try {
      const res = await api.get(`/Review/reviewer/${expertId}`);
      const all = safeArray<DeleteRecordingRequest & { decision?: string }>(res);
      return all.filter((r) => r.decision === "forwarded_to_expert" || r.status === "forwarded_to_expert");
    } catch {
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
      const res = await api.get<any>(`/Review/${requestId}`);
      const req = res?.data || res;
      if (!req) return null;

      const recordingId = req.submissionId || req.recordingId;
      const recordingTitle = req.recordingTitle || req.comments || "Bản thu";

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
      const all = safeArray<any>(res);
      return all
        .filter((r: any) => r.decision === "delete_request")
        .map((r: any) => r.submissionId || r.recordingId);
    } catch {
      return [];
    }
  },

  /** Get delete-approved recording IDs for contributor */
  async getDeleteApprovedRecordingIdsForContributor(contributorId: string): Promise<string[]> {
    try {
      const res = await api.get(`/Review/reviewer/${contributorId}`);
      const all = safeArray<any>(res);
      return all
        .filter((r: any) => r.decision === "delete_approved")
        .map((r: any) => r.submissionId || r.recordingId);
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
  async revokeDeleteApproval(recordingId: string, _contributorId: string): Promise<void> {
    try {
      // Find and remove the approval review
      const res = await api.get(`/Review/decision/delete_approved`);
      const all = safeArray<any>(res);
      const match = all.find((r: any) => (r.submissionId || r.recordingId) === recordingId);
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
      const all = safeArray<any>(res);
      return all.some((r: any) => (r.submissionId || r.recordingId) === recordingId);
    } catch {
      return false;
    }
  },

  /** Get pending edit recording IDs for contributor */
  async getPendingEditRecordingIdsForContributor(contributorId: string): Promise<string[]> {
    try {
      const res = await api.get(`/Review/reviewer/${contributorId}`);
      const all = safeArray<any>(res);
      return all
        .filter((r: any) => r.decision === "edit_request" && r.stage === "pending")
        .map((r: any) => r.submissionId || r.recordingId);
    } catch {
      return [];
    }
  },

  /** Revoke approved edit */
  async revokeApprovedEdit(recordingId: string): Promise<void> {
    try {
      const res = await api.get("/Review/decision/edit_approved");
      const all = safeArray<any>(res);
      const match = all.find((r: any) => (r.submissionId || r.recordingId) === recordingId);
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
    } catch {
      return [];
    }
  },

  /** Expert: approve edit submission */
  async approveEditSubmission(submissionId: string): Promise<{ recordingId: string; recordingTitle: string } | null> {
    try {
      const res = await api.get<any>(`/Review/${submissionId}`);
      const req = res?.data || res;
      if (!req) return null;

      await api.put(`/Review/${submissionId}`, {
        decision: "edit_submission_approved",
        stage: "completed",
      });

      return {
        recordingId: req.submissionId || req.recordingId || "",
        recordingTitle: req.recordingTitle || "",
      };
    } catch {
      return null;
    }
  },

  /** Get pending edit submission recording IDs for contributor */
  async getPendingEditSubmissionRecordingIdsForContributor(contributorId: string): Promise<string[]> {
    try {
      const res = await api.get(`/Review/reviewer/${contributorId}`);
      const all = safeArray<any>(res);
      return all
        .filter((r: any) => r.decision === "edit_submission")
        .map((r: any) => r.submissionId || r.recordingId);
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
        body: n.body,
        forRoles: n.forRoles,
        recordingId: n.recordingId,
      });
    } catch (err) {
      console.error("Failed to add notification", err);
    }
  },

  /** Get notifications for current user role */
  async getNotificationsForRole(_role: UserRole): Promise<AppNotification[]> {
    try {
      const res = await api.get("/Notification");
      return safeArray<AppNotification>(res);
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

  async markNotificationUnread(id: string): Promise<void> {
    try {
      // Toggle back — not all backends support this, use PUT with read=false
      await api.put(`/Notification/${id}`, { read: false });
    } catch (err) {
      console.error("Failed to mark notification unread", err);
    }
  },

  /** Mark all notifications as read for current role */
  async markAllNotificationsReadForRole(_role: UserRole): Promise<void> {
    try {
      await api.put("/Notification/read-all", {});
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    }
  },

  /** Mark all as unread (no backend endpoint, noop) */
  async markAllNotificationsUnreadForRole(_role: UserRole): Promise<void> {
    console.warn("markAllNotificationsUnreadForRole: Not supported by backend API");
  },
};
