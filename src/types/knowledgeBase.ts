/** Knowledge Base — aligned with VietTuneArchive Swagger (KBEntries tag). */

export interface KBEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  status: number;
  slug?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KBCitation {
  id: string;
  entryId: string;
  citation: string;
  url?: string | null;
}

export interface KBRevision {
  id: string;
  entryId: string;
  content: string;
  editedBy?: string;
  editedByName?: string;
  editedAt?: string;
  revisionNote?: string;
}

export interface CreateKBEntryRequest {
  title: string;
  content: string;
  category: string;
  citations?: CreateKBCitationRequest[] | null;
}

export interface UpdateKBEntryRequest {
  title: string;
  content: string;
  category?: string | null;
  revisionNote?: string | null;
}

export interface UpdateKBEntryStatusRequest {
  status: number;
}

export interface CreateKBCitationRequest {
  citation: string;
  url?: string | null;
}

export interface UpdateKBCitationRequest {
  citation: string;
  url?: string | null;
}

export interface KBListFilters {
  Category?: string;
  Status?: number;
  Search?: string;
  SortBy?: string;
  SortOrder?: string;
  Page?: number;
  PageSize?: number;
}

/** GET /api/Search/knowledge-base item */
export interface ArticleSearchResult {
  id: string | null;
  title: string | null;
  excerpt: string | null;
  score: number;
}

/** GET /api/Search/knowledge-base response */
export interface ArticleSearchResultPagedList {
  items: ArticleSearchResult[] | null;
  page: number;
  pageSize: number;
  total: number;
}

export const KB_STATUS_MAP: Record<number, string> = {
  0: 'Bản nháp',
  1: 'Đã xuất bản',
  2: 'Lưu trữ',
};

export const KB_CATEGORIES = ['instrument', 'ceremony', 'term', 'general'] as const;

export const KB_CATEGORY_LABELS: Record<string, string> = {
  instrument: 'Nhạc cụ',
  ceremony: 'Nghi lễ',
  term: 'Thuật ngữ',
  general: 'Tổng hợp',
};
