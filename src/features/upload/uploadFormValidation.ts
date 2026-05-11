export type UploadValidationContext = {
  isEditMode: boolean;
  file: File | null;
  mediaType: 'audio' | 'video';
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

/** Step 2 → 3: metadata fields validated together (subset of submit rules). */
export const WIZARD_STEP_2_TRANSITION_FIELD_KEYS = [
  'title',
  'artist',
  'composer',
  'performanceType',
  'vocalStyle',
  'instruments',
] as const;

export type WizardTransitionContext = UploadValidationContext & {
  existingMediaSrc: string | null;
};

export type UploadValidationFailure = {
  ok: false;
  errors: Record<string, string>;
  missingFields: string[];
};

export type UploadValidationSuccess = { ok: true };

/**
 * Canonical field-level validation for submit + summary panel.
 * Edit mode: does not require a newly chosen file (existing recording media is implied server-side).
 */
export function collectUploadFieldErrors(ctx: UploadValidationContext): Record<string, string> {
  const newErrors: Record<string, string> = {};

  if (!ctx.isEditMode && !ctx.file) {
    const msg = ctx.mediaType === 'audio' ? 'Tệp âm thanh' : 'Tệp video';
    newErrors.file = `Vui lòng chọn ${msg.toLowerCase()}`;
  }

  if (!ctx.title.trim()) {
    newErrors.title = 'Vui lòng nhập tiêu đề';
  }

  if (!ctx.artistUnknown && !ctx.artist.trim()) {
    newErrors.artist = "Vui lòng nhập tên nghệ sĩ hoặc chọn 'Không rõ'";
  }

  if (!ctx.composerUnknown && !ctx.composer.trim()) {
    newErrors.composer = "Vui lòng nhập tên tác giả hoặc chọn 'Dân gian/Không rõ'";
  }

  if (!ctx.performanceType) {
    newErrors.performanceType = 'Vui lòng chọn loại hình biểu diễn';
  } else {
    if (
      (ctx.performanceType === 'vocal_accompaniment' || ctx.performanceType === 'acappella') &&
      !ctx.vocalStyle
    ) {
      newErrors.vocalStyle = 'Vui lòng chọn lối hát / thể loại';
    }
    if (ctx.requiresInstruments && ctx.instruments.length === 0) {
      newErrors.instruments = 'Vui lòng chọn ít nhất một nhạc cụ';
    }
  }

  return newErrors;
}

/** Human-readable list for submit banner; order follows canonical field checks. */
export function missingLabelsForUploadErrors(
  ctx: UploadValidationContext,
  errors: Record<string, string>,
): string[] {
  const labels: string[] = [];
  if (errors.file) {
    const msg = ctx.mediaType === 'audio' ? 'Tệp âm thanh' : 'Tệp video';
    labels.push(msg);
  }
  if (errors.title) labels.push('Tiêu đề/Tên bản nhạc');
  if (errors.artist) labels.push('Nghệ sĩ/Người biểu diễn');
  if (errors.composer) labels.push('Nhạc sĩ/Tác giả');
  if (errors.performanceType) labels.push('Loại hình biểu diễn');
  if (errors.vocalStyle) labels.push('Lối hát / Thể loại');
  if (errors.instruments) labels.push('Nhạc cụ sử dụng');
  return labels;
}

export function validateUploadFormState(
  ctx: UploadValidationContext,
): UploadValidationFailure | UploadValidationSuccess {
  const newErrors = collectUploadFieldErrors(ctx);
  const missingFields = missingLabelsForUploadErrors(ctx, newErrors);

  if (missingFields.length > 0) {
    return { ok: false, errors: newErrors, missingFields };
  }
  return { ok: true };
}

export function scrollToFirstUploadError(errors: Record<string, string>) {
  setTimeout(() => {
    const firstErrorKey = Object.keys(errors)[0];
    const errorElement =
      document.getElementById(`field-${firstErrorKey}`) ||
      document.querySelector(`[name="${firstErrorKey}"]`);
    if (errorElement) {
      errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

export type UploadFormCompleteContext = UploadValidationContext & {
  isFormDisabled: boolean;
};

export function isUploadFormComplete(ctx: UploadFormCompleteContext): boolean {
  if (ctx.isFormDisabled) return false;
  return validateUploadFormState(ctx).ok;
}

/**
 * Step 1 → 2: playable media must exist (new file or existing URL in edit mode).
 * Messages align with collectUploadFieldErrors for create flow.
 */
export function getWizardStep1TransitionErrors(ctx: WizardTransitionContext): Record<string, string> {
  const hasMedia = ctx.file || (ctx.isEditMode && !!ctx.existingMediaSrc);
  if (hasMedia) return {};
  const msg = ctx.mediaType === 'audio' ? 'Tệp âm thanh' : 'Tệp video';
  return { file: `Vui lòng chọn ${msg.toLowerCase()}` };
}

/**
 * Field errors for leaving the current wizard step (Next).
 * Step 2 in edit mode: no inline validation (matches prior UX — metadata already persisted).
 */
export function getWizardTransitionFieldErrors(
  ctx: WizardTransitionContext,
  fromStep: 1 | 2,
  opts: { isEditMode: boolean },
): Record<string, string> {
  if (fromStep === 1) {
    return getWizardStep1TransitionErrors(ctx);
  }
  if (opts.isEditMode) {
    return {};
  }
  const all = collectUploadFieldErrors(ctx);
  const out: Record<string, string> = {};
  for (const k of WIZARD_STEP_2_TRANSITION_FIELD_KEYS) {
    if (all[k]) out[k] = all[k];
  }
  return out;
}

/** True when metadata subset has no blocking errors (wizard stepper / jump to step 3). */
export function isWizardMetadataComplete(ctx: UploadValidationContext): boolean {
  const all = collectUploadFieldErrors(ctx);
  return WIZARD_STEP_2_TRANSITION_FIELD_KEYS.every((k) => !all[k]);
}

export type WizardNavigationParams = UploadValidationContext & {
  uploadWizardStep: number;
  isFormDisabled: boolean;
  isEditMode: boolean;
  isAsyncNavigationBlocked: boolean;
  existingMediaSrc: string | null;
  createdRecordingId: string | null;
};

/**
 * Single navigation gate for the upload wizard (stepper clicks + programmatic checks).
 * Async pipeline blocking stays here so UX stays co-located with wizard step state.
 */
export function canNavigateToWizardStep(targetStep: number, p: WizardNavigationParams): boolean {
  if (p.isFormDisabled) return false;
  if (targetStep <= p.uploadWizardStep) return true;

  if (!p.isEditMode && p.isAsyncNavigationBlocked && targetStep > p.uploadWizardStep) {
    return false;
  }

  if (targetStep >= 2) {
    const hasMedia = p.file || (p.isEditMode && !!p.existingMediaSrc);
    if (!hasMedia) return false;
    if (!p.isEditMode && !p.createdRecordingId) return false;
  }

  if (p.isEditMode) return true;

  if (targetStep >= 3) {
    return isWizardMetadataComplete(p);
  }

  return true;
}
