import { describe, expect, it } from 'vitest';

import {
  canNavigateToWizardStep,
  collectUploadFieldErrors,
  getWizardTransitionFieldErrors,
  isWizardMetadataComplete,
  validateUploadFormState,
} from './uploadFormValidation';

const baseCtx = {
  isEditMode: false,
  file: new File([new Uint8Array([1])], 'a.mp3', { type: 'audio/mpeg' }),
  mediaType: 'audio' as const,
  title: 'T',
  artist: 'A',
  artistUnknown: false,
  composer: 'C',
  composerUnknown: false,
  performanceType: 'instrumental',
  vocalStyle: '',
  requiresInstruments: false,
  instruments: [] as string[],
};

describe('collectUploadFieldErrors / validateUploadFormState', () => {
  it('returns ok when all required fields satisfied', () => {
    expect(validateUploadFormState(baseCtx).ok).toBe(true);
    expect(Object.keys(collectUploadFieldErrors(baseCtx)).length).toBe(0);
  });

  it('requires composer when not marked unknown', () => {
    const ctx = { ...baseCtx, composer: '', composerUnknown: false };
    const r = validateUploadFormState(ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.composer).toBeDefined();
      expect(r.missingFields).toContain('Nhạc sĩ/Tác giả');
    }
  });
});

describe('wizard step transitions use canonical field errors', () => {
  it('step 2 Next includes composer (fixes drift vs stepper)', () => {
    const ctx = {
      ...baseCtx,
      composer: '',
      composerUnknown: false,
    };
    const step2 = getWizardTransitionFieldErrors(
      { ...ctx, existingMediaSrc: null },
      2,
      { isEditMode: false },
    );
    expect(step2.composer).toBeDefined();
  });

  it('edit mode step 2 skips inline validation', () => {
    const bad = { ...baseCtx, title: '', composer: '' };
    const step2 = getWizardTransitionFieldErrors(
      { ...bad, existingMediaSrc: 'https://x' },
      2,
      { isEditMode: true },
    );
    expect(Object.keys(step2).length).toBe(0);
  });
});

describe('canNavigateToWizardStep', () => {
  const navBase = {
    ...baseCtx,
    uploadWizardStep: 1,
    isFormDisabled: false,
    isAsyncNavigationBlocked: false,
    existingMediaSrc: null as string | null,
    createdRecordingId: 'rec-1',
  };

  it('blocks step 3 when metadata incomplete', () => {
    const p = {
      ...navBase,
      composer: '',
      composerUnknown: false,
    };
    expect(canNavigateToWizardStep(3, p)).toBe(false);
  });

  it('allows step 3 when isWizardMetadataComplete', () => {
    expect(canNavigateToWizardStep(3, { ...navBase, uploadWizardStep: 2 })).toBe(true);
  });
});

describe('isWizardMetadataComplete', () => {
  it('matches subset used by stepper', () => {
    expect(isWizardMetadataComplete(baseCtx)).toBe(true);
    expect(isWizardMetadataComplete({ ...baseCtx, title: '' })).toBe(false);
  });
});
