export type ResearcherCatalogSource = 'api-filter' | 'empty';

export type ResearcherFilterDropdownKey = 'ethnic' | 'instrument' | 'ceremony' | 'region' | 'commune';

export interface SearchFiltersState {
  ethnicGroup: string;
  instrument: string;
  region: string;
  ceremony: string;
  commune: string;
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

export type ResearcherGraphTabView = 'overview' | 'instruments' | 'ethnicity';

export type ResearcherSelectedGraphNode = {
  type: 'instrument' | 'ethnicity';
  name: string;
} | null;
