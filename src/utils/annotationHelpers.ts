/** Helpers dùng chung cho chú thích học thuật (panel + trang chi tiết bản thu). */

export function isLikelyHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** Định dạng thời lượng (giây) → `MM:SS` hoặc `HH:MM:SS`. */
export function formatSecondsToTime(seconds: number | null, whenInvalid = '-'): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return whenInvalid;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Chuỗi rỗng → null; số nguyên ≥ 0 → số; không hợp lệ → NaN (để validate báo lỗi). */
export function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return Number.NaN;
  if (!Number.isInteger(n)) return Number.NaN;
  if (n < 0) return Number.NaN;
  return n;
}
