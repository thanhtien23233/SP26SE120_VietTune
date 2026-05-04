import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ResearcherCatalogSource, SearchFiltersState } from '../researcherPortalTypes';

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
import { Recording } from '@/types';
import { normalizeSearchText } from '@/utils/searchText';


export function useResearcherData() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFiltersState>({
    ethnicGroup: '',
    instrument: '',
    region: '',
    ceremony: '',
    commune: '',
  });
  const [approvedRecordings, setApprovedRecordings] = useState<Recording[]>([]);
  const [searchLoading, setSearchLoading] = useState(true);
  const [catalogSource, setCatalogSource] = useState<ResearcherCatalogSource>('empty');

  const [ethnicRefData, setEthnicRefData] = useState<EthnicGroupItem[]>([]);
  const [instrumentRefData, setInstrumentRefData] = useState<InstrumentItem[]>([]);
  const [ceremonyRefData, setCeremonyRefData] = useState<CeremonyItem[]>([]);
  const [communeRefData, setCommuneRefData] = useState<CommuneItem[]>([]);

  const activeFilterCount = useMemo(
    () =>
      [
        filters.ethnicGroup,
        filters.instrument,
        filters.region,
        filters.ceremony,
        filters.commune,
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
    const pickByNormalizedName = <T extends { name: string; id: string }>(
      list: T[],
      selected: string,
    ): string | undefined => {
      const normalizedSelected = normalizeSearchText(selected);
      if (!normalizedSelected) return undefined;
      return list.find((x) => normalizeSearchText(x.name) === normalizedSelected)?.id;
    };
    const regionCode =
      filters.region.trim().length > 0
        ? (Object.entries(REGION_NAMES) as [string, string][]).find(
            ([, label]) => label === filters.region,
          )?.[0]
        : undefined;
    const ethnicGroupId = pickByNormalizedName(ethnicRefData, filters.ethnicGroup);
    const instrumentId = pickByNormalizedName(instrumentRefData, filters.instrument);
    const ceremonyId = pickByNormalizedName(ceremonyRefData, filters.ceremony);
    const communeId = pickByNormalizedName(communeRefData, filters.commune);
    return {
      page: 1,
      pageSize: 500,
      q: searchQuery.trim() || undefined,
      ethnicGroupId,
      instrumentId,
      ceremonyId,
      regionCode,
      communeId,
    };
  }, [searchQuery, filters, ethnicRefData, instrumentRefData, ceremonyRefData, communeRefData]);

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
        setApprovedRecordings(apiList);
        setCatalogSource('api-filter');
        logTelemetry('api-filter', apiList.length, { status: 'success' });
      } else {
        setApprovedRecordings([]);
        setCatalogSource('empty');
        logTelemetry('empty', 0, { status: 'no-results' });
      }
    } catch (err) {
      console.error('Researcher catalog load API failed:', err);
      setApprovedRecordings([]);
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
