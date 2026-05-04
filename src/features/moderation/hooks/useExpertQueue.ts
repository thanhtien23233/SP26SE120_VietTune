import { useCallback, useMemo, useRef, useState } from 'react';

import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { projectModerationLists } from '@/features/moderation/utils/expertQueueProjection';
import { buildQueueStatusMeta } from '@/features/moderation/utils/queueStatusMeta';
import { expertWorkflowService } from '@/services/expertWorkflowService';
import { migrateVideoDataToVideoData } from '@/utils/helpers';

export function useExpertQueue(opts: {
  userId: string | undefined;
  statusFilter: string;
  dateSort: 'newest' | 'oldest';
}) {
  const { userId, statusFilter, dateSort } = opts;
  const [items, setItems] = useState<LocalRecordingMini[]>([]);
  const [allItems, setAllItems] = useState<LocalRecordingMini[]>([]);
  const queueLoadInFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (queueLoadInFlightRef.current) return;
    queueLoadInFlightRef.current = true;
    try {
      const all = (await expertWorkflowService.getQueue(userId)) as LocalRecordingMini[];
      const migrated = migrateVideoDataToVideoData(all);
      const { expertItems, visibleItems } = projectModerationLists(
        migrated,
        userId,
        statusFilter,
        dateSort,
      );
      setAllItems(expertItems);
      setItems(visibleItems);
    } catch (err) {
      console.error(err);
      setItems([]);
      setAllItems([]);
    } finally {
      queueLoadInFlightRef.current = false;
    }
  }, [userId, statusFilter, dateSort]);

  const queueStatusMeta = useMemo(() => buildQueueStatusMeta(allItems), [allItems]);

  return {
    items,
    setItems,
    allItems,
    setAllItems,
    load,
    queueStatusMeta,
  };
}
