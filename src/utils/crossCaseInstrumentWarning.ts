import { normalizeInstrumentMatchKey } from '@/utils/instrumentMetadataMapper';

export type CrossCaseClassification =
  | 'traditional_with_modern_instruments'
  | 'contemporary_with_traditional_instruments'
  | 'none';

const MODERN_INSTRUMENT_KEYS = new Set([
  'guitar',
  'piano',
  'violin',
  'keyboard',
  'saxophone',
  'drum set',
  'drumset',
  'electric guitar',
  'bass guitar',
  'organ',
  'ukulele',
  'cajon',
]);

const TRADITIONAL_HINTS = [
  'dan ',
  'đàn ',
  'sao',
  'trong com',
  'trống cơm',
  't rung',
  't’rung',
  'khen',
  'nhi',
  'bau',
  'bau',
  'monochord',
];

const TRADITIONAL_SONG_HINTS = [
  'dan ca',
  'quan ho',
  'cheo',
  'ca tru',
  'nha nhac',
  'xoan',
  'folk',
  'traditional',
  'nghi le',
];

const CONTEMPORARY_SONG_HINTS = ['pop', 'rock', 'rap', 'hiphop', 'edm', 'modern', 'đương đại'];

function isModernInstrument(name: string): boolean {
  const key = normalizeInstrumentMatchKey(name);
  if (!key) return false;
  if (MODERN_INSTRUMENT_KEYS.has(key)) return true;
  return key.includes('electric') || key.includes('synth');
}

function isTraditionalInstrument(name: string): boolean {
  const key = normalizeInstrumentMatchKey(name);
  if (!key) return false;
  if (isModernInstrument(key)) return false;
  return TRADITIONAL_HINTS.some((hint) => key.includes(normalizeInstrumentMatchKey(hint)));
}

function inferSongFamily(input: string): 'traditional' | 'contemporary' | 'unknown' {
  const key = normalizeInstrumentMatchKey(input);
  if (!key) return 'unknown';
  if (TRADITIONAL_SONG_HINTS.some((hint) => key.includes(normalizeInstrumentMatchKey(hint)))) {
    return 'traditional';
  }
  if (CONTEMPORARY_SONG_HINTS.some((hint) => key.includes(normalizeInstrumentMatchKey(hint)))) {
    return 'contemporary';
  }
  return 'unknown';
}

export function detectCrossCaseWarning(params: {
  instruments: string[];
  songSignals: string[];
}): { warning: string | null; suggestedClassification: CrossCaseClassification } {
  const instrumentList = params.instruments.filter((x) => x.trim().length > 0);
  if (instrumentList.length === 0) {
    return { warning: null, suggestedClassification: 'none' };
  }
  const hasModern = instrumentList.some(isModernInstrument);
  const hasTraditional = instrumentList.some(isTraditionalInstrument);
  const songFamily = params.songSignals
    .map(inferSongFamily)
    .find((x) => x !== 'unknown') ?? 'unknown';

  if (songFamily === 'traditional' && hasModern) {
    return {
      warning:
        'Cross-case: Bài có tín hiệu dân gian/truyền thống nhưng dùng nhạc cụ hiện đại. Vui lòng expert xác minh trước khi phê duyệt.',
      suggestedClassification: 'traditional_with_modern_instruments',
    };
  }
  if (songFamily === 'contemporary' && hasTraditional) {
    return {
      warning:
        'Cross-case: Bài có tín hiệu đương đại nhưng xuất hiện nhạc cụ truyền thống. Vui lòng expert xác minh ngữ cảnh biểu diễn.',
      suggestedClassification: 'contemporary_with_traditional_instruments',
    };
  }
  return { warning: null, suggestedClassification: 'none' };
}
