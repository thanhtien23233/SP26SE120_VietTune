import type { LocalRecordingMini } from "@/pages/moderation/localRecordingQueue.types";
import { ModerationStatus } from "@/types";

export function normalizeQueueStatus(status?: ModerationStatus | string): ModerationStatus | string {
    const raw = String(status ?? "").trim();
    if (!raw) return ModerationStatus.PENDING_REVIEW;
    if (/^\d+$/.test(raw)) {
        const n = Number(raw);
        if (n === 0) return ModerationStatus.PENDING_REVIEW;
        if (n === 1) return ModerationStatus.IN_REVIEW;
        if (n === 2) return ModerationStatus.APPROVED;
        if (n === 3) return ModerationStatus.REJECTED;
        if (n === 4) return ModerationStatus.TEMPORARILY_REJECTED;
        return ModerationStatus.PENDING_REVIEW;
    }
    const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");
    if (normalized === "pending" || normalized === "pending_review") return ModerationStatus.PENDING_REVIEW;
    if (normalized === "in_review" || normalized === "reviewing") return ModerationStatus.IN_REVIEW;
    if (normalized === "approved" || normalized === "accept") return ModerationStatus.APPROVED;
    if (normalized === "rejected" || normalized === "reject" || normalized === "permanently_rejected") {
        return ModerationStatus.REJECTED;
    }
    if (normalized === "temporarily_rejected" || normalized === "temp_rejected" || normalized === "revision_required") {
        return ModerationStatus.TEMPORARILY_REJECTED;
    }
    return raw;
}

/** Same expert + filter + sort rules as queue `load()` — for optimistic list updates without refetch. */
export function projectModerationLists(
    migrated: LocalRecordingMini[],
    userId: string | undefined,
    statusFilter: string,
    dateSort: "newest" | "oldest",
): { expertItems: LocalRecordingMini[]; visibleItems: LocalRecordingMini[] } {
    const expertItems = migrated.filter((r) => {
        const status = normalizeQueueStatus(r.moderation?.status);
        if (r.moderation?.claimedBy === userId) return true;
        if (!r.moderation?.claimedBy && status === ModerationStatus.PENDING_REVIEW) return true;
        if (r.moderation?.reviewerId === userId) return true;
        return false;
    });
    let filtered = expertItems;
    if (statusFilter !== "ALL") {
        filtered = filtered.filter((r) => normalizeQueueStatus(r.moderation?.status) === statusFilter);
    }
    filtered = [...filtered].sort((a, b) => {
        const aDate = (a as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || a.uploadedAt || a.moderation?.reviewedAt || "";
        const bDate = (b as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || b.uploadedAt || b.moderation?.reviewedAt || "";
        const dateA = new Date(aDate || 0).getTime();
        const dateB = new Date(bDate || 0).getTime();
        return dateSort === "newest" ? dateB - dateA : dateA - dateB;
    });
    return { expertItems, visibleItems: filtered };
}
