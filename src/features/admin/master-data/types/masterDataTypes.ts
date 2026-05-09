import type { ApiEthnicGroupDto, ApiInstrumentDto, ApiCeremonyDto, ApiVocalStyleDto } from '@/api';

export type EntityKind = 'instruments' | 'ethnicities' | 'rituals' | 'vocalStyles';

export interface ReferenceEntity<T> {
  id: string;
  name: string;
  isActive: boolean;
  usageCount?: number;
  raw: T;
}

export type InstrumentFormValues = Pick<
  ApiInstrumentDto,
  | 'name'
  | 'category'
  | 'description'
  | 'tuningSystem'
  | 'constructionMethod'
  | 'originEthnicGroupId'
>;

export type EthnicGroupFormValues = Pick<
  ApiEthnicGroupDto,
  'name' | 'description' | 'languageFamily' | 'primaryRegion'
>;

export type RitualFormValues = Pick<
  ApiCeremonyDto,
  'name' | 'type' | 'description' | 'season'
>;

export type VocalStyleFormValues = Pick<
  ApiVocalStyleDto,
  'name' | 'description' | 'ethnicGroupId'
>;

export type EntityFormValues = InstrumentFormValues | EthnicGroupFormValues | RitualFormValues | VocalStyleFormValues;
