import { CheckCircle, Trash2 } from "lucide-react";
import type { LocalRecordingMini } from "@/pages/moderation/localRecordingQueue.types";
import { ModerationStatus } from "@/types";

export function ModerationClaimActions({
    item,
    currentUserId,
    onClaim,
    onRequestDelete,
}: {
    item: LocalRecordingMini;
    currentUserId?: string;
    onClaim: (id: string) => void;
    onRequestDelete: (id: string) => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            {item.moderation?.assignBlockedByRbac && (
                <p className="text-xs text-amber-100 bg-amber-900/50 rounded-lg px-3 py-2 border border-amber-500/40 max-w-sm">
                    Claim chỉ lưu trên trình duyệt — API gán (403).
                </p>
            )}
            {(item.moderation?.status === ModerationStatus.PENDING_REVIEW ||
                (item.moderation?.status === ModerationStatus.IN_REVIEW &&
                    item.moderation?.claimedBy === currentUserId)) && (
                <button
                    type="button"
                    onClick={() => item.id && onClaim(item.id)}
                    aria-label={
                        item.moderation?.status === ModerationStatus.IN_REVIEW
                            ? "Tiếp tục kiểm duyệt bản thu đã nhận"
                            : "Nhận kiểm duyệt bản thu này"
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800"
                >
                    <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                    {item.moderation?.status === ModerationStatus.IN_REVIEW
                        ? "Tiếp tục kiểm duyệt"
                        : "Bắt đầu kiểm duyệt"}
                </button>
            )}
            {item.moderation?.status === ModerationStatus.TEMPORARILY_REJECTED && (
                <p className="text-sm text-amber-200/95 bg-amber-900/40 rounded-xl px-4 py-2 border border-amber-600/50">
                    Bạn cần phải chờ Người đóng góp hoàn tất chỉnh sửa bản thu thì bạn mới có thể tái kiểm duyệt bản
                    thu.
                </p>
            )}
            {item.moderation?.status === ModerationStatus.REJECTED && (
                <p className="text-sm text-red-200/95 bg-red-900/40 rounded-xl px-4 py-2 border border-red-600/50">
                    Bản thu đã bị từ chối vĩnh viễn và không thể chỉnh sửa bởi bất kỳ ai.
                </p>
            )}
            {item.id && (
                <button
                    type="button"
                    onClick={() => item.id && onRequestDelete(item.id)}
                    aria-label="Xóa bản thu khỏi hệ thống vĩnh viễn"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-medium cursor-pointer border border-red-600/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800"
                >
                    <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                    Xóa bản thu khỏi hệ thống
                </button>
            )}
        </div>
    );
}
