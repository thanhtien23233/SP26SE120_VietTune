export interface Ethnicity {
  id: string;
  name: string;
  nameVietnamese: string;
  description?: string;
  region: Region;
  population?: number;
  language?: string;
  musicalTraditions?: string;
  thumbnail?: string;
  recordingCount: number;
}

export enum Region {
  NORTHERN_MOUNTAINS = 'NORTHERN_MOUNTAINS',
  RED_RIVER_DELTA = 'RED_RIVER_DELTA',
  NORTH_CENTRAL = 'NORTH_CENTRAL',
  SOUTH_CENTRAL_COAST = 'SOUTH_CENTRAL_COAST',
  CENTRAL_HIGHLANDS = 'CENTRAL_HIGHLANDS',
  SOUTHEAST = 'SOUTHEAST',
  MEKONG_DELTA = 'MEKONG_DELTA',
}

export interface Instrument {
  id: string;
  name: string;
  nameVietnamese: string;
  description?: string;
  category: InstrumentCategory;
  construction?: string;
  playingTechnique?: string;
  images: string[];
  ethnicity?: Ethnicity;
  audioSamples?: string[];
  recordingCount: number;
}

export enum InstrumentCategory {
  STRING = 'STRING',
  WIND = 'WIND',
  PERCUSSION = 'PERCUSSION',
  IDIOPHONE = 'IDIOPHONE',
  VOICE = 'VOICE',
}

export interface Performer {
  id: string;
  name: string;
  nameVietnamese?: string;
  title?: string;
  ethnicity?: Ethnicity;
  specialization?: string[];
  biography?: string;
  birthYear?: number;
  deathYear?: number;
  photo?: string;
  recordingCount: number;
  isVerified: boolean;
}
