import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  ResearcherAnalysisRecord,
  ResearcherCatalogSource,
  ResearcherSearchResult,
  ResearcherUiRecord,
  SearchFiltersState,
} from '../researcherPortalTypes';
import { mapRecordingToAnalysisRecord, mapRecordingToUiRecord } from '../researcherRecordingUtils';

import { REGION_NAMES } from '@/config/constants';
import {
  referenceDataService,
  type CeremonyItem,
  type CommuneItem,
  type EthnicGroupItem,
  type InstrumentItem,
} from '@/services/referenceDataService';
import {
  fetchRecordingsSearchByFilter,
  type RecordingSearchByFilterQuery,
} from '@/services/researcherRecordingFilterSearch';



export function useResearcherData() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFiltersState>({
    ethnicGroupId: '',
    instrumentId: '',
    regionCode: '',
    ceremonyId: '',
    communeId: '',
  });
  const [searchResults, setSearchResults] = useState<ResearcherSearchResult[]>([]);
  const [analysisDataset, setAnalysisDataset] = useState<ResearcherAnalysisRecord[]>([]);
  const [uiDerivedData, setUiDerivedData] = useState<ResearcherUiRecord[]>([]);

  // Backward compatibility for existing components.
  /** @deprecated Use searchResults, analysisDataset, or uiDerivedData instead. */
  const approvedRecordings = searchResults;
  const [searchLoading, setSearchLoading] = useState(true);
  const [catalogSource, setCatalogSource] = useState<ResearcherCatalogSource>('empty');

  const [ethnicRefData, setEthnicRefData] = useState<EthnicGroupItem[]>([]);
  const [instrumentRefData, setInstrumentRefData] = useState<InstrumentItem[]>([]);
  const [ceremonyRefData, setCeremonyRefData] = useState<CeremonyItem[]>([]);
  const [communeRefData, setCommuneRefData] = useState<CommuneItem[]>([]);

  const activeFilterCount = useMemo(
    () =>
      [
        filters.ethnicGroupId,
        filters.instrumentId,
        filters.regionCode,
        filters.ceremonyId,
        filters.communeId,
      ].filter((x) => Boolean(x?.trim())).length,
    [filters],
  );

  const ETHNICITIES = useMemo(() => ethnicRefData.map((e) => e.name), [ethnicRefData]);
  const REGIONS = useMemo(() => Object.values(REGION_NAMES), []);
  const EVENT_TYPES = useMemo(() => ceremonyRefData.map((c) => c.name), [ceremonyRefData]);
  const INSTRUMENTS = useMemo(() => instrumentRefData.map((i) => i.name), [instrumentRefData]);
  const COMMUNES = useMemo(() => communeRefData.map((c) => c.name), [communeRefData]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const settled = await Promise.allSettled([
        referenceDataService.getEthnicGroups(),
        referenceDataService.getCeremonies(),
        referenceDataService.getInstruments(),
        referenceDataService.getCommunes(),
      ]);
      if (cancelled) return;

      const [ethnicOutcome, ceremonyOutcome, instrumentOutcome, communeOutcome] = settled;

      if (ethnicOutcome.status === 'fulfilled' && ethnicOutcome.value.length > 0) {
        setEthnicRefData(ethnicOutcome.value);
      } else if (ethnicOutcome.status === 'rejected') {
        console.warn('Failed to load ethnic groups', ethnicOutcome.reason);
      }

      if (ceremonyOutcome.status === 'fulfilled' && ceremonyOutcome.value.length > 0) {
        setCeremonyRefData(ceremonyOutcome.value);
      } else if (ceremonyOutcome.status === 'rejected') {
        console.warn('Failed to load ceremonies', ceremonyOutcome.reason);
      }

      if (instrumentOutcome.status === 'fulfilled' && instrumentOutcome.value.length > 0) {
        setInstrumentRefData(instrumentOutcome.value);
      } else if (instrumentOutcome.status === 'rejected') {
        console.warn('Failed to load instruments', instrumentOutcome.reason);
      }

      if (communeOutcome.status === 'fulfilled' && communeOutcome.value.length > 0) {
        setCommuneRefData(communeOutcome.value);
      } else if (communeOutcome.status === 'rejected') {
        console.warn('Failed to load communes', communeOutcome.reason);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildRecordingSearchQuery = useCallback((): RecordingSearchByFilterQuery => {
    return {
      page: 1,
      pageSize: 500,
      q: searchQuery.trim() || undefined,
      ethnicGroupId: filters.ethnicGroupId || undefined,
      instrumentId: filters.instrumentId || undefined,
      ceremonyId: filters.ceremonyId || undefined,
      regionCode: filters.regionCode || undefined,
      communeId: filters.communeId || undefined,
    };
  }, [searchQuery, filters]);

  const loadResearcherCatalog = useCallback(async () => {
    setSearchLoading(true);
    const q = buildRecordingSearchQuery();

    const logTelemetry = (source: string, count: number, extra: Record<string, unknown> = {}) => {
      if (!import.meta.env.DEV) return;
      console.warn('[ResearcherSearch]', {
        source,
        count,
        query: q,
        ...extra,
      });
    };
    try {
      const apiList = await fetchRecordingsSearchByFilter(q);

      if (apiList && apiList.length > 0) {
        setSearchResults(apiList);
        setAnalysisDataset(apiList.map(mapRecordingToAnalysisRecord));
        setUiDerivedData(apiList.map(mapRecordingToUiRecord));
        setCatalogSource('api-filter');
        logTelemetry('api-filter', apiList.length, { status: 'success' });
      } else {
        setSearchResults([]);
        setAnalysisDataset([]);
        setUiDerivedData([]);
        setCatalogSource('empty');
        logTelemetry('empty', 0, { status: 'no-results' });
      }
    } catch (err) {
      console.error('Researcher catalog load API failed:', err);
      setSearchResults([]);
      setAnalysisDataset([]);
      setUiDerivedData([]);
      setCatalogSource('empty');
      logTelemetry('error', 0, { status: 'failed', error: String(err) });
    } finally {
      setSearchLoading(false);
    }
  }, [buildRecordingSearchQuery]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadResearcherCatalog();
    }, 280);
    return () => clearTimeout(t);
  }, [loadResearcherCatalog]);

  const handleSearchClick = useCallback(() => {
    void loadResearcherCatalog();
  }, [loadResearcherCatalog]);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    searchResults,
    analysisDataset,
    uiDerivedData,
    approvedRecordings,
    searchLoading,
    catalogSource,
    ethnicRefData,
    instrumentRefData,
    ceremonyRefData,
    communeRefData,
    activeFilterCount,
    ETHNICITIES,
    REGIONS,
    EVENT_TYPES,
    INSTRUMENTS,
    COMMUNES,
    loadResearcherCatalog,
    handleSearchClick,
  };
}
