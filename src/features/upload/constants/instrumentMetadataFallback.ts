/**
 * Static fallback when `InstrumentItem.originEthnicGroupId` is missing or name mismatch.
 * Keys should match normalized ASCII-ish names used by the ML service where possible.
 */
export type InstrumentMetadataFallbackEntry = {
  regions?: readonly string[];
  ethnicities?: readonly string[];
  vocalStyles?: readonly string[];
  eventTypes?: readonly string[];
};

/** Multiple keys can alias the same instrument (normalized lookup uses `normalizeInstrumentMatchKey`). */
export const INSTRUMENT_METADATA_FALLBACK: Readonly<
  Record<string, Readonly<InstrumentMetadataFallbackEntry>>
> = {
  'dan tranh': {
    regions: ['Đồng bằng sông Hồng', 'Bắc Trung Bộ'],
    ethnicities: ['Kinh'],
    vocalStyles: ['Ca trù', 'Chèo', 'Tuồng'],
    eventTypes: ['Lễ hội', 'Biểu diễn'],
  },
  'sao truc': {
    regions: ['Đồng bằng sông Hồng', 'Bắc Trung Bộ', 'Đồng bằng sông Cửu Long'],
    ethnicities: ['Kinh', 'Tày', 'Mường'],
    vocalStyles: ['Dân ca'],
    eventTypes: ['Sinh hoạt cộng đồng', 'Lễ hội'],
  },
  'dan bau': {
    regions: ['Đồng bằng sông Hồng', 'Nam Trung Bộ'],
    ethnicities: ['Kinh'],
    vocalStyles: ['Dân ca', 'Đờn ca tài tử'],
    eventTypes: ['Biểu diễn'],
  },
  'dan nguyet': {
    regions: ['Đồng bằng sông Hồng', 'Nam Trung Bộ'],
    ethnicities: ['Kinh'],
    vocalStyles: ['Cải lương', 'Chèo', 'Tuồng'],
    eventTypes: ['Biểu diễn', 'Lễ hội'],
  },
  'dan nhi': {
    regions: ['Đồng bằng sông Hồng', 'Bắc Trung Bộ'],
    ethnicities: ['Kinh'],
    vocalStyles: ['Nhã nhạc', 'Dân ca'],
    eventTypes: ['Lễ hội'],
  },
  'dan ty ba': {
    regions: ['Nam Trung Bộ', 'Đông Nam Bộ'],
    ethnicities: ['Kinh', 'Chăm'],
    vocalStyles: ['Dân ca', 'Đờn ca tài tử'],
    eventTypes: ['Biểu diễn'],
  },
  'trong com': {
    regions: ['Đồng bằng sông Hồng'],
    ethnicities: ['Kinh'],
    vocalStyles: ['Chèo', 'Tuồng'],
    eventTypes: ['Lễ hội', 'Biểu diễn'],
  },
  'cong chieng': {
    regions: ['Tây Nguyên'],
    ethnicities: ['Ba Na', 'Gia Rai', 'Ê Đê', 'Xơ Đăng'],
    vocalStyles: ['Cồng chiêng'],
    eventTypes: ['Lễ hội', 'Nghi lễ'],
  },
  khen: {
    regions: ['Tây Bắc', 'Đông Bắc', 'Tây Nguyên'],
    ethnicities: ["H'Mông", 'Thái', 'Dao'],
    vocalStyles: ['Khèn'],
    eventTypes: ['Lễ hội', 'Sinh hoạt cộng đồng'],
  },
  trung: {
    regions: ['Tây Nguyên'],
    ethnicities: ['Ba Na', 'Ê Đê', 'Gia Rai'],
    vocalStyles: ['Cồng chiêng'],
    eventTypes: ['Lễ hội'],
  },
  "t'rung": {
    regions: ['Tây Nguyên'],
    ethnicities: ['Ba Na', 'Ê Đê', 'Gia Rai'],
    vocalStyles: ['Cồng chiêng'],
    eventTypes: ['Lễ hội'],
  },
  'dan day': {
    regions: ['Đồng bằng sông Hồng'],
    ethnicities: ['Kinh'],
    vocalStyles: ['Ca trù', 'Chèo'],
    eventTypes: ['Biểu diễn'],
  },
  'song loan': {
    regions: ['Đồng bằng sông Hồng', 'Bắc Trung Bộ'],
    ethnicities: ['Kinh'],
    vocalStyles: ['Chèo', 'Tuồng'],
    eventTypes: ['Biểu diễn'],
  },
  'dan tam thap luc': {
    regions: ['Đồng bằng sông Hồng'],
    ethnicities: ['Kinh'],
    vocalStyles: ['Nhã nhạc', 'Dân ca'],
    eventTypes: ['Lễ hội'],
  },
};
