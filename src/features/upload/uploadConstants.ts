/** Shared constants for the contributor upload / edit recording flow (UploadMusic). */

export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/vnd.wave',
  'audio/flac',
  'audio/x-flac',
];

export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
  'video/x-ms-wmv',
  'video/3gpp',
  'video/x-flv',
];

/**
 * Re-export byte caps from `validationConstants` (single source of truth).
 * Audio: 200 MB — typical long FLAC/WAV masters.
 * Video: 2 GB — large concert recordings.
 */
export { MAX_AUDIO_UPLOAD_BYTES, MAX_VIDEO_UPLOAD_BYTES } from '@/config/validationConstants';

export const LANGUAGES = [
  'Tiếng Việt',
  'Tiếng Thái',
  'Tiếng Tày',
  'Tiếng Nùng',
  "Tiếng H'Mông",
  'Tiếng Mường',
  'Tiếng Khmer',
  'Tiếng Chăm',
  'Tiếng Ê Đê',
  'Tiếng Ba Na',
  'Tiếng Gia Rai',
  'Tiếng Dao',
  'Tiếng Sán Chay',
  'Tiếng Cơ Ho',
  'Tiếng Xơ Đăng',
  'Tiếng Sán Dìu',
  'Tiếng Hrê',
  'Tiếng Mnông',
  'Tiếng Ra Glai',
  'Tiếng Giáy',
  'Tiếng Cơ Tu',
  'Tiếng Bru-Vân Kiều',
  'Khác',
];

export const PERFORMANCE_TYPES = [
  { key: 'instrumental', label: 'Nhạc cụ' },
  { key: 'acappella', label: 'Hát không đệm' },
  { key: 'vocal_accompaniment', label: 'Hát với nhạc đệm' },
];

/** Mapping genre to typical ethnicity */
export const GENRE_ETHNICITY_MAP: Record<string, string[]> = {
  'Ca trù': ['Kinh'],
  'Quan họ': ['Kinh'],
  'Chầu văn': ['Kinh'],
  'Nhã nhạc': ['Kinh'],
  'Ca Huế': ['Kinh'],
  'Đờn ca tài tử': ['Kinh'],
  'Hát bội': ['Kinh'],
  'Cải lương': ['Kinh'],
  Tuồng: ['Kinh'],
  Chèo: ['Kinh'],
  'Hát xẩm': ['Kinh'],
  'Hát then': ['Tày', 'Nùng'],
  Khèn: ["H'Mông"],
  'Cồng chiêng': ['Ba Na', 'Gia Rai', 'Ê Đê', 'Xơ Đăng', 'Giẻ Triêng'],
};

export const isClickOnScrollbar = (event: MouseEvent): boolean => {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0 && event.clientX >= document.documentElement.clientWidth) {
    return true;
  }
  return false;
};

export const inferMimeFromName = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return '';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'flac') return 'audio/flac';
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'avi') return 'video/x-msvideo';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mkv') return 'video/x-matroska';
  if (ext === 'mpeg' || ext === 'mpg') return 'video/mpeg';
  if (ext === 'wmv') return 'video/x-ms-wmv';
  if (ext === '3gp') return 'video/3gpp';
  if (ext === 'flv') return 'video/x-flv';
  return '';
};

export const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};
