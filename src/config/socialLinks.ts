/**
 * Public social URLs for the footer. Icons are omitted when a URL is unset.
 * Configure per environment: `VITE_SOCIAL_FACEBOOK_URL`, `VITE_SOCIAL_YOUTUBE_URL`.
 */
export const SOCIAL_FACEBOOK_URL =
  (import.meta.env.VITE_SOCIAL_FACEBOOK_URL as string | undefined)?.trim() || '';

export const SOCIAL_YOUTUBE_URL =
  (import.meta.env.VITE_SOCIAL_YOUTUBE_URL as string | undefined)?.trim() || '';
