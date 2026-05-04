import { AlertCircle, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import Button from '@/components/common/Button';
import {
  MODERATION_APPROVE_EXPERT_NOTES_MAX_LENGTH,
  MODERATION_EXPERT_TEXTAREA_MAX_LENGTH,
} from '@/config/validationConstants';

export type ModerationPortalModal =
  | null
  | { kind: 'unclaim'; submissionId: string }
  | { kind: 'approveConfirm'; submissionId: string }
  | { kind: 'rejectConfirm'; submissionId: string }
  | { kind: 'delete'; submissionId: string };

export interface ModerationModalsProps {
  modal: ModerationPortalModal;
  onDismiss: (previous: NonNullable<ModerationPortalModal>) => void;
  approveExpertNotes: string;
  onApproveExpertNotesChange: (value: string) => void;
  rejectConfirmExpertNotes: string;
  onRejectConfirmExpertNotesChange: (value: string) => void;
  rejectType: 'direct' | 'temporary';
  deleteRecordingTitle: string;
  onConfirmUnclaim: () => void;
  onConfirmApprove: () => void;
  onConfirmReject: () => void;
  onConfirmDelete: () => void;
}

export function ModerationModals({
  modal,
  onDismiss,
  approveExpertNotes,
  onApproveExpertNotesChange,
  rejectConfirmExpertNotes,
  onRejectConfirmExpertNotesChange,
  rejectType,
  deleteRecordingTitle,
  onConfirmUnclaim,
  onConfirmApprove,
  onConfirmReject,
  onConfirmDelete,
}: ModerationModalsProps) {
  if (!modal) return null;

  const backdropBase =
    'fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto';

  if (modal.kind === 'unclaim') {
    return createPortal(
      <div
        className={backdropBase}
        role="presentation"
        onClick={() => onDismiss(modal)}
        style={{
          animation: 'fadeIn 0.3s ease-out',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          position: 'fixed',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="moderation-unclaim-dialog-title"
          className="rounded-2xl shadow-2xl border border-secondary-200/70 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform outline-none bg-surface-panel animate-[slideUp_0.3s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-secondary-200/80 bg-gradient-to-b from-[#FFF8EA] to-cream-50/80">
            <h2
              id="moderation-unclaim-dialog-title"
              className="text-2xl font-bold text-neutral-900"
            >
              Xác nhận hủy nhận bài
            </h2>
            <button
              type="button"
              onClick={() => onDismiss(modal)}
              className="p-1.5 rounded-full hover:bg-secondary-100 transition-colors duration-200 text-neutral-700 hover:text-neutral-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          </div>

          <div className="overflow-y-auto p-6">
            <div className="rounded-2xl shadow-md border border-secondary-200/70 bg-gradient-to-b from-surface-panel to-secondary-50/50 p-8">
              <div className="flex flex-col items-center gap-4 mb-2">
                <div className="p-3 bg-primary-100 rounded-full flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-primary-600" />
                </div>
                <p className="text-neutral-700 text-center leading-relaxed">
                  Bạn có chắc muốn hủy nhận bài này? Bản thu sẽ trở về hàng đợi PENDING_REVIEW để chuyên
                  gia khác có thể nhận.
                </p>
                <p className="text-neutral-600 text-center text-sm">
                  Tiến trình kiểm duyệt hiện tại sẽ bị hủy.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 p-6 border-t border-secondary-200/80 bg-gradient-to-b from-white to-secondary-50/30">
            <button
              type="button"
              onClick={() => onDismiss(modal)}
              className="px-6 py-2.5 border border-secondary-200/80 bg-white text-neutral-800 rounded-full font-medium transition-colors duration-200 hover:bg-secondary-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
              aria-label="Giữ nguyên, đóng hộp thoại"
            >
              Giữ nguyên
            </button>
            <button
              type="button"
              onClick={onConfirmUnclaim}
              className="px-6 py-2.5 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full font-medium transition-colors duration-200 shadow-md hover:shadow-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Hủy nhận bài
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  if (modal.kind === 'approveConfirm') {
    return createPortal(
      <div
        className={backdropBase}
        role="presentation"
        onClick={() => onDismiss(modal)}
        style={{
          animation: 'fadeIn 0.3s ease-out',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          position: 'fixed',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="moderation-approve-dialog-title"
          aria-describedby="moderation-approve-dialog-desc moderation-approve-notes-hint moderation-approve-shortcuts"
          className="rounded-2xl shadow-2xl border border-secondary-200/70 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform bg-surface-panel animate-[slideUp_0.3s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-secondary-200/80 bg-gradient-to-b from-[#FFF8EA] to-cream-50/80">
            <h2
              id="moderation-approve-dialog-title"
              className="text-2xl font-bold text-neutral-900"
            >
              Xác nhận phê duyệt
            </h2>
            <button
              type="button"
              onClick={() => onDismiss(modal)}
              className="p-1.5 rounded-full hover:bg-secondary-100 transition-colors duration-200 text-neutral-700 hover:text-neutral-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
              aria-label="Đóng hộp thoại phê duyệt"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="overflow-y-auto p-6">
            <div className="rounded-2xl shadow-md border border-secondary-200/70 bg-gradient-to-b from-surface-panel to-secondary-50/50 p-8">
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="p-3 bg-primary-100 rounded-full flex-shrink-0" aria-hidden>
                  <AlertCircle className="h-8 w-8 text-primary-600" />
                </div>
                <h3
                  id="moderation-approve-dialog-desc"
                  className="text-xl font-semibold text-neutral-900 text-center"
                >
                  Bạn có chắc chắn muốn phê duyệt bản thu này?
                </h3>
                <div className="text-neutral-800 text-center text-sm space-y-1 max-w-lg">
                  <p>Hành động này sẽ đưa bản thu vào danh sách đã được kiểm duyệt.</p>
                </div>
              </div>
              <div className="mt-4 text-left max-w-xl mx-auto w-full">
                <label
                  htmlFor="moderation-approve-expert-notes"
                  className="block text-sm font-medium text-neutral-800 mb-2"
                >
                  Ghi chú chuyên gia{' '}
                  <span className="font-normal text-neutral-600">(không bắt buộc)</span>
                </label>
                <textarea
                  id="moderation-approve-expert-notes"
                  value={approveExpertNotes}
                  onChange={(e) => onApproveExpertNotesChange(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      void onConfirmApprove();
                    }
                  }}
                  rows={4}
                  maxLength={MODERATION_APPROVE_EXPERT_NOTES_MAX_LENGTH}
                  className="w-full px-4 py-2 border border-neutral-400 rounded-lg text-neutral-900 placeholder:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 bg-surface-panel"
                  placeholder="Ghi chú nội bộ về quyết định phê duyệt (lưu cục bộ, Phase 1)…"
                  aria-describedby="moderation-approve-notes-hint moderation-approve-shortcuts"
                />
                <p id="moderation-approve-notes-hint" className="mt-2 text-xs text-neutral-700">
                  Ghi chú được lưu cùng trạng thái kiểm duyệt (Phase 1 Spike) và hiển thị trong chi
                  tiết bản thu.
                </p>
                <p id="moderation-approve-shortcuts" className="mt-1 text-xs text-neutral-600">
                  Phím tắt: Ctrl+Enter hoặc ⌘+Enter để xác nhận phê duyệt.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 p-6 border-t border-secondary-200/80 bg-gradient-to-b from-white to-secondary-50/30">
            <button
              type="button"
              onClick={() => onDismiss(modal)}
              className="px-6 py-2.5 border border-secondary-200/80 bg-white text-neutral-900 rounded-full font-medium hover:bg-secondary-50 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void onConfirmApprove()}
              className="px-6 py-2.5 bg-green-700 text-white rounded-full font-medium hover:bg-green-600 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              Xác nhận phê duyệt
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  if (modal.kind === 'rejectConfirm') {
    return createPortal(
      <div
        className={backdropBase}
        role="presentation"
        onClick={() => onDismiss(modal)}
        style={{
          animation: 'fadeIn 0.3s ease-out',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          position: 'fixed',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="moderation-reject-confirm-title"
          aria-describedby="moderation-reject-confirm-desc moderation-reject-confirm-notes-hint moderation-reject-confirm-shortcuts"
          className="rounded-2xl shadow-2xl border border-secondary-200/70 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform bg-surface-panel animate-[slideUp_0.3s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-secondary-200/80 bg-gradient-to-b from-[#FFF8EA] to-cream-50/80">
            <h2
              id="moderation-reject-confirm-title"
              className="text-2xl font-bold text-neutral-900"
            >
              Xác nhận từ chối
            </h2>
            <button
              type="button"
              onClick={() => onDismiss(modal)}
              className="p-1.5 rounded-full hover:bg-secondary-100 transition-colors duration-200 text-neutral-700 hover:text-neutral-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
              aria-label="Đóng hộp thoại xác nhận từ chối"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="overflow-y-auto p-6">
            <div className="rounded-2xl shadow-md border border-secondary-200/70 bg-gradient-to-b from-surface-panel to-secondary-50/50 p-8">
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="p-3 bg-primary-100 rounded-full flex-shrink-0" aria-hidden>
                  <AlertCircle className="h-8 w-8 text-primary-600" />
                </div>
                <h3
                  id="moderation-reject-confirm-desc"
                  className="text-xl font-semibold text-neutral-900 text-center"
                >
                  Bạn có chắc chắn muốn{' '}
                  {rejectType === 'direct' ? 'từ chối vĩnh viễn' : 'từ chối tạm thời'} bản thu này?
                </h3>
                <div className="text-neutral-800 text-center text-sm space-y-1 max-w-lg">
                  <p>
                    {rejectType === 'direct'
                      ? 'Bản thu sẽ bị từ chối vĩnh viễn. Người đóng góp sẽ không thể chỉnh sửa bản thu.'
                      : 'Bản thu sẽ bị từ chối tạm thời. Người đóng góp sẽ có thể chỉnh sửa bản thu.'}
                  </p>
                </div>
              </div>
              <div className="mt-4 text-left max-w-xl mx-auto w-full">
                <label
                  htmlFor="moderation-reject-confirm-expert-notes"
                  className="block text-sm font-medium text-neutral-800 mb-2"
                >
                  Ghi chú chuyên gia <span className="text-red-800 font-semibold">(nên điền)</span>
                </label>
                <textarea
                  id="moderation-reject-confirm-expert-notes"
                  value={rejectConfirmExpertNotes}
                  onChange={(e) => onRejectConfirmExpertNotesChange(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      void onConfirmReject();
                    }
                  }}
                  rows={4}
                  maxLength={MODERATION_EXPERT_TEXTAREA_MAX_LENGTH}
                  className="w-full px-4 py-2 border border-neutral-400 rounded-lg text-neutral-900 placeholder:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 bg-surface-panel"
                  placeholder="Tóm tắt hoặc bổ sung ghi chú cho hồ sơ kiểm duyệt…"
                  aria-describedby="moderation-reject-confirm-notes-hint moderation-reject-confirm-shortcuts"
                />
                <p id="moderation-reject-confirm-notes-hint" className="mt-2 text-xs text-neutral-800">
                  Nội dung được lưu cục bộ (Phase 1 Spike). Đã sao chép từ lý do từ chối — bạn có thể
                  chỉnh sửa.
                </p>
                <p id="moderation-reject-confirm-shortcuts" className="mt-1 text-xs text-neutral-600">
                  Phím tắt: Ctrl+Enter hoặc ⌘+Enter để xác nhận từ chối.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 p-6 border-t border-secondary-200/80 bg-gradient-to-b from-white to-secondary-50/30">
            <button
              type="button"
              onClick={() => onDismiss(modal)}
              className="px-6 py-2.5 border border-secondary-200/80 bg-white text-neutral-900 rounded-full font-medium hover:bg-secondary-50 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
            >
              Hủy
            </button>
            <Button
              type="button"
              onClick={() => void onConfirmReject()}
              variant="danger"
              className="px-6 py-2.5"
            >
              Xác nhận {rejectType === 'direct' ? 'từ chối vĩnh viễn' : 'từ chối tạm thời'}
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  if (modal.kind === 'delete') {
    return createPortal(
      <div
        className={backdropBase}
        role="presentation"
        onClick={() => onDismiss(modal)}
        style={{
          animation: 'fadeIn 0.3s ease-out',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          position: 'fixed',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="moderation-delete-dialog-title"
          className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-md w-full overflow-hidden flex flex-col pointer-events-auto transform outline-none bg-neutral-50 animate-[slideUp_0.3s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-neutral-700 to-neutral-800">
            <h2 id="moderation-delete-dialog-title" className="text-xl font-bold text-white">
              Xóa bản thu khỏi hệ thống
            </h2>
            <button
              type="button"
              onClick={() => onDismiss(modal)}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto p-6">
            <div
              className="rounded-2xl shadow-md border border-neutral-200 p-6 bg-surface-panel"
            >
              <div className="flex flex-col items-center gap-4 mb-2">
                <div className="p-3 bg-red-100 rounded-full flex-shrink-0">
                  <Trash2 className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-800 text-center">
                  Bạn có chắc muốn xóa bản thu &quot;{deleteRecordingTitle}&quot; khỏi hệ thống?
                </h3>
                <p className="text-neutral-600 text-center text-sm">
                  Bản thu sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200 bg-neutral-50/50">
            <button
              type="button"
              onClick={() => onDismiss(modal)}
              className="px-6 py-2.5 bg-neutral-200 text-neutral-800 rounded-full font-medium hover:bg-neutral-300 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Hủy
            </button>
            <Button
              type="button"
              onClick={onConfirmDelete}
              aria-label="Xác nhận xóa bản thu vĩnh viễn"
              variant="danger"
              className="inline-flex items-center gap-2 px-6 py-2.5"
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              Xóa bản thu
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return null;
}

export default ModerationModals;
