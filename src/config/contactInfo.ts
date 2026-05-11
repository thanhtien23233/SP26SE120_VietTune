/** Single source for support email (Terms, footer, mailto). Override via `VITE_CONTACT_EMAIL`. */
export const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || 'contact@viettune.com';

/**
 * Optional hotline for Terms §20 and similar copy. If unset, legal text shows email only (no placeholder).
 * Set `VITE_CONTACT_HOTLINE` in the deploy environment when a real number is available.
 */
export const CONTACT_HOTLINE =
  (import.meta.env.VITE_CONTACT_HOTLINE as string | undefined)?.trim() || '';

/** Plain text for "Điều 20. Liên hệ" — email always; hotline only when configured. */
export function getTermsContactClause(): string {
  if (CONTACT_HOTLINE) {
    return `Email: ${CONTACT_EMAIL} | Hotline: ${CONTACT_HOTLINE}`;
  }
  return `Email: ${CONTACT_EMAIL}`;
}
