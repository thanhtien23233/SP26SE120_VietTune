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

export type UploadValidationFailure = {
  ok: false;
  errors: Record<string, string>;
  missingFields: string[];
};

export type UploadValidationSuccess = { ok: true };

export function validateUploadFormState(
  ctx: UploadValidationContext,
): UploadValidationFailure | UploadValidationSuccess {
  const newErrors: Record<string, string> = {};
  const missingFields: string[] = [];

  if (!ctx.isEditMode && !ctx.file) {
    const msg = ctx.mediaType === 'audio' ? 'Tệp âm thanh' : 'Tệp video';
    newErrors.file = `Vui lòng chọn ${msg.toLowerCase()}`;
    missingFields.push(msg);
  }

  if (!ctx.title.trim()) {
    newErrors.title = 'Vui lòng nhập tiêu đề';
    missingFields.push('Tiêu đề/Tên bản nhạc');
  }

  if (!ctx.artistUnknown && !ctx.artist.trim()) {
    newErrors.artist = "Vui lòng nhập tên nghệ sĩ hoặc chọn 'Không rõ'";
    missingFields.push('Nghệ sĩ/Người biểu diễn');
  }

  if (!ctx.composerUnknown && !ctx.composer.trim()) {
    newErrors.composer = "Vui lòng nhập tên tác giả hoặc chọn 'Dân gian/Không rõ'";
    missingFields.push('Nhạc sĩ/Tác giả');
  }

  if (!ctx.performanceType) {
    newErrors.performanceType = 'Vui lòng chọn loại hình biểu diễn';
    missingFields.push('Loại hình biểu diễn');
  } else {
    if (
      (ctx.performanceType === 'vocal_accompaniment' || ctx.performanceType === 'acappella') &&
      !ctx.vocalStyle
    ) {
      newErrors.vocalStyle = 'Vui lòng chọn lối hát / thể loại';
      missingFields.push('Lối hát / Thể loại');
    }
    if (ctx.requiresInstruments && ctx.instruments.length === 0) {
      newErrors.instruments = 'Vui lòng chọn ít nhất một nhạc cụ';
      missingFields.push('Nhạc cụ sử dụng');
    }
  }

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
  if (!ctx.isEditMode && !ctx.file) return false;
  if (!ctx.title.trim()) return false;
  if (!ctx.artistUnknown && !ctx.artist.trim()) return false;
  if (!ctx.composerUnknown && !ctx.composer.trim()) return false;
  if (!ctx.performanceType) return false;
  if (
    (ctx.performanceType === 'vocal_accompaniment' || ctx.performanceType === 'acappella') &&
    !ctx.vocalStyle
  )
    return false;
  if (ctx.requiresInstruments && ctx.instruments.length === 0) return false;
  return true;
}
