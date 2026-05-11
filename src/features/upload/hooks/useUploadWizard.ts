import { useCallback, useState } from 'react';

import {
  canNavigateToWizardStep,
  type WizardNavigationParams,
} from '@/features/upload/uploadFormValidation';

type UseUploadWizardParams = Omit<WizardNavigationParams, 'uploadWizardStep'>;

function scrollToTopRespectMotion(): void {
  const behavior =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
  window.scrollTo({ top: 0, behavior });
}

export function useUploadWizard(params: UseUploadWizardParams) {
  const {
    isFormDisabled,
    isEditMode,
    isAsyncNavigationBlocked,
    file,
    existingMediaSrc,
    createdRecordingId,
    title,
    artist,
    artistUnknown,
    composer,
    composerUnknown,
    performanceType,
    vocalStyle,
    requiresInstruments,
    instruments,
    mediaType,
  } = params;

  const [uploadWizardStep, setUploadWizardStep] = useState(1);

  const canNavigateToStep = useCallback(
    (targetStep: number): boolean => {
      return canNavigateToWizardStep(targetStep, {
        isFormDisabled,
        isEditMode,
        isAsyncNavigationBlocked,
        file,
        existingMediaSrc,
        createdRecordingId,
        title,
        artist,
        artistUnknown,
        composer,
        composerUnknown,
        performanceType,
        vocalStyle,
        requiresInstruments,
        instruments,
        mediaType,
        uploadWizardStep,
      });
    },
    [
      artist,
      artistUnknown,
      composer,
      composerUnknown,
      createdRecordingId,
      existingMediaSrc,
      file,
      instruments,
      isAsyncNavigationBlocked,
      isEditMode,
      isFormDisabled,
      mediaType,
      performanceType,
      requiresInstruments,
      title,
      uploadWizardStep,
      vocalStyle,
    ],
  );

  const goToStep = useCallback((step: number) => {
    setUploadWizardStep(step);
  }, []);

  const goNext = useCallback(() => {
    scrollToTopRespectMotion();
    setUploadWizardStep((step) => Math.min(3, step + 1));
  }, []);

  const goPrev = useCallback(() => {
    scrollToTopRespectMotion();
    setUploadWizardStep((step) => Math.max(1, step - 1));
  }, []);

  const reset = useCallback(() => {
    setUploadWizardStep(1);
  }, []);

  return {
    uploadWizardStep,
    setUploadWizardStep,
    canNavigateToStep,
    goToStep,
    goNext,
    goPrev,
    reset,
  };
}
