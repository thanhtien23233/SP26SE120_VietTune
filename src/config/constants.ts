export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'VietTune';

/** Base URL for Researcher chatbox / QA API (VietTune backend on Render). Falls back to API_BASE_URL if not set. */
export const VIETTUNE_AI_BASE_URL =
  (import.meta.env.VITE_VIETTUNE_AI_BASE_URL as string | undefined)?.trim() || API_BASE_URL;

/** Display name for the AI / Intelligence assistant (replaces "AI VietTune"). */
export const INTELLIGENCE_NAME = 'VietTune Intelligence';

export const ITEMS_PER_PAGE = 20;
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const SUPPORTED_AUDIO_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg'];
export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export const REGION_NAMES = {
  NORTHERN_MOUNTAINS: 'Trung du và miền núi Bắc Bộ',
  RED_RIVER_DELTA: 'Đồng bằng Bắc Bộ',
  NORTH_CENTRAL: 'Bắc Trung Bộ',
  SOUTH_CENTRAL_COAST: 'Nam Trung Bộ',
  CENTRAL_HIGHLANDS: 'Cao nguyên Trung Bộ',
  SOUTHEAST: 'Đông Nam Bộ',
  MEKONG_DELTA: 'Tây Nam Bộ',
};

export const RECORDING_TYPE_NAMES = {
  INSTRUMENTAL: 'Nhạc không lời',
  VOCAL: 'Nhạc có lời',
  CEREMONIAL: 'Nhạc nghi lễ',
  FOLK_SONG: 'Dân ca',
  EPIC: 'Sử thi',
  LULLABY: 'Hát ru',
  WORK_SONG: 'Hát lao động',
  OTHER: 'Khác',
};

export const INSTRUMENT_CATEGORY_NAMES = {
  STRING: 'Dây',
  WIND: 'Hơi',
  PERCUSSION: 'Màng rung',
  IDIOPHONE: 'Thể rắn',
  VOICE: 'Giọng',
};

export const USER_ROLE_NAMES = {
  ADMIN: 'Administrator',
  MODERATOR: 'Moderator',
  RESEARCHER: 'Researcher',
  CONTRIBUTOR: 'Contributor',
  EXPERT: 'Expert',
  USER: 'User',
};
