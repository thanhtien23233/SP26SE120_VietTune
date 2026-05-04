import { Check, Info, Upload } from 'lucide-react';
import React from 'react';

import { cn } from '@/utils/helpers';

type UploadWizardStepperProps = {
  showWizard: boolean;
  uploadWizardStep: number;
  canNavigateToStep: (step: number) => boolean;
  onStepChange: (step: number) => void;
};

export default function UploadWizardStepper({
  showWizard,
  uploadWizardStep,
  canNavigateToStep,
  onStepChange,
}: UploadWizardStepperProps) {
  if (!showWizard) return null;

  return (
    <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl sm:p-6">
      <div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100/95 to-secondary-100/90 shadow-sm ring-1 ring-secondary-200/50 sm:h-10 sm:w-10">
          <Upload
            className="h-4 w-4 text-primary-600 sm:h-5 sm:w-5"
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
        <p className="text-sm font-semibold text-neutral-900 sm:text-base">Luồng đóng góp</p>
      </div>

      <div
        className="flex min-h-[44px] items-center gap-3 py-1 sm:hidden"
        aria-live="polite"
        aria-label={`Tiến độ: bước ${uploadWizardStep} trên 3`}
      >
        <div className="flex items-center gap-1.5" aria-hidden>
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              className={cn(
                'h-2.5 w-2.5 shrink-0 rounded-full transition-colors',
                uploadWizardStep === step
                  ? 'bg-primary-600 ring-2 ring-secondary-300/70 ring-offset-2 ring-offset-surface-panel'
                  : uploadWizardStep > step
                    ? 'bg-primary-500'
                    : 'bg-neutral-400/90',
              )}
            />
          ))}
        </div>
        <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-neutral-900">
          Bước {uploadWizardStep}/3:{' '}
          {uploadWizardStep === 1
            ? 'Tải lên'
            : uploadWizardStep === 2
              ? 'Metadata & AI'
              : 'Xem lại & Gửi'}
        </p>
      </div>

      <div
        className="hidden w-full items-start sm:flex sm:gap-0"
        aria-label="Tiến độ ba bước đóng góp"
      >
        {[
          { step: 1 as const, label: 'Tải lên', icon: Upload },
          { step: 2 as const, label: 'Metadata & AI', icon: Info },
          { step: 3 as const, label: 'Xem lại & Gửi', icon: Check },
        ].map(({ step, label, icon: Icon }, index) => {
          const isNavigable = canNavigateToStep(step);
          const isActive = uploadWizardStep === step;
          const isDone = uploadWizardStep > step;
          const showCheck = isDone && !isActive;
          return (
            <React.Fragment key={step}>
              {index > 0 ? (
                <div
                  className={cn(
                    'mx-1 mt-[1.3rem] h-0.5 min-h-[2px] min-w-[0.75rem] flex-1 rounded-full self-start',
                    uploadWizardStep > index
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600'
                      : 'bg-neutral-200/90',
                  )}
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                onClick={() => isNavigable && onStepChange(step)}
                disabled={!isNavigable}
                aria-current={isActive ? 'step' : undefined}
                aria-label={
                  isActive
                    ? `Bước ${step}: ${label} (đang làm)`
                    : isNavigable
                      ? `Chuyển tới bước ${step}: ${label}`
                      : `Bước ${step}: ${label}, chưa thể chuyển tới`
                }
                className={cn(
                  'flex min-h-[44px] min-w-0 max-w-[10.5rem] flex-1 flex-col items-center justify-center gap-1.5 px-1 pt-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel sm:max-w-none',
                  isNavigable ? 'cursor-pointer' : 'cursor-not-allowed',
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full border-2 text-white shadow-sm transition-all',
                    isActive
                      ? 'border-primary-600 bg-gradient-to-br from-primary-600 to-primary-700 ring-2 ring-secondary-300/70 ring-offset-2 ring-offset-surface-panel'
                      : isDone
                        ? 'border-primary-500 bg-primary-100 text-primary-700'
                        : isNavigable
                          ? 'border-secondary-300/80 bg-white text-neutral-700 hover:border-primary-400'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-500 opacity-80',
                  )}
                >
                  {showCheck ? (
                    <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                  )}
                </span>
                <span className="text-center text-[11px] font-semibold leading-tight text-neutral-800 sm:text-xs">
                  <span className="block font-medium text-neutral-600">Bước {step}</span>
                  {label}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
