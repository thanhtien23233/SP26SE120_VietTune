import { useCallback, useState } from 'react';

type UseUploadWizardParams = {
  isFormDisabled: boolean;
  isEditMode: boolean;
  file: File | null;
  existingMediaSrc: string | null;
  createdRecordingId: string | null;
  title: string;
  artist: string;
  artistUnknown: boolean;
  composer: string;
  composerUnknown: boolean;
  performanceType: string;
  vocalStyle: string;
  requiresInstruments: boolean;
  instruments: string[];
};

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
  } = params;

  const [uploadWizardStep, setUploadWizardStep] = useState(1);

  const canNavigateToStep = useCallback(
    (targetStep: number): boolean => {
      if (isFormDisabled) return false;
      if (targetStep <= uploadWizardStep) return true;

      if (targetStep >= 2) {
        const hasMedia = file || (isEditMode && !!existingMediaSrc);
        if (!hasMedia) return false;
        if (!isEditMode && !createdRecordingId) return false;
      }

      if (isEditMode) return true;

      if (targetStep >= 3) {
        if (!title.trim()) return false;
        if (!artistUnknown && !artist.trim()) return false;
        if (!composerUnknown && !composer.trim()) return false;
        if (!performanceType) return false;
        if (
          (performanceType === 'vocal_accompaniment' || performanceType === 'acappella') &&
          !vocalStyle
        ) {
          return false;
        }
        if (requiresInstruments && instruments.length === 0) return false;
      }

      return true;
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
      isEditMode,
      isFormDisabled,
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
