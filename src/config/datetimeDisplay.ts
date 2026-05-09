/**
 * Múi giờ hiển thị trong UI (Bangkok / ICT — UTC+7, trùng với Việt Nam).
 * Dùng cho `Intl.DateTimeFormat` / `toLocaleString` để không phụ thuộc múi giờ trình duyệt.
 */
export const APP_DISPLAY_TIME_ZONE = 'Asia/Bangkok';

function parseDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = typeof input === 'string' ? new Date(input) : input;
  return isNaN(d.getTime()) ? null : d;
}

/** Giống `toLocaleString('vi-VN')` nhưng cố định múi Bangkok (mặc định có giây). */
export function formatViDateTimeBangkok(
  input: string | Date | null | undefined,
  options: { withSeconds?: boolean } = {},
): string {
  const d = parseDate(input);
  if (!d) return '-';
  return d.toLocaleString('vi-VN', {
    timeZone: APP_DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(options.withSeconds !== false ? { second: '2-digit' } : {}),
    hour12: false,
  });
}

/** Chỉ ngày dd/MM/yyyy (Bangkok). */
export function formatViDateBangkok(input: string | Date | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '-';
  return d.toLocaleDateString('vi-VN', {
    timeZone: APP_DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** Ngày giờ không giây — danh sách, thẻ. */
export function formatViDateTimeShortBangkok(input: string | Date | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '-';
  return d.toLocaleString('vi-VN', {
    timeZone: APP_DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * `dd/MM/yyyy HH:mm` (khớp date-fns cũ) theo múi Bangkok.
 */
export function formatIsoDdMmYyyyHmBangkok(raw?: string): string {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_DISPLAY_TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const num = (t: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === t)?.value ?? '';
    return `${num('day')}/${num('month')}/${num('year')} ${num('hour')}:${num('minute')}`;
  } catch {
    return raw;
  }
}

/** Chỉ ngày `dd/MM/yyyy` theo Bangkok. */
export function formatIsoDdMmYyyyBangkok(raw?: string): string {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_DISPLAY_TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(d);
    const num = (t: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === t)?.value ?? '';
    return `${num('day')}/${num('month')}/${num('year')}`;
  } catch {
    return raw;
  }
}
