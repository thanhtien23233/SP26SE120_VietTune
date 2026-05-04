import { AlertCircle, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export type UploadConfirmDialogsProps = {
  showConfirmDialog: boolean;
  onCloseConfirm: () => void;
  onConfirmFinalSubmit: () => void | Promise<void>;
  isApprovedEdit?: boolean;
  submitStatus: 'idle' | 'success' | 'error';
  submitMessage: string;
  onDismissSuccess: () => void;
  onSuccessHome: () => void;
  onSuccessContributions: () => void;
};

export default function UploadConfirmDialogs({
  showConfirmDialog,
  onCloseConfirm,
  onConfirmFinalSubmit,
  isApprovedEdit,
  submitStatus,
  submitMessage,
  onDismissSuccess,
  onSuccessHome,
  onSuccessContributions,
}: UploadConfirmDialogsProps) {
  return (
    <>
      {showConfirmDialog &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
            onClick={onCloseConfirm}
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
              className="rounded-2xl border border-neutral-300/80 bg-surface-panel shadow-2xl backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform"
              style={{
                animation: 'slideUp 0.3s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                <h2 className="text-2xl font-bold text-white">
                  {isApprovedEdit ? 'Xác nhận chỉnh sửa' : 'Xác nhận đóng góp'}
                </h2>
                <button
                  onClick={onCloseConfirm}
                  className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/85 to-secondary-50/45 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl">
                  <div className="flex flex-col items-center gap-4 mb-2">
                    <div className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-100/95 to-secondary-100/90 p-3 shadow-sm ring-1 ring-secondary-200/50">
                      <AlertCircle className="h-8 w-8 text-primary-600" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-semibold text-neutral-900 text-center">
                      Hãy đảm bảo chính xác thông tin đã nhập, bạn nhé!
                    </h3>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200/80 bg-neutral-50/50">
                <button
                  onClick={onCloseConfirm}
                  className="px-6 py-2.5 bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Xem lại
                </button>
                <button
                  onClick={() => void onConfirmFinalSubmit()}
                  className="px-6 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
                >
                  {isApprovedEdit ? 'Hoàn tất chỉnh sửa' : 'Gửi'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {submitStatus === 'success' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
            onClick={onDismissSuccess}
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
              className="rounded-2xl border border-neutral-300/80 bg-surface-panel shadow-2xl backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform"
              style={{
                animation: 'slideUp 0.3s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                <h2 className="text-2xl font-bold text-white">
                  {isApprovedEdit ? 'Chỉnh sửa thành công' : 'Đóng góp thành công'}
                </h2>
                <button
                  onClick={onDismissSuccess}
                  className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/85 to-secondary-50/45 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl">
                  <div className="flex flex-col items-center gap-4 mb-2">
                    <div className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100/95 to-secondary-100/80 p-3 shadow-sm ring-1 ring-secondary-200/50">
                      <Check className="h-8 w-8 text-emerald-600" strokeWidth={2.5} />
                    </div>
                    <div className="text-xl font-semibold text-neutral-900 text-center space-y-1">
                      {submitMessage ? (
                        submitMessage
                          .split(/(?<=[.!])\s+/)
                          .filter((s) => s.trim())
                          .map((sentence, index) => <p key={index}>{sentence.trim()}</p>)
                      ) : (
                        <p>
                          {isApprovedEdit
                            ? 'Cảm ơn bạn đã cập nhật bản thu!'
                            : 'Cảm ơn bạn đã đóng góp bản thu!'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200/80 bg-neutral-50/50">
                <button
                  onClick={onSuccessHome}
                  className="px-6 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
                >
                  Về trang chủ
                </button>
                <button
                  onClick={onSuccessContributions}
                  className="px-6 py-2.5 bg-secondary-100/90 hover:bg-secondary-200/90 text-secondary-800 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Đóng góp của bạn
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
