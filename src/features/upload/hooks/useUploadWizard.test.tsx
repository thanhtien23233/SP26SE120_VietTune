import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUploadWizard } from './useUploadWizard';

const baseParams = {
  isFormDisabled: false,
  isEditMode: false,
  file: new File([new Uint8Array([1])], 'audio.mp3', { type: 'audio/mpeg' }),
  existingMediaSrc: null,
  createdRecordingId: 'rec-1',
  title: 'Song',
  artist: 'Artist',
  artistUnknown: false,
  composer: 'Composer',
  composerUnknown: false,
  performanceType: 'instrumental',
  vocalStyle: '',
  requiresInstruments: false,
  instruments: [],
};

describe('useUploadWizard', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn());
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  it('allows step transitions based on required data', () => {
    const { result } = renderHook(() => useUploadWizard(baseParams));

    expect(result.current.canNavigateToStep(2)).toBe(true);
    expect(result.current.canNavigateToStep(3)).toBe(true);
  });

  it('blocks navigation when required metadata is missing', () => {
    const { result } = renderHook(() =>
      useUploadWizard({
        ...baseParams,
        title: '',
        artist: '',
      }),
    );

    expect(result.current.canNavigateToStep(3)).toBe(false);
  });

  it('updates step with next/prev/reset', () => {
    const { result } = renderHook(() => useUploadWizard(baseParams));

    act(() => result.current.goNext());
    expect(result.current.uploadWizardStep).toBe(2);

    act(() => result.current.goPrev());
    expect(result.current.uploadWizardStep).toBe(1);

    act(() => result.current.goToStep(3));
    expect(result.current.uploadWizardStep).toBe(3);

    act(() => result.current.reset());
    expect(result.current.uploadWizardStep).toBe(1);
  });
});
