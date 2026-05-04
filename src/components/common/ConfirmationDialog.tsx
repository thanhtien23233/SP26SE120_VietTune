import { AlertCircle, X } from 'lucide-react';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonStyle?: string;
  cancelButtonStyle?: string;
  maxWidth?: string;
  zIndex?: string;
  icon?: React.ReactNode;
  closeOnBackdropClick?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  confirmButtonStyle = 'bg-primary-600 text-white hover:bg-primary-500',
  cancelButtonStyle = 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300',
  maxWidth = 'max-w-3xl',
  zIndex = 'z-50',
  icon,
  closeOnBackdropClick = true,
}: ConfirmationDialogProps) {
  // Disable body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      // Cleanup
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultIcon = icon || (
    <div className="p-3 bg-primary-100/90 rounded-xl flex-shrink-0 shadow-sm">
      <AlertCircle className="h-8 w-8 text-primary-600" strokeWidth={2.5} />
    </div>
  );

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const overlayContent = (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto`}
      onClick={handleBackdropClick}
      style={{
        animation: isOpen ? 'fadeIn 0.3s ease-out' : 'none',
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
        className={`rounded-2xl border border-neutral-300/80 bg-surface-panel shadow-2xl backdrop-blur-sm ${maxWidth} w-full overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform`}
        style={{
          animation: isOpen ? 'slideUp 0.3s ease-out' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6">
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <div className="flex flex-col items-center gap-4 mb-2">
              {defaultIcon}
              {typeof message === 'string' ? (
                <h3 className="text-xl font-semibold text-neutral-900 text-center">{message}</h3>
              ) : (
                <div className="text-xl font-semibold text-neutral-900 text-center">{message}</div>
              )}
              {description && (
                <div className="text-neutral-700 font-medium text-center space-y-1">
                  {typeof description === 'string' ? <p>{description}</p> : description}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200/80 bg-neutral-50/50">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer ${cancelButtonStyle || 'bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800'}`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 cursor-pointer ${confirmButtonStyle || 'bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white shadow-primary-600/40'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  // Render using portal to ensure overlay is at top level
  return createPortal(overlayContent, document.body);
}
