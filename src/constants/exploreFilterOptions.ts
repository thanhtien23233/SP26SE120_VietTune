import { Region, RecordingType } from '@/types';

/** Static option lists for Explore `FilterSidebar` (aligned with SearchBar vocabulary). */
export type ExploreFilterOptions = {
  ethnicities: { id: string; label: string }[];
  recordingTypes: { value: RecordingType; label: string }[];
  genreTags: { id: string; label: string }[];
  instruments: { id: string; label: string }[];
  regions: { value: Region; label: string }[];
  culturalContexts: { id: string; label: string }[];
};

const GENRES = [
  'Dân ca',
  'Hát xẩm',
  'Ca trù',
  'Chầu văn',
  'Quan họ',
  'Hát then',
  'Cải lương',
  'Tuồng',
  'Chèo',
  'Nhã nhạc',
  'Ca Huế',
  'Đờn ca tài tử',
  'Hát bội',
  'Hò',
  'Lý',
  'Vọng cổ',
  'Hát ru',
  'Hát ví',
  'Hát giặm',
  'Bài chòi',
  'Khác',
] as const;

const EVENT_TYPES = [
  'Đám cưới',
  'Đám tang',
  'Lễ hội đình',
  'Lễ hội chùa',
  'Tết Nguyên đán',
  'Hội xuân',
  'Lễ cầu mùa',
  'Lễ cúng tổ tiên',
  'Lễ cấp sắc',
  'Lễ hội đâm trâu',
  'Lễ hội cồng chiêng',
  'Sinh hoạt cộng đồng',
  'Biểu diễn nghệ thuật',
  'Ghi âm studio',
  'Ghi âm thực địa',
  'Khác',
] as const;

export const EXPLORE_STATIC_OPTIONS: Omit<ExploreFilterOptions, 'ethnicities' | 'instruments'> = {
  recordingTypes: [
    { value: RecordingType.INSTRUMENTAL, label: 'Nhạc cụ (không lời)' },
    { value: RecordingType.VOCAL, label: 'Có lời / giọng hát' },
    { value: RecordingType.FOLK_SONG, label: 'Dân ca / dân ca đương đại' },
    { value: RecordingType.CEREMONIAL, label: 'Nghi lễ / tín ngưỡng' },
    { value: RecordingType.EPIC, label: 'Sử thi / hò khoan' },
    { value: RecordingType.LULLABY, label: 'Hát ru' },
    { value: RecordingType.WORK_SONG, label: 'Hò / nhịp làm việc' },
    { value: RecordingType.OTHER, label: 'Khác' },
  ],
  genreTags: GENRES.map((label) => ({ id: label, label })),
  regions: [
    { value: Region.NORTHERN_MOUNTAINS, label: 'Trung du và miền núi Bắc Bộ' },
    { value: Region.RED_RIVER_DELTA, label: 'Đồng bằng Bắc Bộ' },
    { value: Region.NORTH_CENTRAL, label: 'Bắc Trung Bộ' },
    { value: Region.SOUTH_CENTRAL_COAST, label: 'Nam Trung Bộ' },
    { value: Region.CENTRAL_HIGHLANDS, label: 'Cao nguyên Trung Bộ' },
    { value: Region.SOUTHEAST, label: 'Đông Nam Bộ' },
    { value: Region.MEKONG_DELTA, label: 'Tây Nam Bộ' },
  ],
  culturalContexts: EVENT_TYPES.map((label) => ({ id: label, label })),
};
