import { apiFetch, apiOk, asApiEnvelope, openApiQueryRecord } from '@/api';
import type {
  ApiCreateKBCitationRequest as CreateKBCitationRequest,
  ApiCreateKBEntryRequest as CreateKBEntryRequest,
  ApiKbEntriesListQuery,
  ApiUpdateKBCitationRequest as UpdateKBCitationRequest,
  ApiUpdateKBEntryRequest as UpdateKBEntryRequest,
  ApiUpdateKBEntryStatusRequest as UpdateKBEntryStatusRequest,
} from '@/api';
import type {
  ArticleSearchResultPagedList,
  KBEntry,
  KBCitation,
  KBListFilters,
  KBRevision,
} from '@/types/knowledgeBase';
import { extractArray } from '@/utils/apiHelpers';

type PagedCollection<T> = {
  items?: T[];
  Items?: T[];
  total?: number;
  Total?: number;
  totalCount?: number;
  TotalCount?: number;
  count?: number;
  Count?: number;
};

type CollectionEnvelope<T> =
  | T[]
  | PagedCollection<T>
  | {
      data?: T[] | PagedCollection<T>;
      Data?: T[] | PagedCollection<T>;
      items?: T[];
      Items?: T[];
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Read numeric total from common paged envelope shapes. */
function readPagedTotal(data: unknown): number | undefined {
  const obj = asRecord(data);
  if (!obj) return undefined;
  const raw =
    obj.total ??
    obj.Total ??
    obj.totalCount ??
    obj.TotalCount ??
    obj.count ??
    obj.Count;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function buildKbListParams(filters?: KBListFilters): ApiKbEntriesListQuery {
  if (!filters) return {};
  return {
    Category: filters.Category,
    Status: filters.Status,
    Search: filters.Search,
    SortBy: filters.SortBy,
    SortOrder: filters.SortOrder,
    Page: filters.Page,
    PageSize: filters.PageSize,
  };
}

function unwrapKbEntries(data: unknown): KBEntry[] {
  if (Array.isArray(data)) return data as KBEntry[];
  return extractArray<KBEntry>(data, [
    'items',
    'Items',
    'data',
    'Data',
    'results',
    'Results',
    'value',
    'Value',
  ]);
}

export const knowledgeBaseApi = {
  async getEntries(filters?: KBListFilters): Promise<KBEntry[]> {
    const res = await apiOk(
      asApiEnvelope<CollectionEnvelope<KBEntry>>(
        apiFetch.GET('/api/kb-entries', {
          params: { query: openApiQueryRecord(buildKbListParams(filters)) },
        }),
      ),
    );
    return unwrapKbEntries(res);
  },

  /**
   * Total KB entry count for dashboards. Uses `total` from paged response when present;
   * otherwise fetches with a large page size and returns the returned list length.
   */
  async countKnowledgeBaseItems(): Promise<number> {
    const first = await apiOk(
      asApiEnvelope<CollectionEnvelope<KBEntry>>(
        apiFetch.GET('/api/kb-entries', {
          params: { query: { Page: 1, PageSize: 1 } },
        }),
      ),
    );
    const total = readPagedTotal(first);
    if (total != null) return total;
    const small = unwrapKbEntries(first);
    if (small.length <= 1) {
      const bulk = await apiOk(
        asApiEnvelope<CollectionEnvelope<KBEntry>>(
          apiFetch.GET('/api/kb-entries', {
            params: { query: { Page: 1, PageSize: 10_000 } },
          }),
        ),
      );
      const t2 = readPagedTotal(bulk);
      if (t2 != null) return t2;
      return unwrapKbEntries(bulk).length;
    }
    return small.length;
  },

  async getEntryById(id: string): Promise<KBEntry> {
    return apiOk(
      asApiEnvelope<KBEntry>(
        apiFetch.GET('/api/kb-entries/{id}', {
          params: { path: { id } },
        }),
      ),
    );
  },

  async getEntryBySlug(slug: string): Promise<KBEntry> {
    return apiOk(
      asApiEnvelope<KBEntry>(
        apiFetch.GET('/api/kb-entries/by-slug/{slug}', {
          params: { path: { slug } },
        }),
      ),
    );
  },

  async createEntry(data: CreateKBEntryRequest): Promise<KBEntry> {
    return apiOk(asApiEnvelope<KBEntry>(apiFetch.POST('/api/kb-entries', { body: data })));
  },

  async updateEntry(id: string, data: UpdateKBEntryRequest): Promise<KBEntry> {
    return apiOk(
      asApiEnvelope<KBEntry>(
        apiFetch.PUT('/api/kb-entries/{id}', {
          params: { path: { id } },
          body: data,
        }),
      ),
    );
  },

  async deleteEntry(id: string): Promise<void> {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.DELETE('/api/kb-entries/{id}', {
          params: { path: { id } },
        }),
      ),
    );
  },

  async updateEntryStatus(id: string, body: UpdateKBEntryStatusRequest): Promise<void> {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.PATCH('/api/kb-entries/{id}/status', {
          params: { path: { id } },
          body,
        }),
      ),
    );
  },

  async getCitations(entryId: string): Promise<KBCitation[]> {
    const res = await apiOk(
      asApiEnvelope<CollectionEnvelope<KBCitation>>(
        apiFetch.GET('/api/kb-entries/{entryId}/citations', {
          params: { path: { entryId } },
        }),
      ),
    );
    return unwrapCitations(res);
  },

  async createCitation(entryId: string, data: CreateKBCitationRequest): Promise<KBCitation> {
    return apiOk(
      asApiEnvelope<KBCitation>(
        apiFetch.POST('/api/kb-entries/{entryId}/citations', {
          params: { path: { entryId } },
          body: data,
        }),
      ),
    );
  },

  async updateCitation(citationId: string, data: UpdateKBCitationRequest): Promise<KBCitation> {
    return apiOk(
      asApiEnvelope<KBCitation>(
        apiFetch.PUT('/api/kb-entries/citations/{citationId}', {
          params: { path: { citationId } },
          body: data,
        }),
      ),
    );
  },

  async deleteCitation(citationId: string): Promise<void> {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.DELETE('/api/kb-entries/citations/{citationId}', {
          params: { path: { citationId } },
        }),
      ),
    );
  },

  async getRevisions(entryId: string): Promise<KBRevision[]> {
    const res = await apiOk(
      asApiEnvelope<CollectionEnvelope<KBRevision>>(
        apiFetch.GET('/api/kb-entries/{entryId}/revisions', {
          params: { path: { entryId } },
        }),
      ),
    );
    return unwrapRevisions(res);
  },

  async getRevisionById(revisionId: string): Promise<KBRevision> {
    return apiOk(
      asApiEnvelope<KBRevision>(
        apiFetch.GET('/api/kb-entries/revisions/{revisionId}', {
          params: { path: { revisionId } },
        }),
      ),
    );
  },

  async searchKnowledgeBase(
    q: string,
    category?: string,
    page = 1,
    pageSize = 15,
  ): Promise<ArticleSearchResultPagedList> {
    return apiOk(
      asApiEnvelope<ArticleSearchResultPagedList>(
        apiFetch.GET('/api/Search/knowledge-base', {
          params: { query: { q, category, page, pageSize } },
        }),
      ),
    );
  },
};

function unwrapCitations(data: unknown): KBCitation[] {
  if (Array.isArray(data)) return data as KBCitation[];
  return extractArray<KBCitation>(data, ['items', 'Items', 'data', 'Data']);
}

function unwrapRevisions(data: unknown): KBRevision[] {
  if (Array.isArray(data)) return data as KBRevision[];
  return extractArray<KBRevision>(data, ['items', 'Items', 'data', 'Data']);
}
