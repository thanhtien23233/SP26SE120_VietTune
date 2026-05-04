import { useCallback, useEffect, useState } from 'react';

import { fetchApprovedSubmissionsForExpert } from '@/services/expertModerationApi';
import { recordingRequestService } from '@/services/recordingRequestService';
import type { DeleteRecordingRequest, EditSubmissionForReview } from '@/types';
import type { LocalRecording } from '@/types';
import { migrateVideoDataToVideoData } from '@/utils/helpers';

export function useApprovedRecordings(userId: string | undefined) {
  const [items, setItems] = useState<LocalRecording[]>([]);
  const [forwardedDeletes, setForwardedDeletes] = useState<DeleteRecordingRequest[]>([]);
  const [editSubmissions, setEditSubmissions] = useState<EditSubmissionForReview[]>([]);

  const load = useCallback(async () => {
    try {
      const list = await fetchApprovedSubmissionsForExpert();
      const migrated = migrateVideoDataToVideoData(list as LocalRecording[]);
      setItems(migrated.filter((r): r is LocalRecording => r != null));
    } catch (err) {
      console.error(err);
      setItems([]);
    }
  }, []);

  const refreshRequestQueues = useCallback(async () => {
    if (!userId) return;
    try {
      const [fd, es] = await Promise.all([
        recordingRequestService.getForwardedDeleteRequestsForExpert(userId),
        recordingRequestService.getPendingEditSubmissionsForExpert(),
      ]);
      setForwardedDeletes(fd);
      setEditSubmissions(es);
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const fetchAll = () => {
      void load();
      void refreshRequestQueues();
    };
    fetchAll();
    const t = setInterval(fetchAll, 30_000);
    return () => clearInterval(t);
  }, [load, refreshRequestQueues, userId]);

  return { items, load, forwardedDeletes, editSubmissions, refreshRequestQueues };
}
