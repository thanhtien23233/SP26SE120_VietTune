import { Recording } from '@/types';

export type ResearcherCatalogSource = 'api-filter' | 'empty';

export type ResearcherSearchResult = Recording;

export interface ResearcherAnalysisRecord extends Recording {
  normalizedBaseTitle?: string;
  mappedEthnicity?: string;
  mappedInstruments?: string[];
}

export interface ResearcherUiRecord extends Recording {
  uiTitle: string;
  uiSubtitle: string;
}

export type ResearcherFilterDropdownKey = 'ethnic' | 'instrument' | 'ceremony' | 'region' | 'commune';

export interface SearchFiltersState {
  ethnicGroupId: string;
  instrumentId: string;
  regionCode: string;
  ceremonyId: string;
  communeId: string;
}

export interface ChatCitation {
  recordingId: string;
  label: string;
}

/** Messages in the researcher portal QA tab (VietTune Intelligence). */
export interface ResearcherPortalChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatCitation[];
}

/** @deprecated Use `ResearcherGraphSelection` from `@/features/knowledge-graph/utils/researcherGraphUx`. */
export type ResearcherSelectedGraphNode = {
  type: 'instrument' | 'ethnicity';
  name: string;
} | null;

export type { ResearcherGraphTabView, ResearcherGraphSelection } from '@/features/knowledge-graph/utils/researcherGraphUx';
