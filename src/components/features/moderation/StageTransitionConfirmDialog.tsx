import { AlertCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export type StageTransitionRequest = {
  submissionId: string;
  fromStep: 1 | 2;
};

export default function StageTransitionConfirmDialog({
  request,
  onCancel,
  onConfirm,
}: {
  request: StageTransitionRequest | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!request) return null;

  const fromLabel = request.fromStep === 1 ? 'Sàng lọc' : 'Xác minh';
  const toLabel = request.fromStep === 1 ? 'Xác minh' : 'Xuất bản';

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-transition-confirm-title"
        aria-describedby="stage-transition-confirm-desc"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-secondary-200/70 bg-surface-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-secondary-200/80 bg-gradient-to-b from-[#FFF8EA] to-cream-50/80 p-5">
          <h2 id="stage-transition-confirm-title" className="text-xl font-bold text-neutral-900">
            Xác nhận chuyển giai đoạn
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1.5 text-neutral-700 transition-colors hover:bg-secondary-100 hover:text-neutral-900"
            aria-label="Đóng hộp thoại xác nhận chuyển giai đoạn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-secondary-200/70 bg-gradient-to-b from-surface-panel to-secondary-50/50 p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-full bg-primary-100 p-2">
                <AlertCircle className="h-5 w-5 text-primary-600" />
              </div>
              <p id="stage-transition-confirm-desc" className="text-sm text-neutral-800">
                Bạn sắp chuyển bản thu từ giai đoạn <strong>{fromLabel}</strong> sang{' '}
                <strong>{toLabel}</strong>.
              </p>
            </div>
            <p className="text-xs text-neutral-600">
              Hệ thống sẽ gọi API chuyển giai đoạn và ghi AuditLog cho hành động này.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-secondary-200/80 bg-gradient-to-b from-white to-secondary-50/30 p-5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-secondary-200/80 bg-white px-5 py-2 text-sm font-medium text-neutral-900 hover:bg-secondary-50"
          >
            Ở lại bước hiện tại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-primary-700 px-5 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            Xác nhận chuyển giai đoạn
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
