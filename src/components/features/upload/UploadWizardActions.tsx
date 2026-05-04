import { Shield, Upload } from 'lucide-react';

type UploadWizardActionsProps = {
  showFinalActions: boolean;
  showWizard: boolean;
  uploadWizardStep: number;
  isAnalyzing: boolean;
  isSubmitting: boolean;
  isFormDisabled: boolean;
  isApprovedEdit?: boolean;
  isFormComplete: boolean;
  canNavigateToStep: (step: number) => boolean;
  onReset: () => void;
  onSaveDraft: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function UploadWizardActions({
  showFinalActions,
  showWizard,
  uploadWizardStep,
  isAnalyzing,
  isSubmitting,
  isFormDisabled,
  isApprovedEdit,
  isFormComplete,
  canNavigateToStep,
  onReset,
  onSaveDraft,
  onPrev,
  onNext,
}: UploadWizardActionsProps) {
  return (
    <>
      {showFinalActions && (
        <div className="flex flex-col items-center justify-end gap-4 pt-6 sm:flex-row">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onReset}
              disabled={isSubmitting || isFormDisabled}
              className="rounded-full border-2 border-primary-600 bg-gradient-to-br from-surface-panel to-secondary-50/50 px-6 py-2.5 text-neutral-800 shadow-sm transition-colors hover:border-primary-500 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Đặt lại
            </button>
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isAnalyzing || isSubmitting || isFormDisabled}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-secondary-300/80 bg-secondary-100/90 px-6 py-2.5 font-medium text-neutral-800 shadow-sm transition-all duration-200 hover:bg-secondary-200/80 hover:shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              Lưu
            </button>
            <button
              type="submit"
              disabled={isAnalyzing || isSubmitting || isFormDisabled}
              title={
                isFormDisabled
                  ? isApprovedEdit
                    ? 'Bạn cần có tài khoản Người đóng góp hoặc Chuyên gia để chỉnh sửa bản thu'
                    : 'Bạn cần có tài khoản Người đóng góp để đóng góp bản thu'
                  : !isFormComplete
                    ? 'Vui lòng hoàn thành các trường bắt buộc'
                    : undefined
              }
              className="flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 px-8 py-2.5 font-medium text-white shadow-xl shadow-primary-600/40 transition-all duration-300 hover:scale-110 hover:from-primary-500 hover:to-primary-600 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" strokeWidth={2.5} />
                  {isApprovedEdit ? 'Hoàn tất chỉnh sửa' : 'Đóng góp'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showWizard && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-secondary-200/50 pt-4">
          <button
            type="button"
            onClick={onPrev}
            disabled={uploadWizardStep === 1}
            className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-secondary-300/80 bg-gradient-to-br from-surface-panel to-secondary-50/50 px-4 py-2 font-medium text-neutral-800 shadow-sm transition-all hover:border-secondary-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Quay lại
          </button>
          <div className="flex flex-wrap gap-3">
            {uploadWizardStep >= 2 && uploadWizardStep < 3 && (
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isAnalyzing || isSubmitting || isFormDisabled}
                className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-secondary-300/80 bg-secondary-100/90 px-6 py-2 font-medium text-neutral-800 shadow-sm transition-all duration-200 hover:bg-secondary-200/80 hover:shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Shield className="h-4 w-4" />
                Lưu
              </button>
            )}
            {uploadWizardStep < 3 && (
              <button
                type="button"
                onClick={onNext}
                disabled={!canNavigateToStep(uploadWizardStep + 1)}
                className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-2 font-medium text-white shadow-lg shadow-primary-600/30 transition-all hover:from-primary-500 hover:to-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tiếp theo
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
