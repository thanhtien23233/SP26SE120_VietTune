/**
 * Recording request service — now uses real backend API endpoints.
 *
 * Endpoints used:
 *  - /api/Notification          — notifications CRUD
 *  - /api/Review                — review/moderation workflows
 *  - /api/Submission            — submissions management
 *  - /api/Admin/submissions     — admin submission management
 */

import { apiFetch, apiFetchLoose, apiOk, asApiEnvelope, openApiQueryRecord } from '@/api';
import { logServiceError, logServiceWarn } from '@/services/serviceLogger';
import type {
  DeleteRecordingRequest,
  EditRecordingRequest,
  EditSubmissionForReview,
  AppNotification,
} from '@/types';
import { UserRole } from '@/types';
import { extractArray } from '@/utils/apiHelpers';
import { getHttpStatus } from '@/utils/httpError';
import { normalizeBENotificationType } from '@/utils/notificationTypeMap';

/**
 * Map backend NotificationDto / SignalR payload → frontend AppNotification.
 * BE fields: message, isRead, relatedId, relatedEntityId
 * FE fields: body, read, recordingId
 */
export function mapNotificationFromApiRecord(raw: Record<string, unknown>): AppNotification {
  const rawType = String(raw.type ?? '');
  const normalizedType = normalizeBENotificationType(rawType) || rawType || 'recording_edited';
  return {
    id: String(raw.id ?? ''),
    type: normalizedType as AppNotification['type'],
    title: String(raw.title ?? ''),
    body: String(raw.message ?? raw.body ?? ''),
    forRoles: Array.isArray(raw.forRoles) ? (raw.forRoles as UserRole[]) : [],
    recordingId:
      String(raw.relatedId ?? raw.recordingId ?? raw.relatedEntityId ?? '') || undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    read:
      typeof raw.isRead === 'boolean'
        ? raw.isRead
        : typeof raw.read === 'boolean'
          ? raw.read
          : false,
  };
}

/** Loose shape returned by `/Review/*` list/detail endpoints */
type ReviewDecisionRow = {
  id?: string;
  submissionId?: string;
  recordingId?: string;
  decision?: string | number;
  stage?: string | number;
  reviewerId?: string;
  recordingTitle?: string;
  comments?: string;
  status?: string | number;
};

/** JSON body from GET `/Review/:id` before `asReviewRowRecord` normalization */
type ReviewDetailApiBody = ReviewDecisionRow | { data?: ReviewDecisionRow };

const REVIEW_ENDPOINTS = {
  collection: '/api/Review',
  byId: '/api/Review/{id}',
  byReviewerId: '/api/Review/reviewer/{reviewerId}',
  byDecision: '/api/Review/decision/{decision}',
  legacyGetById: '/api/Review/get-by-id/{id}',
  legacyCreate: '/api/Review/create',
  legacyUpdate: '/api/Review/update',
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asReviewRowRecord(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null;
  const top = res as Record<string, unknown>;
  const inner = top.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner))
    return inner as Record<string, unknown>;
  return top;
}

function unwrapReviewRows(res: unknown): ReviewDecisionRow[] {
  if (Array.isArray(res)) return res as ReviewDecisionRow[];
  const top = asRecord(res);
  if (!top) return [];
  return extractArray<ReviewDecisionRow>(top, ['data', 'Data', 'items', 'Items', 'results', 'Results']);
}

function rowValueToLowerText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim().toLowerCase();
  if (typeof v === 'number') return String(v);
  return '';
}

async function reviewGetAll(page = 1, pageSize = 500): Promise<ReviewDecisionRow[]> {
  const res = await apiOk(
    asApiEnvelope<unknown>(
      apiFetchLoose.GET(REVIEW_ENDPOINTS.collection, { params: { query: { page, pageSize } } }),
    ),
  );
  return unwrapReviewRows(res);
}

async function reviewCreate(body: Record<string, unknown>): Promise<void> {
  try {
    await apiOk(asApiEnvelope<unknown>(apiFetchLoose.POST(REVIEW_ENDPOINTS.collection, { body })));
  } catch {
    // Backward-compatible fallback for older swagger contract.
    await apiOk(asApiEnvelope<unknown>(apiFetchLoose.POST(REVIEW_ENDPOINTS.legacyCreate, { body })));
  }
}

async function reviewGetByDecision(decision: string): Promise<ReviewDecisionRow[]> {
  const normalizedDecision = decision.trim().toLowerCase();
  if (!normalizedDecision) return [];

  // New swagger route expects integer enum code; current app stores decision keys as string.
  // To avoid coupling to backend enum numeric values, load all and filter locally.
  const rows = await reviewGetAll();
  return rows.filter((r) => {
    const decisionText = rowValueToLowerText(r.decision);
    const statusText = rowValueToLowerText(r.status);
    return decisionText === normalizedDecision || statusText === normalizedDecision;
  });
}

async function reviewGetByReviewer(reviewerId: string): Promise<ReviewDecisionRow[]> {
  if (!reviewerId) return [];
  try {
    const res = await apiOk(
      asApiEnvelope<unknown>(
        apiFetchLoose.GET(REVIEW_ENDPOINTS.byReviewerId, {
          params: { path: { reviewerId } },
        }),
      ),
    );
    return unwrapReviewRows(res);
  } catch {
    // Fallback: old/new contract drift -> filter from GET /api/Review list.
    const all = await reviewGetAll();
    const target = reviewerId.trim().toLowerCase();
    return all.filter((row) => String(row.reviewerId ?? '').trim().toLowerCase() === target);
  }
}

async function reviewGetById(id: string): Promise<unknown> {
  try {
    return apiOk(
      asApiEnvelope<unknown>(
        apiFetchLoose.GET(REVIEW_ENDPOINTS.byId, { params: { path: { id } } }),
      ),
    );
  } catch {
    return apiOk(
      asApiEnvelope<unknown>(
        apiFetchLoose.GET(REVIEW_ENDPOINTS.legacyGetById, { params: { path: { id } } }),
      ),
    );
  }
}

async function reviewUpdateById(id: string, body: Record<string, unknown>): Promise<void> {
  const top = asRecord(body) ?? {};
  const reviewId = String(top.id ?? id).trim();
  try {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetchLoose.PUT(REVIEW_ENDPOINTS.byId, {
          params: { path: { id } },
          body: {
            ...top,
            id: reviewId || id,
          },
        }),
      ),
    );
  } catch {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetchLoose.PUT(REVIEW_ENDPOINTS.legacyUpdate, {
          body: {
            id: reviewId || id,
            comments: top.comments ?? null,
          },
        }),
      ),
    );
  }
}

async function reviewDeleteById(id: string): Promise<void> {
  await apiOk(
    asApiEnvelope<unknown>(
      apiFetchLoose.DELETE(REVIEW_ENDPOINTS.byId, { params: { path: { id } } }),
    ),
  );
}

export const recordingRequestService = {
  // --- Delete recording requests ---

  /** Contributor: send delete recording request */
  async requestDeleteRecording(
    recordingId: string,
    recordingTitle: string,
    contributorId: string,
    contributorName: string,
  ): Promise<void> {
    try {
      await reviewCreate({
        submissionId: recordingId,
        reviewerId: contributorId,
        decision: 'delete_request',
        stage: 'pending_admin',
        comments: `Yêu cầu xóa bản thu "${recordingTitle}" bởi ${contributorName}`,
      });
    } catch (err) {
      logServiceError('Failed to request delete recording', err);
      throw err;
    }
  },

  /** Admin: get pending delete requests */
  async getDeleteRecordingRequests(): Promise<DeleteRecordingRequest[]> {
    try {
      const res = await reviewGetByDecision('delete_request');
      return extractArray<DeleteRecordingRequest>(res);
    } catch {
      return [];
    }
  },

  /** Admin: forward delete to expert */
  async forwardDeleteToExpert(requestId: string, expertId: string): Promise<void> {
    try {
      await reviewUpdateById(requestId, {
        decision: 'forwarded_to_expert',
        reviewerId: expertId,
      });
    } catch (err) {
      logServiceError('Failed to forward delete to expert', err);
    }
  },

  /** Expert: get forwarded delete requests */
  async getForwardedDeleteRequestsForExpert(expertId: string): Promise<DeleteRecordingRequest[]> {
    if (!expertId) return [];
    try {
      const res = await reviewGetByReviewer(expertId);
      const all = extractArray<DeleteRecordingRequest & { decision?: string }>(res);
      return all.filter(
        (r) => r.decision === 'forwarded_to_expert' || r.status === 'forwarded_to_expert',
      );
    } catch (err: unknown) {
      // 400/404 = no data yet from backend; not a real error
      const status = getHttpStatus(err);
      if (status === 400 || status === 404) return [];
      logServiceWarn(
        '[recordingRequestService] getForwardedDeleteRequestsForExpert failed',
        status,
      );
      return [];
    }
  },

  /** Expert: complete delete recording */
  async completeDeleteRecording(
    requestId: string,
    removeRecordingFromStorage: (id: string) => Promise<void>,
  ): Promise<{ recordingId: string; recordingTitle: string } | null> {
    try {
      // Get the request details first
      const res = (await reviewGetById(requestId)) as ReviewDetailApiBody;
      const req = asReviewRowRecord(res);
      if (!req) return null;

      const recordingId = String(req.submissionId ?? req.recordingId ?? '');
      if (!recordingId) return null;
      const recordingTitle = String(req.recordingTitle ?? req.comments ?? 'Bản thu');

      await removeRecordingFromStorage(recordingId);

      // Mark as completed
      await reviewUpdateById(requestId, { decision: 'completed' });

      return { recordingId, recordingTitle };
    } catch (err) {
      logServiceError('Failed to complete delete recording', err);
      return null;
    }
  },

  /** Remove a delete request */
  async removeDeleteRequest(requestId: string): Promise<void> {
    try {
      await reviewDeleteById(requestId);
    } catch (err) {
      logServiceError('Failed to remove delete request', err);
    }
  },

  /** Get pending delete recording IDs for contributor */
  async getPendingDeleteRecordingIdsForContributor(contributorId: string): Promise<string[]> {
    try {
      const res = await reviewGetByReviewer(contributorId);
      const all = extractArray<ReviewDecisionRow>(res);
      return all
        .filter((r) => r.decision === 'delete_request')
        .map((r) => r.submissionId || r.recordingId)
        .filter((id): id is string => !!id);
    } catch {
      return [];
    }
  },

  /** Get delete-approved recording IDs for contributor */
  async getDeleteApprovedRecordingIdsForContributor(contributorId: string): Promise<string[]> {
    try {
      const res = await reviewGetByReviewer(contributorId);
      const all = extractArray<ReviewDecisionRow>(res);
      return all
        .filter((r) => r.decision === 'delete_approved')
        .map((r) => r.submissionId || r.recordingId)
        .filter((id): id is string => !!id);
    } catch {
      return [];
    }
  },

  /** Admin: approve delete for contributor */
  async approveDeleteForContributor(recordingId: string, contributorId: string): Promise<void> {
    try {
      await reviewCreate({
        submissionId: recordingId,
        reviewerId: contributorId,
        decision: 'delete_approved',
        stage: 'approved',
      });
    } catch (err) {
      logServiceError('Failed to approve delete for contributor', err);
    }
  },

  /** Revoke delete approval */
  async revokeDeleteApproval(recordingId: string, contributorId: string): Promise<void> {
    void contributorId;
    try {
      // Find and remove the approval review
      const res = await reviewGetByDecision('delete_approved');
      const all = extractArray<ReviewDecisionRow>(res);
      const match = all.find((r) => (r.submissionId || r.recordingId) === recordingId);
      if (match) {
        if (match.id) await reviewDeleteById(match.id);
      }
    } catch (err) {
      logServiceError('Failed to revoke delete approval', err);
    }
  },

  // --- Edit recording requests ---

  /** Contributor: request to edit an approved recording */
  async requestEditRecording(
    recordingId: string,
    recordingTitle: string,
    contributorId: string,
    contributorName: string,
  ): Promise<void> {
    try {
      await reviewCreate({
        submissionId: recordingId,
        reviewerId: contributorId,
        decision: 'edit_request',
        stage: 'pending',
        comments: `Yêu cầu chỉnh sửa bản thu "${recordingTitle}" bởi ${contributorName}`,
      });
    } catch (err) {
      logServiceError('Failed to request edit recording', err);
      throw err;
    }
  },

  /** Admin: get edit recording requests */
  async getEditRecordingRequests(): Promise<EditRecordingRequest[]> {
    try {
      const res = await reviewGetByDecision('edit_request');
      return extractArray<EditRecordingRequest>(res);
    } catch {
      return [];
    }
  },

  /** Admin: approve edit request */
  async approveEditRequest(requestId: string): Promise<void> {
    try {
      await reviewUpdateById(requestId, {
        decision: 'edit_approved',
        stage: 'approved',
      });
    } catch (err) {
      logServiceError('Failed to approve edit request', err);
    }
  },

  /** Check if edit is approved for a recording */
  async isEditApprovedForRecording(recordingId: string): Promise<boolean> {
    try {
      const res = await reviewGetByDecision('edit_approved');
      const all = extractArray<ReviewDecisionRow>(res);
      return all.some((r) => (r.submissionId || r.recordingId) === recordingId);
    } catch {
      return false;
    }
  },

  /** Get pending edit recording IDs for contributor */
  async getPendingEditRecordingIdsForContributor(contributorId: string): Promise<string[]> {
    try {
      const res = await reviewGetByReviewer(contributorId);
      const all = extractArray<ReviewDecisionRow>(res);
      return all
        .filter((r) => r.decision === 'edit_request' && r.stage === 'pending')
        .map((r) => r.submissionId || r.recordingId)
        .filter((id): id is string => !!id);
    } catch {
      return [];
    }
  },

  /** Revoke approved edit */
  async revokeApprovedEdit(recordingId: string): Promise<void> {
    try {
      const res = await reviewGetByDecision('edit_approved');
      const all = extractArray<ReviewDecisionRow>(res);
      const match = all.find((r) => (r.submissionId || r.recordingId) === recordingId);
      if (match) {
        if (match.id) await reviewDeleteById(match.id);
      }
    } catch (err) {
      logServiceError('Failed to revoke approved edit', err);
    }
  },

  // --- Edit submissions for expert review ---

  /** Contributor: submit edit for expert review */
  async submitEditForExpertReview(
    recordingId: string,
    recordingTitle: string,
    contributorId: string,
    contributorName: string,
  ): Promise<void> {
    try {
      await reviewCreate({
        submissionId: recordingId,
        reviewerId: contributorId,
        decision: 'edit_submission',
        stage: 'pending_expert',
        comments: `Chỉnh sửa bản thu "${recordingTitle}" bởi ${contributorName} chờ chuyên gia duyệt`,
      });
    } catch (err) {
      logServiceError('Failed to submit edit for expert review', err);
    }
  },

  /** Expert: get pending edit submissions */
  async getPendingEditSubmissionsForExpert(): Promise<EditSubmissionForReview[]> {
    try {
      const res = await reviewGetByDecision('edit_submission');
      return extractArray<EditSubmissionForReview>(res);
    } catch (err: unknown) {
      // 400/404 = no data yet from backend; not a real error
      const status = getHttpStatus(err);
      if (status === 400 || status === 404) return [];
      logServiceWarn('[recordingRequestService] getPendingEditSubmissionsForExpert failed', status);
      return [];
    }
  },

  /** Expert: approve edit submission */
  async approveEditSubmission(
    submissionId: string,
  ): Promise<{ recordingId: string; recordingTitle: string } | null> {
    try {
      const res = (await reviewGetById(submissionId)) as ReviewDetailApiBody;
      const req = asReviewRowRecord(res);
      if (!req) return null;

      await reviewUpdateById(submissionId, {
        decision: 'edit_submission_approved',
        stage: 'completed',
      });

      return {
        recordingId: String(req.submissionId ?? req.recordingId ?? ''),
        recordingTitle: String(req.recordingTitle ?? ''),
      };
    } catch {
      return null;
    }
  },

  /** Get pending edit submission recording IDs for contributor */
  async getPendingEditSubmissionRecordingIdsForContributor(
    contributorId: string,
  ): Promise<string[]> {
    try {
      const res = await reviewGetByReviewer(contributorId);
      const all = extractArray<ReviewDecisionRow>(res);
      return all
        .filter((r) => r.decision === 'edit_submission')
        .map((r) => r.submissionId || r.recordingId)
        .filter((id): id is string => !!id);
    } catch {
      return [];
    }
  },

  // --- Notifications (uses /api/Notification endpoints) ---

  async addNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<void> {
    try {
      await apiOk(
        asApiEnvelope<unknown>(
          apiFetchLoose.POST('/api/Notification', {
            body: {
              type: n.type,
              title: n.title,
              message: n.body,
              relatedId: n.recordingId,
            },
          }),
        ),
      );
    } catch (err) {
      logServiceError('Failed to add notification', err);
    }
  },

  async getNotifications(params?: {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
  }): Promise<{ items: AppNotification[]; page: number; pageSize: number; total: number }> {
    try {
      const body = (await apiOk(
        asApiEnvelope<unknown>(
          apiFetch.GET('/api/Notification', {
            params: { query: params ? openApiQueryRecord(params) : {} },
          }),
        ),
      )) as Record<string, unknown>;
      const rawItems = Array.isArray(body?.items) ? (body.items as Array<Record<string, unknown>>) : [];
      const page = typeof body?.page === 'number' ? (body.page as number) : Number(params?.page ?? 1);
      const pageSize =
        typeof body?.pageSize === 'number' ? (body.pageSize as number) : Number(params?.pageSize ?? 20);
      const total = typeof body?.total === 'number' ? (body.total as number) : rawItems.length;
      return {
        items: rawItems.map(mapNotificationFromApiRecord),
        page,
        pageSize,
        total,
      };
    } catch {
      return { items: [], page: Number(params?.page ?? 1), pageSize: Number(params?.pageSize ?? 20), total: 0 };
    }
  },

  async getUnreadCount(): Promise<{ unread: number; total: number }> {
    try {
      const body = (await apiOk(
        asApiEnvelope<unknown>(apiFetch.GET('/api/Notification/unread-count')),
      )) as Record<string, unknown>;
      return {
        unread: typeof body.unread === 'number' ? body.unread : 0,
        total: typeof body.total === 'number' ? body.total : 0,
      };
    } catch {
      return { unread: 0, total: 0 };
    }
  },

  async deleteNotification(id: string): Promise<void> {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.DELETE('/api/Notification/{id}', { params: { path: { id } } }),
      ),
    );
  },

  /** Get notifications for current user (JWT-based, backend filters by user) */
  async getNotificationsForRole(role: UserRole): Promise<AppNotification[]> {
    void role;
    try {
      const res = await apiOk(asApiEnvelope<unknown>(apiFetch.GET('/api/Notification')));
      const rawItems = extractArray<Record<string, unknown>>(res);
      return rawItems.map(mapNotificationFromApiRecord);
    } catch {
      return [];
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      await apiOk(
        asApiEnvelope<unknown>(
          apiFetch.PUT('/api/Notification/{id}/read', { params: { path: { id } } }),
        ),
      );
    } catch (err) {
      logServiceError('Failed to mark notification read', err);
    }
  },

  /** Mark all notifications as read for current role */
  async markAllNotificationsReadForRole(role: UserRole): Promise<void> {
    void role;
    try {
      await apiOk(asApiEnvelope<unknown>(apiFetch.PUT('/api/Notification/read-all')));
    } catch (err) {
      logServiceError('Failed to mark all notifications read', err);
    }
  },
};
