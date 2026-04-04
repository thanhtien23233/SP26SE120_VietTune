import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

const backdropStyle: CSSProperties = {
    animation: "fadeIn 0.3s ease-out",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100vw",
    height: "100vh",
    position: "fixed",
};

export function ModerationRejectReasonFormPortal({
    submissionId,
    rejectType,
    onRejectTypeChange,
    rejectNote,
    onRejectNoteChange,
    onCancel,
    onConfirm,
}: {
    submissionId: string | null;
    rejectType: "direct" | "temporary";
    onRejectTypeChange: (v: "direct" | "temporary") => void;
    rejectNote: string;
    onRejectNoteChange: (v: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    if (!submissionId) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
            style={backdropStyle}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="moderation-reject-dialog-title"
                className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-lg w-full p-6 pointer-events-auto transform outline-none"
                style={{
                    backgroundColor: "#FFF2D6",
                    animation: "slideUp 0.3s ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 id="moderation-reject-dialog-title" className="text-xl font-semibold mb-4 text-neutral-800">
                    Từ chối bản thu
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Loại từ chối</label>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 select-none">
                                <input
                                    type="radio"
                                    name="rejectType"
                                    value="direct"
                                    checked={rejectType === "direct"}
                                    onChange={(e) => onRejectTypeChange(e.target.value as "direct" | "temporary")}
                                    aria-label="Từ chối vĩnh viễn"
                                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                />
                                <div>
                                    <span className="text-neutral-800 font-medium">Từ chối vĩnh viễn</span>
                                    <p className="text-sm text-neutral-600">Dùng khi sai thông tin trầm trọng, bị trùng file, v.v.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 select-none">
                                <input
                                    type="radio"
                                    name="rejectType"
                                    value="temporary"
                                    checked={rejectType === "temporary"}
                                    onChange={(e) => onRejectTypeChange(e.target.value as "direct" | "temporary")}
                                    aria-label="Từ chối tạm thời"
                                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                />
                                <div>
                                    <span className="text-neutral-800 font-medium">Từ chối tạm thời</span>
                                    <p className="text-sm text-neutral-600">Người đóng góp có thể chỉnh sửa và gửi lại</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="moderation-reject-reason" className="block text-sm font-medium text-neutral-800 mb-2">
                            Lý do từ chối
                        </label>
                        <p id="reject-dialog-type-hint" className="text-xs text-neutral-700 mb-2">
                            Bắt buộc nhập lý do trước khi xác nhận từ chối.
                        </p>
                        <textarea
                            id="moderation-reject-reason"
                            value={rejectNote}
                            onChange={(e) => onRejectNoteChange(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                            style={{ backgroundColor: "#FFFCF5" }}
                            placeholder={
                                rejectType === "temporary"
                                    ? "Nhập lý do từ chối và ghi chú những điểm cần chỉnh sửa..."
                                    : "Nhập lý do từ chối..."
                            }
                            aria-required="true"
                            aria-describedby="reject-dialog-type-hint"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="px-4 py-2 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        >
                            {rejectType === "direct" ? "Từ chối vĩnh viễn" : "Từ chối tạm thời"}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
