import { useCallback, useMemo, useRef, useState } from "react";
import { expertWorkflowService } from "@/services/expertWorkflowService";
import { migrateVideoDataToVideoData } from "@/utils/helpers";
import type { LocalRecordingMini } from "@/pages/moderation/localRecordingQueue.types";
import { projectModerationLists } from "@/pages/moderation/expertQueueProjection";
import { buildQueueStatusMeta } from "@/pages/moderation/queueStatusMeta";

export function useExpertQueue(opts: {
    userId: string | undefined;
    statusFilter: string;
    dateSort: "newest" | "oldest";
}) {
    const { userId, statusFilter, dateSort } = opts;
    const [items, setItems] = useState<LocalRecordingMini[]>([]);
    const [allItems, setAllItems] = useState<LocalRecordingMini[]>([]);
    const queueLoadInFlightRef = useRef(false);

    const load = useCallback(async () => {
        if (queueLoadInFlightRef.current) return;
        queueLoadInFlightRef.current = true;
        try {
            const all = (await expertWorkflowService.getQueue()) as LocalRecordingMini[];
            const migrated = migrateVideoDataToVideoData(all);
            const { expertItems, visibleItems } = projectModerationLists(migrated, userId, statusFilter, dateSort);
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
