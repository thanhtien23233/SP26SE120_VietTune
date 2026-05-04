import { useCallback, useEffect, useState } from 'react';

import { annotationApi } from '@/services/annotationApi';
import { copyrightDisputeApi } from '@/services/copyrightDisputeApi';
import { embargoApi } from '@/services/embargoApi';
import { buildSubmissionLookupMaps } from '@/services/expertModerationApi';
import { recordingService } from '@/services/recordingService';
import { fetchVerifiedSubmissionsAsRecordings } from '@/services/researcherArchiveService';
import { mapSubmissionToLocalRecording } from '@/services/submissionApiMapper';
import { submissionService } from '@/services/submissionService';
import type { Recording } from '@/types';
import type { AnnotationDto } from '@/types/annotation';
import type { CopyrightDisputeDto } from '@/types/copyrightDispute';
import type { EmbargoDto } from '@/types/embargo';
import { enrichRecordingUploaderFromRecord } from '@/utils/contributorFields';
import { convertLocalToRecording } from '@/utils/localRecordingToRecording';

function isRecordingCandidate(value: unknown): value is Recording {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.title === 'string';
}

function pickRecordingFromApiBody(apiResponseBody: unknown): Recording | null {
  if (!apiResponseBody || typeof apiResponseBody !== 'object') return null;
  const rootPayload = apiResponseBody as Record<string, unknown>;
  const recordingPayload = rootPayload.data ?? rootPayload.Data;
  if (isRecordingCandidate(recordingPayload)) return recordingPayload;
  if (isRecordingCandidate(rootPayload)) return rootPayload;
  return null;
}

function pickSubmissionDetailRow(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as Record<string, unknown>;
  const failed = r.isSuccess === false || r.IsSuccess === false;
  if (failed) return null;
  const d = r.data ?? r.Data;
  if (d && typeof d === 'object' && !Array.isArray(d)) return d as Record<string, unknown>;
  return null;
}

function extractRecordingListFromApiResponse(res: unknown): Recording[] {
  if (!res || typeof res !== 'object') return [];
  const r = res as Record<string, unknown>;
  if (Array.isArray(r.items)) return r.items as Recording[];
  if (Array.isArray(r.data)) return r.data as Recording[];
  const data = r.data as Record<string, unknown> | undefined;
  if (data && Array.isArray(data.items)) return data.items as Recording[];
  return [];
}

export function useRecordingDetail(id: string | undefined, preloadedRecording: Recording | undefined) {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [annotations, setAnnotations] = useState<AnnotationDto[]>([]);
  const [embargo, setEmbargo] = useState<EmbargoDto | null>(null);
  const [disputes, setDisputes] = useState<CopyrightDisputeDto[]>([]);

  useEffect(() => {
    if (!id) {
      setRecording(null);
      setNotFound(false);
      setLoading(false);
      return;
    }
    if (preloadedRecording?.id === id) {
      setRecording(enrichRecordingUploaderFromRecord(preloadedRecording));
      setNotFound(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        try {
          const response = await recordingService.getRecordingById(id);
          const rec = pickRecordingFromApiBody(response);
          if (rec && !cancelled) {
            setRecording(enrichRecordingUploaderFromRecord(rec));
            return;
          }
        } catch (err) {
          console.warn('GET /Recording/{id} failed, trying submission / list fallbacks', err);
        }

        try {
          const subRes = await submissionService.getSubmissionById(id);
          const row = pickSubmissionDetailRow(subRes);
          if (row && !cancelled) {
            const lookups = await buildSubmissionLookupMaps();
            const local = mapSubmissionToLocalRecording(row, lookups);
            const rec = await convertLocalToRecording(local);
            if (!cancelled) setRecording(enrichRecordingUploaderFromRecord(rec));
            return;
          }
        } catch {
          // ignore
        }

        try {
          const listRes = await recordingService.getRecordings(1, 500);
          const items = extractRecordingListFromApiResponse(listRes);
          const matched = items.find((x) => x.id === id);
          if (matched && !cancelled) {
            setRecording(enrichRecordingUploaderFromRecord(matched));
            return;
          }
        } catch {
          // ignore and try verified-submission fallback below
        }

        try {
          const fallback = await fetchVerifiedSubmissionsAsRecordings();
          const matched = fallback.find((x) => x.id === id);
          if (matched && !cancelled) {
            setRecording(enrichRecordingUploaderFromRecord(matched));
          } else if (!cancelled) {
            setRecording(null);
            setNotFound(true);
          }
        } catch {
          if (!cancelled) {
            setRecording(null);
            setNotFound(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, preloadedRecording]);

  useEffect(() => {
    const recordingId = recording?.id;
    if (!recordingId) {
      setAnnotations([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await annotationApi.getByRecordingId(recordingId);
        if (!cancelled) setAnnotations(rows);
      } catch {
        if (!cancelled) setAnnotations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recording?.id]);

  const loadDisputesForRecording = useCallback(
    async (recordingId: string, cancelledRef?: { current: boolean }) => {
      try {
        const res = await copyrightDisputeApi.list({
          recordingId,
          page: 1,
          pageSize: 50,
        });
        if (cancelledRef?.current) return;
        setDisputes(res.items ?? []);
      } catch {
        if (cancelledRef?.current) return;
        setDisputes([]);
      }
    },
    [],
  );

  useEffect(() => {
    const recordingId = recording?.id;
    if (!recordingId) {
      setDisputes([]);
      return;
    }
    const cancelledRef = { current: false };
    void loadDisputesForRecording(recordingId, cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [loadDisputesForRecording, recording?.id]);

  useEffect(() => {
    const recordingId = recording?.id;
    if (!recordingId) {
      setEmbargo(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const row = await embargoApi.getByRecordingId(recordingId);
        if (!cancelled) setEmbargo(row);
      } catch {
        if (!cancelled) setEmbargo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recording?.id]);

  const refetchDisputes = useCallback(async () => {
    const recordingId = recording?.id;
    if (!recordingId) {
      setDisputes([]);
      return;
    }
    await loadDisputesForRecording(recordingId);
  }, [loadDisputesForRecording, recording?.id]);

  return { recording, loading, notFound, annotations, embargo, disputes, refetchDisputes };
}
