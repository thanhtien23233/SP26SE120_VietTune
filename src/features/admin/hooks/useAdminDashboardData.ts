import { useCallback, useMemo, useState } from 'react';

import { legacyGet } from '@/api/legacyHttp';
import {
  AggregatedUser,
  asObject,
  DEMO_USERS,
  ExpertPerformanceRow,
} from '@/features/admin/adminDashboardTypes';
import { usePollWhileVisible } from '@/hooks/usePollWhileVisible';
import { accountDeletionService } from '@/services/accountDeletionService';
import { adminApi } from '@/services/adminApi';
import { analyticsApi } from '@/services/analyticsApi';
import { knowledgeBaseApi } from '@/services/knowledgeBaseApi';
import { fetchAllMessages } from '@/services/qaMessageService';
import { recordingRequestService } from '@/services/recordingRequestService';
import { getItem } from '@/services/storageService';
import {
  extractSubmissionRows,
  mapSubmissionToLocalRecording,
} from '@/services/submissionApiMapper';
import { ModerationStatus } from '@/types';
import { UserRole } from '@/types';
import type { LocalRecording } from '@/types';
import type {
  DeleteRecordingRequest,
  EditRecordingRequest,
  ExpertAccountDeletionRequest,
} from '@/types';
import { toApiSubmissionStatus, toModerationUiStatus } from '@/types/moderation';
import { migrateVideoDataToVideoData } from '@/utils/helpers';

type GenericListResponse =
  | Record<string, unknown>[]
  | {
      data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      Data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      items?: Record<string, unknown>[];
      Items?: Record<string, unknown>[];
    };

export function useAdminDashboardData() {
  const [recordings, setRecordings] = useState<LocalRecording[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<AggregatedUser[] | null>(null);
  const [remoteKbCount, setRemoteKbCount] = useState<number | null>(null);
  const [aiFlaggedCount, setAiFlaggedCount] = useState<number | null>(null);
  const [expertPerformanceRows, setExpertPerformanceRows] = useState<ExpertPerformanceRow[] | null>(
    null,
  );
  const [avgExpertAccuracy, setAvgExpertAccuracy] = useState<number | null>(null);
  const [remoteMonthlyCounts, setRemoteMonthlyCounts] = useState<Record<string, number> | null>(
    null,
  );
  const [remoteTotalRecordings, setRemoteTotalRecordings] = useState<number | null>(null);
  const [remoteInstrumentCount, setRemoteInstrumentCount] = useState<number | null>(null);
  const [remoteInstruments, setRemoteInstruments] = useState<
    { id: string; name: string; category: string | undefined }[] | null
  >(null);
  const [remoteUsersLoadState, setRemoteUsersLoadState] = useState<
    'idle' | 'loading' | 'ok' | 'error'
  >('idle');
  const [showUsersLoadingHint, setShowUsersLoadingHint] = useState(false);
  const [remoteEthnicGroups, setRemoteEthnicGroups] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [remoteEthnicGroupsLoadState, setRemoteEthnicGroupsLoadState] = useState<
    'idle' | 'loading' | 'ok' | 'error'
  >('idle');
  const [usersOverrides, setUsersOverrides] = useState<
    Record<string, { role?: string; username?: string; fullName?: string }>
  >({});
  const [pendingExpertDeletions, setPendingExpertDeletions] = useState<
    ExpertAccountDeletionRequest[]
  >([]);
  const [deleteRecordingRequests, setDeleteRecordingRequests] = useState<DeleteRecordingRequest[]>(
    [],
  );
  const [editRecordingRequests, setEditRecordingRequests] = useState<EditRecordingRequest[]>([]);
  const [deletedUserIds, setDeletedUserIds] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (opts?: { showUserLoadingHint?: boolean }) => {
      const shouldShowUserLoading = !!opts?.showUserLoadingHint;
      // --- Admin backend data (best-effort) ---
      // Avoid UI flicker: keep showing last good list during background refresh.
      // Only enter "loading" when we have no data yet AND user explicitly wants a hint.
      if (shouldShowUserLoading && remoteUsersLoadState !== 'ok' && !remoteUsers) {
        setRemoteUsersLoadState('loading');
      }
      const [
        usersRes,
        contributorsRes,
        trendRes,
        kbCountRes,
        expertsRes,
        flaggedMessagesRes,
        overviewRes,
        instrumentsRes,
        recordingsRes,
        ethnicGroupsRes,
      ] = await Promise.allSettled([
        adminApi.getUsers(), // MUST drive user list
        analyticsApi.getContributors(),
        analyticsApi.getSubmissionsTrend(),
        knowledgeBaseApi.countKnowledgeBaseItems(),
        analyticsApi.getExperts(),
        fetchAllMessages(1, 500),
        analyticsApi.getOverview(),
        legacyGet<GenericListResponse>('/Instrument'),
        legacyGet<GenericListResponse>('/Recording'),
        // Ethnic groups (prefer /EthnicGroup, fallback handled below)
        legacyGet<GenericListResponse>('/EthnicGroup'),
      ]);

      // ---- Users (primary) ----
      if (usersRes.status === 'fulfilled') {
        const users = usersRes.value;
        const contributors = contributorsRes.status === 'fulfilled' ? contributorsRes.value : [];

        const contribById = new Map<
          string,
          { total: number; approved: number; rejected: number }
        >();
        contributors.forEach((c) => {
          const anyC = asObject(c);
          if (!anyC) return;
          const id = String(anyC.userId ?? anyC.id ?? anyC.UserId ?? anyC.Id ?? '');
          const email =
            (typeof anyC.email === 'string' ? anyC.email : undefined) ??
            (typeof anyC.Email === 'string' ? (anyC.Email as string) : undefined);
          const username =
            (typeof anyC.username === 'string' ? anyC.username : undefined) ??
            (typeof anyC.userName === 'string' ? (anyC.userName as string) : undefined) ??
            (typeof anyC.UserName === 'string' ? (anyC.UserName as string) : undefined);

          const total = Number(anyC.contributionCount ?? anyC.submissions ?? anyC.total ?? 0) || 0;
          const approved = Number(anyC.approvedCount ?? anyC.approved ?? 0) || 0;
          const rejected = Number(anyC.rejectedCount ?? anyC.rejected ?? 0) || 0;

          const keys = [id, email, username].filter(
            (k): k is string => typeof k === 'string' && k.trim().length > 0,
          );
          if (keys.length === 0) return;
          keys.forEach((k) => contribById.set(k, { total, approved, rejected }));
        });

        const normalizedUsers: AggregatedUser[] = users
          .map((u) => {
            const anyU = asObject(u);
            if (!anyU) return null;
            const email =
              (typeof anyU.email === 'string' ? anyU.email : undefined) ??
              (typeof anyU.Email === 'string' ? (anyU.Email as string) : undefined) ??
              (typeof anyU.mail === 'string' ? (anyU.mail as string) : undefined);
            const rawId = (anyU.id ?? anyU.userId ?? anyU.Id ?? anyU.UserId) as unknown;
            const id = String(rawId ?? email ?? '');
            if (!id) return null;
            const counts = contribById.get(id) ??
              (email ? contribById.get(email) : undefined) ?? {
                total: 0,
                approved: 0,
                rejected: 0,
              };
            const roleRaw =
              (typeof anyU.role === 'string' ? anyU.role : undefined) ??
              (typeof anyU.Role === 'string' ? (anyU.Role as string) : undefined);
            const fullNameRaw =
              (typeof anyU.fullName === 'string' ? anyU.fullName : undefined) ??
              (typeof anyU.FullName === 'string' ? (anyU.FullName as string) : undefined) ??
              (typeof anyU.name === 'string' ? (anyU.name as string) : undefined);
            const usernameRaw =
              (typeof anyU.username === 'string' ? anyU.username : undefined) ??
              (typeof anyU.userName === 'string' ? (anyU.userName as string) : undefined) ??
              (typeof anyU.UserName === 'string' ? (anyU.UserName as string) : undefined);
            return {
              id,
              username: String(usernameRaw ?? email ?? id),
              email: email,
              fullName: fullNameRaw,
              role: String(roleRaw ?? UserRole.USER),
              contributionCount: counts.total,
              approvedCount: counts.approved,
              rejectedCount: counts.rejected,
            };
          })
          .filter((x): x is AggregatedUser => !!x);

        setRemoteUsers(normalizedUsers);
        setRemoteUsersLoadState('ok');
      } else {
        // Do NOT clear existing list on background failures to avoid flicker.
        if (!remoteUsers) setRemoteUsersLoadState('error');
      }

      // ---- Trend ----
      if (trendRes.status === 'fulfilled') {
        setRemoteMonthlyCounts(Object.keys(trendRes.value).length ? trendRes.value : null);
      } else {
        setRemoteMonthlyCounts(null);
      }

      // ---- Knowledge base count ----
      if (kbCountRes.status === 'fulfilled')
        setRemoteKbCount(Number.isFinite(kbCountRes.value) ? kbCountRes.value : null);
      else setRemoteKbCount(null);

      // ---- AI monitoring metrics ----
      if (expertsRes.status === 'fulfilled') {
        const rows = expertsRes.value
          .map((r) => {
            const o = asObject(r);
            if (!o) return null;
            const rawAccuracy = Number(o.accuracy ?? 0);
            const accuracy = Number.isFinite(rawAccuracy) ? rawAccuracy : 0;
            const rawReviews = Number(o.reviews ?? 0);
            const reviews = Number.isFinite(rawReviews) ? rawReviews : 0;
            const expertId = String(o.expertId ?? o.id ?? '');
            const name = String((o.name ?? o.fullName ?? o.username ?? expertId) || 'Chuyên gia');
            const avgTime = String(o.avgTime ?? '').trim();
            return {
              expertId: expertId || name,
              name,
              reviews,
              accuracy,
              avgTime: avgTime || '-',
            };
          })
          .filter((x): x is ExpertPerformanceRow => !!x);
        const orderedRows = [...rows].sort((a, b) => b.reviews - a.reviews);
        setExpertPerformanceRows(orderedRows);
        if (orderedRows.length > 0) {
          const avg = orderedRows.reduce((sum, row) => sum + row.accuracy, 0) / orderedRows.length;
          setAvgExpertAccuracy(Number.isFinite(avg) ? avg : null);
        } else {
          setAvgExpertAccuracy(null);
        }
      } else {
        setExpertPerformanceRows(null);
        setAvgExpertAccuracy(null);
      }

      if (flaggedMessagesRes.status === 'fulfilled') {
        const flagged = (flaggedMessagesRes.value.data ?? []).filter((m) => m.flaggedByExpert === true);
        setAiFlaggedCount(flagged.length);
      } else {
        setAiFlaggedCount(null);
      }

      // ---- Instruments ----
      if (instrumentsRes.status === 'fulfilled') {
        const instrumentsRaw = instrumentsRes.value;
        const instrumentArr = Array.isArray(instrumentsRaw)
          ? (instrumentsRaw as unknown[])
          : instrumentsRaw &&
              typeof instrumentsRaw === 'object' &&
              'data' in (instrumentsRaw as Record<string, unknown>) &&
              Array.isArray((instrumentsRaw as Record<string, unknown>).data)
            ? ((instrumentsRaw as Record<string, unknown>).data as unknown[])
            : instrumentsRaw &&
                typeof instrumentsRaw === 'object' &&
                'items' in (instrumentsRaw as Record<string, unknown>) &&
                Array.isArray((instrumentsRaw as Record<string, unknown>).items)
              ? ((instrumentsRaw as Record<string, unknown>).items as unknown[])
              : [];
        const instruments = instrumentArr
          .map((it) => {
            const o = it && typeof it === 'object' ? (it as Record<string, unknown>) : null;
            if (!o) return null;
            const id = String(o.id ?? o.instrumentId ?? o._id ?? o.name ?? '');
            const name = String(o.name ?? o.instrumentName ?? o.title ?? '');
            if (!id || !name) return null;
            const category = typeof o.category === 'string' ? o.category : undefined;
            return { id, name, category };
          })
          .filter((x): x is { id: string; name: string; category: string | undefined } => !!x);
        setRemoteInstruments(instruments.length ? instruments : []);
        setRemoteInstrumentCount(instruments.length);
      } else {
        setRemoteInstruments(null);
        setRemoteInstrumentCount(null);
      }

      // ---- Total recordings ----
      const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null;
      if (recordingsRes.status === 'fulfilled') {
        const recordingsRaw = recordingsRes.value;
        const recordingArr = Array.isArray(recordingsRaw)
          ? (recordingsRaw as unknown[])
          : recordingsRaw &&
              typeof recordingsRaw === 'object' &&
              'data' in (recordingsRaw as Record<string, unknown>) &&
              Array.isArray((recordingsRaw as Record<string, unknown>).data)
            ? ((recordingsRaw as Record<string, unknown>).data as unknown[])
            : recordingsRaw &&
                typeof recordingsRaw === 'object' &&
                'items' in (recordingsRaw as Record<string, unknown>) &&
                Array.isArray((recordingsRaw as Record<string, unknown>).items)
              ? ((recordingsRaw as Record<string, unknown>).items as unknown[])
              : [];
        const totalFromList = recordingArr.length;
        setRemoteTotalRecordings(
          typeof overview?.totalRecordings === 'number'
            ? overview.totalRecordings
            : totalFromList || null,
        );
      } else {
        setRemoteTotalRecordings(
          typeof overview?.totalRecordings === 'number' ? overview.totalRecordings : null,
        );
      }

      // ---- Ethnic groups (from API) ----
      setRemoteEthnicGroupsLoadState('loading');
      const normalizeEthnicGroups = (raw: unknown): { id: string; name: string }[] => {
        const arr = Array.isArray(raw)
          ? (raw as unknown[])
          : raw && typeof raw === 'object'
            ? 'data' in (raw as Record<string, unknown>) &&
              Array.isArray((raw as Record<string, unknown>).data)
              ? ((raw as Record<string, unknown>).data as unknown[])
              : 'items' in (raw as Record<string, unknown>) &&
                  Array.isArray((raw as Record<string, unknown>).items)
                ? ((raw as Record<string, unknown>).items as unknown[])
                : []
            : [];
        return arr
          .map((it) => {
            const o = it && typeof it === 'object' ? (it as Record<string, unknown>) : null;
            if (!o) return null;
            const id = String(o.id ?? o.ethnicGroupId ?? o._id ?? o.name ?? o.ethnicity ?? '');
            const name = String(o.name ?? o.ethnicGroupName ?? o.ethnicity ?? o.label ?? '');
            if (!id || !name) return null;
            return { id, name };
          })
          .filter((x): x is { id: string; name: string } => !!x);
      };

      if (ethnicGroupsRes.status === 'fulfilled') {
        const list = normalizeEthnicGroups(ethnicGroupsRes.value);
        setRemoteEthnicGroups(list);
        setRemoteEthnicGroupsLoadState('ok');
      } else {
        // Fallback to /ReferenceData/ethnic-groups if /EthnicGroup fails
        try {
          const fallbackRaw = await legacyGet<GenericListResponse>('/ReferenceData/ethnic-groups');
          const list = normalizeEthnicGroups(fallbackRaw);
          setRemoteEthnicGroups(list);
          setRemoteEthnicGroupsLoadState('ok');
        } catch {
          setRemoteEthnicGroups(null);
          setRemoteEthnicGroupsLoadState('error');
        }
      }

      try {
        // Admin: use GET /Admin/submissions to list all submissions (role-appropriate endpoint)
        const adminSubmissionsRaw = await legacyGet<GenericListResponse>('/Admin/submissions', {
          params: { page: 1, pageSize: 200 },
        });
        const rows = extractSubmissionRows(adminSubmissionsRaw);
        const migrated = migrateVideoDataToVideoData(
          rows.map((row) => mapSubmissionToLocalRecording(row)) as LocalRecording[],
        );
        setRecordings(migrated);
      } catch {
        setRecordings([]);
      }
      try {
        const usersOverridesRaw = getItem('users_overrides');
        const parsedUsersOverrides = usersOverridesRaw
          ? (JSON.parse(usersOverridesRaw) as Record<
              string,
              { role?: string; username?: string; fullName?: string }
            >)
          : {};
        setUsersOverrides(parsedUsersOverrides);
      } catch {
        setUsersOverrides({});
      }
      try {
        const deletedUserIdsRaw = getItem('admin_deleted_user_ids');
        const arr = deletedUserIdsRaw ? (JSON.parse(deletedUserIdsRaw) as string[]) : [];
        setDeletedUserIds(new Set(arr));
      } catch {
        setDeletedUserIds(new Set());
      }
      setPendingExpertDeletions(accountDeletionService.getPendingExpertDeletionRequests());
      void recordingRequestService
        .getDeleteRecordingRequests()
        .then(setDeleteRecordingRequests)
        .catch((err) => {
          console.warn('Failed to load delete recording requests', err);
          setDeleteRecordingRequests([]);
        });
      void recordingRequestService
        .getEditRecordingRequests()
        .then(setEditRecordingRequests)
        .catch((err) => {
          console.warn('Failed to load edit recording requests', err);
          setEditRecordingRequests([]);
        });
    },
    [remoteUsers, remoteUsersLoadState],
  );

  usePollWhileVisible(() => void load(), 30000, [load]);

  const uploaderCounts = useMemo(() => {
    const out: Record<string, { total: number; approved: number; rejected: number }> = {};
    recordings.forEach((r) => {
      const uid = (r.uploader as { id?: string })?.id ?? 'anonymous';
      if (!out[uid]) out[uid] = { total: 0, approved: 0, rejected: 0 };
      out[uid].total += 1;
      const raw = (r.moderation as { status?: unknown })?.status;
      const ui = toModerationUiStatus(toApiSubmissionStatus(raw));
      if (ui === ModerationStatus.APPROVED) out[uid].approved += 1;
      else if (ui === ModerationStatus.REJECTED || ui === ModerationStatus.TEMPORARILY_REJECTED) {
        out[uid].rejected += 1;
      }
    });
    return out;
  }, [recordings]);

  const aggregated = useMemo(() => {
    return DEMO_USERS.map((u) => {
      const counts = uploaderCounts[u.id] ?? { total: 0, approved: 0, rejected: 0 };
      const override = usersOverrides[u.id];
      const overRole = override?.role;
      const overUsername = override?.username;
      const overFullName = override?.fullName;
      return {
        ...u,
        username: overUsername ?? u.username,
        fullName: overFullName ?? u.fullName,
        role: overRole ?? u.role,
        contributionCount: counts.total,
        approvedCount: counts.approved,
        rejectedCount: counts.rejected,
      };
    });
  }, [uploaderCounts, usersOverrides]);

  const extraUsers = useMemo(() => {
    const uploaderIds = new Set(
      recordings.map((r) => (r.uploader as { id?: string })?.id).filter(Boolean),
    );
    const out: AggregatedUser[] = [];
    uploaderIds.forEach((id) => {
      if (id && !DEMO_USERS.some((d) => d.id === id)) {
        const r0 = recordings.find((r) => (r.uploader as { id?: string })?.id === id);
        const u = r0?.uploader as {
          id?: string;
          username?: string;
          email?: string;
          fullName?: string;
          role?: string;
        };
        const counts = uploaderCounts[id] ?? { total: 0, approved: 0, rejected: 0 };
        const override = usersOverrides[id];
        const overRole = override?.role;
        const overUsername = override?.username;
        const overFullName = override?.fullName;
        out.push({
          id: id!,
          username: overUsername ?? u?.username ?? id,
          email: u?.email,
          fullName: overFullName ?? u?.fullName,
          role: overRole ?? u?.role ?? UserRole.USER,
          contributionCount: counts.total,
          approvedCount: counts.approved,
          rejectedCount: counts.rejected,
        });
      }
    });
    return out;
  }, [recordings, uploaderCounts, usersOverrides]);

  const localUsers = useMemo(
    () =>
      [...aggregated.filter((u) => u.role !== UserRole.ADMIN), ...extraUsers].filter(
        (u) => !deletedUserIds.has(u.id),
      ),
    [aggregated, extraUsers, deletedUserIds],
  );

  const usersForTable = useMemo(
    () =>
      (remoteUsers ?? []).filter((u) => u.role !== UserRole.ADMIN && !deletedUserIds.has(u.id)),
    [remoteUsers, deletedUserIds],
  );

  const allUsers = useMemo(
    () =>
      (remoteUsersLoadState === 'ok' ? (remoteUsers ?? []) : localUsers).filter(
        (u) => u.role !== UserRole.ADMIN && !deletedUserIds.has(u.id),
      ),
    [remoteUsersLoadState, remoteUsers, localUsers, deletedUserIds],
  );

  const monthlyCounts = useMemo(() => {
    const out: Record<string, number> = {};
    recordings.forEach((r) => {
      const up = r.uploadedDate ? new Date(r.uploadedDate) : null;
      if (up) {
        const key =
          up.getFullYear() +
          '-' +
          String(up.getMonth() + 1).padStart(2, '0');
        out[key] = (out[key] ?? 0) + 1;
      }
    });
    return out;
  }, [recordings]);

  const monthlyCountsFinal = useMemo(
    () => remoteMonthlyCounts ?? monthlyCounts,
    [remoteMonthlyCounts, monthlyCounts],
  );

  const ethnicGroupsFromApi = useMemo(() => remoteEthnicGroups ?? [], [remoteEthnicGroups]);

  return {
    load,
    recordings,
    remoteUsers,
    remoteKbCount,
    aiFlaggedCount,
    setAiFlaggedCount,
    expertPerformanceRows,
    avgExpertAccuracy,
    remoteMonthlyCounts,
    remoteTotalRecordings,
    remoteInstrumentCount,
    remoteInstruments,
    remoteUsersLoadState,
    showUsersLoadingHint,
    setShowUsersLoadingHint,
    remoteEthnicGroups,
    remoteEthnicGroupsLoadState,
    usersOverrides,
    setUsersOverrides,
    pendingExpertDeletions,
    setPendingExpertDeletions,
    deleteRecordingRequests,
    setDeleteRecordingRequests,
    editRecordingRequests,
    setEditRecordingRequests,
    deletedUserIds,
    setDeletedUserIds,
    usersForTable,
    allUsers,
    monthlyCountsFinal,
    ethnicGroupsFromApi,
  };
}
