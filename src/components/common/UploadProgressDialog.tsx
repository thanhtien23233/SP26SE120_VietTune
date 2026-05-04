import { Upload } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import LoadingSpinner from '@/components/common/LoadingSpinner';

interface UploadProgressDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  description?: string;
  maxWidth?: string;
  zIndex?: string;
}

/**
 * Pop-up "đang đóng góp" — UI/UX giống ConfirmationDialog.
 * Hiển thị khi file âm thanh/video đang được upload; không cho đóng (không nút X, không ESC, không click backdrop).
 */
export default function UploadProgressDialog({
  isOpen,
  title = 'Đang đóng góp',
  message = 'File âm thanh/video đang được đóng góp lên hệ thống.',
  description = 'Vui lòng không đóng trang hoặc thoát cho đến khi hoàn tất.',
  maxWidth = 'max-w-3xl',
  zIndex = 'z-50',
}: UploadProgressDialogProps) {
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const overlayContent = (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto`}
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
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-progress-title"
      aria-describedby="upload-progress-message"
    >
      <div
        className={`rounded-2xl border border-neutral-300/80 bg-surface-panel shadow-2xl backdrop-blur-sm ${maxWidth} w-full overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform`}
        style={{
          animation: 'slideUp 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — giống ConfirmationDialog, không có nút đóng */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
          <h2 id="upload-progress-title" className="text-2xl font-bold text-white">
            {title}
          </h2>
        </div>

        {/* Content — giống ConfirmationDialog */}
        <div className="overflow-y-auto p-6">
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <div className="flex flex-col items-center gap-4 mb-2">
              <div className="p-3 bg-primary-100/90 rounded-full flex-shrink-0 shadow-sm">
                <Upload className="h-8 w-8 text-primary-600 animate-pulse" strokeWidth={2.5} />
              </div>
              <h3
                id="upload-progress-message"
                className="text-xl font-semibold text-neutral-900 text-center"
              >
                {message}
              </h3>
              {description && (
                <p className="text-neutral-700 font-medium text-center">{description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer — không có nút, chỉ spinner + "Vui lòng chờ..." */}
        <div className="flex flex-col items-center justify-center gap-3 p-6 border-t border-neutral-200/80 bg-neutral-50/50">
          <LoadingSpinner size="lg" />
          <p className="text-neutral-600 font-medium">Vui lòng chờ...</p>
        </div>
      </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
}
