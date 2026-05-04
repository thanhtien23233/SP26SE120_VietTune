/**
 * Phase 1: base list GET /Submission/my + local overlay (EXPERT_MODERATION_STATE).
 * Phase 2 (VITE_EXPERT_API_PHASE2=true): queue from get-by-status + get-by-reviewer;
 * claim/unclaim/approve/reject call server first, then overlay (notes / verification).
 */

import { EXPERT_API_PHASE2, EXPERT_QUEUE_SOURCE } from '@/config/expertWorkflowPhase';
import {
  approveSubmissionOnServer,
  assignReviewerSubmission,
  fetchExpertQueueBase,
  fetchSubmissionsByReviewer,
  postExpertModerationAuditLog,
  rejectSubmissionOnServer,
  unassignReviewerSubmission,
} from '@/services/expertModerationApi';
import { getLocalRecordingMetaList } from '@/services/recordingStorage';
import { logServiceWarn } from '@/services/serviceLogger';
import { getItemAsync, setItem } from '@/services/storageService';
import type { LocalRecording } from '@/types';
import { ModerationStatus } from '@/types';
import type { MutationResult } from '@/types/mutationResult';
import { mutationOk } from '@/types/mutationResult';

// Phase 1 Spike: storage key — replace with server session / assign API in Phase 2.
export const EXPERT_MODERATION_STATE_KEY = 'EXPERT_MODERATION_STATE';

/** Phase 1 (and Phase 2 draft): working expert notes per submissionId in localStorage. */
export const EXPERT_REVIEW_NOTES_KEY = 'EXPERT_REVIEW_NOTES_BY_SUBMISSION';

/** Checkbox / form state for the 3-step verification wizard (matches ModerationPage). */
export interface ModerationVerificationData {
  step1?: {
    infoComplete: boolean;
    infoAccurate: boolean;
    formatCorrect: boolean;
    notes?: string;
    completedAt?: string;
  };
  step2?: {
    culturalValue: boolean;
    authenticity: boolean;
    accuracy: boolean;
    expertNotes?: string;
    completedAt?: string;
  };
  step3?: {
    crossChecked: boolean;
    sourcesVerified: boolean;
    finalApproval: boolean;
    sensitiveContent?: boolean;
    finalNotes?: string;
    completedAt?: string;
  };
}

/** Expert-owned moderation fields persisted locally until Phase 2 API. */
export interface LocalModerationState {
  status?: ModerationStatus | string;
  claimedBy?: string | null;
  claimedByName?: string | null;
  claimedAt?: string | null;
  reviewerId?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  verificationStep?: number;
  /** `null` clears persisted verification (JSON survives round-trip; `undefined` omits key). */
  verificationData?: ModerationVerificationData | null;
  rejectionNote?: string;
  /** Phase 1 Spike: expert-facing notes (approve / reject confirm); Phase 2 → API audit. */
  notes?: string;
  contributorEditLocked?: boolean;
}

/** Per-submission patch stored under EXPERT_MODERATION_STATE. */
export interface ExpertSubmissionLocalPatch {
  moderation: LocalModerationState;
  resubmittedForModeration?: boolean;
}

export type ExpertModerationStateMap = Record<string, ExpertSubmissionLocalPatch>;

function mergeVerificationData(
  base?: ModerationVerificationData,
  next?: ModerationVerificationData | null,
): ModerationVerificationData | undefined {
  if (next === null) return undefined;
  if (!base && !next) return undefined;
  return {
    ...base,
    ...next,
    step1: { ...base?.step1, ...next?.step1 },
    step2: { ...base?.step2, ...next?.step2 },
    step3: { ...base?.step3, ...next?.step3 },
  } as ModerationVerificationData;
}

async function readMap(): Promise<ExpertModerationStateMap> {
  const raw = await getItemAsync(EXPERT_MODERATION_STATE_KEY);
  if (!raw) return {};
  try {
    const p = JSON.parse(raw) as unknown;
    if (p && typeof p === 'object' && !Array.isArray(p)) return p as ExpertModerationStateMap;
  } catch {
    /* ignore */
  }
  return {};
}

async function writeMap(map: ExpertModerationStateMap): Promise<void> {
  await setItem(EXPERT_MODERATION_STATE_KEY, JSON.stringify(map));
}

async function readReviewNotesMap(): Promise<Record<string, string>> {
  const raw = await getItemAsync(EXPERT_REVIEW_NOTES_KEY);
  if (!raw) return {};
  try {
    const p = JSON.parse(raw) as unknown;
    if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, string>;
  } catch {
    /* ignore */
  }
  return {};
}

async function writeReviewNotesMap(map: Record<string, string>): Promise<void> {
  await setItem(EXPERT_REVIEW_NOTES_KEY, JSON.stringify(map));
}

function mergeBaseWithPatch(
  base: LocalRecording,
  patch?: ExpertSubmissionLocalPatch | null,
): LocalRecording {
  if (!patch) return base;
  const merged: LocalRecording = { ...base };
  if (patch.resubmittedForModeration !== undefined) {
    merged.resubmittedForModeration = patch.resubmittedForModeration;
  }
  const bm = base.moderation ?? {};
  const pm = patch.moderation;
  const prevVd = (bm as { verificationData?: ModerationVerificationData }).verificationData;
  const nextVd = pm.verificationData;
  const mergedModeration: Record<string, unknown> = { ...bm, ...pm };
  if (nextVd === null) {
    delete mergedModeration.verificationData;
  } else {
    mergedModeration.verificationData = mergeVerificationData(prevVd, nextVd ?? undefined);
  }
  merged.moderation = mergedModeration as LocalRecording['moderation'];
  return merged;
}

export type ClaimSubmissionResult =
  | { success: true; serverAssignSynced?: boolean }
  | { success: false; httpStatus?: number; errorMessage?: string };

export type ExpertOverlaySnapshot = ExpertSubmissionLocalPatch | undefined;

function deepClonePatch(patch: ExpertSubmissionLocalPatch): ExpertSubmissionLocalPatch {
  return JSON.parse(JSON.stringify(patch)) as ExpertSubmissionLocalPatch;
}

function dedupeRecordingsById(items: LocalRecording[]): LocalRecording[] {
  const byId = new Map<string, LocalRecording>();
  for (const item of items) {
    if (!item.id) continue;
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

async function applyApproveToMap(
  submissionId: string,
  expertId: string,
  expertUsername: string,
  verificationData: ModerationVerificationData | undefined,
  notes: string,
): Promise<void> {
  const map = await readMap();
  const prev = map[submissionId]?.moderation ?? {};
  const trimmedNotes = notes.trim();
  const moderation: LocalModerationState = {
    ...prev,
    status: ModerationStatus.APPROVED,
    reviewerId: expertId,
    reviewerName: expertUsername,
    reviewedAt: new Date().toISOString(),
    claimedBy: null,
    claimedByName: null,
    claimedAt: null,
    verificationStep: undefined,
    verificationData: mergeVerificationData(
      prev.verificationData === null ? undefined : prev.verificationData,
      verificationData,
    ),
  };
  if (trimmedNotes) moderation.notes = trimmedNotes;
  else delete moderation.notes;
  map[submissionId] = {
    resubmittedForModeration: false,
    moderation,
  };
  await writeMap(map);
}

async function applyRejectToMap(
  submissionId: string,
  expertId: string,
  expertUsername: string,
  type: 'direct' | 'temporary',
  rejectionNote: string,
  notes: string,
  opts?: { wasResubmitted?: boolean },
): Promise<void> {
  const map = await readMap();
  const prev = map[submissionId]?.moderation ?? {};
  const lockFromReject = type === 'direct' && opts?.wasResubmitted === true;
  const trimmedExpertNotes = notes.trim();
  const moderation: LocalModerationState = {
    ...prev,
    status: type === 'direct' ? ModerationStatus.REJECTED : ModerationStatus.TEMPORARILY_REJECTED,
    reviewerId: expertId,
    reviewerName: expertUsername,
    reviewedAt: new Date().toISOString(),
    rejectionNote: rejectionNote || '',
    contributorEditLocked: lockFromReject || prev.contributorEditLocked,
    claimedBy: null,
    claimedByName: null,
  };
  if (trimmedExpertNotes) moderation.notes = trimmedExpertNotes;
  else delete moderation.notes;
  map[submissionId] = {
    ...map[submissionId],
    moderation,
  };
  await writeMap(map);
}

export const expertWorkflowService = {
  /**
   * Working notes while reviewing (Phase 1 & 2 draft): persisted in localStorage by submissionId.
   */
  async getExpertReviewNotes(submissionId: string): Promise<string> {
    const m = await readReviewNotesMap();
    return m[submissionId] ?? '';
  },

  /** Phase 1: persist to localStorage. Phase 2: same for draft; server audit on approve/reject via logExpertModerationDecision. */
  async setExpertReviewNotes(submissionId: string, text: string): Promise<void> {
    const m = await readReviewNotesMap();
    const t = text.trim();
    if (!t) delete m[submissionId];
    else m[submissionId] = text;
    await writeReviewNotesMap(m);
  },

  async clearExpertReviewNotes(submissionId: string): Promise<void> {
    const m = await readReviewNotesMap();
    if (!(submissionId in m)) return;
    delete m[submissionId];
    await writeReviewNotesMap(m);
  },

  /** Phase 2: POST /AuditLog with expert notes after successful approve/reject on server. Phase 1: no-op. */
  async logExpertModerationDecision(params: {
    submissionId: string;
    userId: string;
    action: 'expert_approve' | 'expert_reject';
    combinedNotes: string;
  }): Promise<boolean> {
    if (!EXPERT_API_PHASE2) return true;
    const summary = params.combinedNotes.trim();
    if (!summary) return true;
    return postExpertModerationAuditLog({
      userId: params.userId,
      submissionId: params.submissionId,
      action: params.action,
      notesSummary: summary,
    });
  },

  /**
   * Phase 1 Spike: API base list + local overlay merge.
   * Phase 2: merge pending queue with reviewer-owned queue from server.
   */
  async getQueue(expertId?: string): Promise<LocalRecording[]> {
    let baseList: LocalRecording[];
    if (EXPERT_API_PHASE2) {
      let pending: LocalRecording[] = [];
      try {
        pending = await fetchExpertQueueBase(EXPERT_QUEUE_SOURCE);
      } catch (err) {
        logServiceWarn('[expertWorkflowService] getQueue pending fetch failed', err);
      }
      let reviewerOwned: LocalRecording[] = [];
      if (expertId) {
        try {
          reviewerOwned = await fetchSubmissionsByReviewer(expertId);
        } catch (err) {
          logServiceWarn('[expertWorkflowService] getQueue reviewer fetch failed', err);
        }
      }
      // Keep one row per submission id when combining pending + reviewer queues.
      baseList = dedupeRecordingsById([...pending, ...reviewerOwned]);
    } else {
      baseList = await getLocalRecordingMetaList();
    }
    const map = await readMap();
    return baseList.map((item) => {
      const id = item.id;
      if (!id) return item;
      return mergeBaseWithPatch(item, map[id] ?? null);
    });
  },

  /** Merge overlay onto a single recording (detail panel / dialog). Phase 1 Spike. */
  async applyOverlayToRecording(base: LocalRecording | null): Promise<LocalRecording | null> {
    if (!base?.id) return base;
    const map = await readMap();
    return mergeBaseWithPatch(base, map[base.id] ?? null);
  },

  /** Claim submission: Phase 2 calls PUT /Submission/assign-reviewer-submission first. */
  async claimSubmission(
    submissionId: string,
    expertId: string,
    expertUsername: string,
  ): Promise<ClaimSubmissionResult> {
    try {
      let serverAssignSynced = !EXPERT_API_PHASE2;

      if (EXPERT_API_PHASE2) {
        const assignResult = await assignReviewerSubmission(submissionId, expertId);
        if (assignResult.ok) {
          serverAssignSynced = true;
        } else {
          const msg =
            assignResult.error instanceof Error
              ? assignResult.error.message
              : String(assignResult.error ?? '');
          return { success: false, httpStatus: assignResult.httpStatus, errorMessage: msg };
        }
      }

      const map = await readMap();
      const prev = map[submissionId]?.moderation ?? {};
      const moderation: LocalModerationState = {
        ...prev,
        status: ModerationStatus.IN_REVIEW,
        claimedBy: expertId,
        claimedByName: expertUsername,
        claimedAt: new Date().toISOString(),
        verificationStep: prev.verificationStep ?? 1,
      };

      map[submissionId] = {
        ...map[submissionId],
        moderation,
      };
      await writeMap(map);

      if (EXPERT_API_PHASE2) {
        return {
          success: true,
          serverAssignSynced,
        };
      }
      return { success: true };
    } catch (err) {
      logServiceWarn('[expertWorkflowService] claimSubmission failed', err);
      return { success: false };
    }
  },

  async unclaimSubmission(submissionId: string): Promise<boolean> {
    try {
      if (EXPERT_API_PHASE2) {
        const res = await unassignReviewerSubmission(submissionId);
        if (!res.ok) return false;
      }
      const map = await readMap();
      const prev = map[submissionId]?.moderation ?? {};
      map[submissionId] = {
        ...map[submissionId],
        moderation: {
          ...prev,
          status: ModerationStatus.PENDING_REVIEW,
          claimedBy: null,
          claimedByName: null,
          claimedAt: null,
          verificationStep: undefined,
          // Phase 1 Spike: null clears checklist after JSON round-trip (undefined would be dropped).
          verificationData: null,
        },
      };
      await writeMap(map);
      return true;
    } catch (err) {
      logServiceWarn('[expertWorkflowService] unclaimSubmission failed', err);
      return false;
    }
  },

  /** Deep copy of overlay row for optimistic revert. */
  async snapshotSubmissionOverlay(submissionId: string): Promise<ExpertOverlaySnapshot> {
    const map = await readMap();
    const row = map[submissionId];
    if (!row) return undefined;
    return deepClonePatch(row);
  },

  /** Restore overlay after failed server sync (or delete row if snapshot was undefined). */
  async restoreSubmissionOverlay(
    submissionId: string,
    snapshot: ExpertOverlaySnapshot,
  ): Promise<void> {
    const map = await readMap();
    if (snapshot === undefined) delete map[submissionId];
    else map[submissionId] = deepClonePatch(snapshot);
    await writeMap(map);
  },

  /** Persist approve to EXPERT_MODERATION_STATE only (no API). */
  async commitApproveLocal(
    submissionId: string,
    expertId: string,
    expertUsername: string,
    verificationData: ModerationVerificationData | undefined,
    notes: string,
  ): Promise<void> {
    await applyApproveToMap(submissionId, expertId, expertUsername, verificationData, notes);
  },

  /** Persist reject to EXPERT_MODERATION_STATE only (no API). */
  async commitRejectLocal(
    submissionId: string,
    expertId: string,
    expertUsername: string,
    type: 'direct' | 'temporary',
    rejectionNote: string,
    notes: string,
    opts?: { wasResubmitted?: boolean },
  ): Promise<void> {
    await applyRejectToMap(
      submissionId,
      expertId,
      expertUsername,
      type,
      rejectionNote,
      notes,
      opts,
    );
  },

  /** Phase 2: PUT approve-submission; Phase 1: no-op success. Luôn trả MutationResult (không nuốt lỗi). */
  async syncApproveToServer(submissionId: string): Promise<MutationResult> {
    if (!EXPERT_API_PHASE2) return mutationOk();
    return approveSubmissionOnServer(submissionId);
  },

  /** Phase 2: PUT reject-submission; Phase 1: no-op success. */
  async syncRejectToServer(submissionId: string): Promise<MutationResult> {
    if (!EXPERT_API_PHASE2) return mutationOk();
    return rejectSubmissionOnServer(submissionId);
  },

  /** Sequential: server (Phase 2) then local map — for non-optimistic callers. */
  async approveSubmission(
    submissionId: string,
    expertId: string,
    expertUsername: string,
    verificationData: ModerationVerificationData | undefined,
    notes: string,
  ): Promise<boolean> {
    try {
      if (EXPERT_API_PHASE2) {
        const serverRes = await approveSubmissionOnServer(submissionId);
        if (!serverRes.ok) return false;
      }
      await applyApproveToMap(submissionId, expertId, expertUsername, verificationData, notes);
      return true;
    } catch {
      return false;
    }
  },

  async rejectSubmission(
    submissionId: string,
    expertId: string,
    expertUsername: string,
    type: 'direct' | 'temporary',
    rejectionNote: string,
    notes: string,
    opts?: { wasResubmitted?: boolean },
  ): Promise<boolean> {
    try {
      if (EXPERT_API_PHASE2) {
        const serverRes = await rejectSubmissionOnServer(submissionId);
        if (!serverRes.ok) return false;
      }
      await applyRejectToMap(
        submissionId,
        expertId,
        expertUsername,
        type,
        rejectionNote,
        notes,
        opts,
      );
      return true;
    } catch {
      return false;
    }
  },

  async updateVerificationStep(
    submissionId: string,
    payload: { verificationStep: number; verificationData?: ModerationVerificationData },
  ): Promise<boolean> {
    try {
      const map = await readMap();
      const prev = map[submissionId]?.moderation ?? {};
      map[submissionId] = {
        ...map[submissionId],
        moderation: {
          ...prev,
          verificationStep: payload.verificationStep,
          verificationData: mergeVerificationData(
            prev.verificationData === null ? undefined : prev.verificationData,
            payload.verificationData,
          ),
        },
      };
      await writeMap(map);
      return true;
    } catch {
      return false;
    }
  },

  /** Phase 1 Spike: call after successful DELETE /Submission so overlay does not resurrect stale rows. */
  async removeSubmissionOverlay(submissionId: string): Promise<void> {
    const map = await readMap();
    if (!(submissionId in map)) return;
    delete map[submissionId];
    await writeMap(map);
    const notesMap = await readReviewNotesMap();
    if (submissionId in notesMap) {
      delete notesMap[submissionId];
      await writeReviewNotesMap(notesMap);
    }
  },
};
