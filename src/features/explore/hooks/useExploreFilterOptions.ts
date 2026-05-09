import { useEffect, useMemo, useState } from 'react';

import {
  EXPLORE_STATIC_OPTIONS,
  type ExploreFilterOptions,
} from '@/constants/exploreFilterOptions';
import { referenceDataService } from '@/services/referenceDataService';

type DynamicOptions = Pick<ExploreFilterOptions, 'ethnicities' | 'instruments'>;

let optionsCache: DynamicOptions | null = null;

export function useExploreFilterOptions(): ExploreFilterOptions {
  const [dynamicOptions, setDynamicOptions] = useState<DynamicOptions>(
    optionsCache ?? { ethnicities: [], instruments: [] },
  );

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (optionsCache) {
        setDynamicOptions(optionsCache);
        return;
      }
      
      const [ethnicGroups, instruments] = await Promise.allSettled([
        referenceDataService.getEthnicGroups(),
        referenceDataService.getInstruments(),
      ]);
      if (cancelled) return;

      const next: DynamicOptions = {
        ethnicities:
          ethnicGroups.status === 'fulfilled'
            ? ethnicGroups.value.map((x) => ({ id: x.id, label: x.name }))
            : [],
        instruments:
          instruments.status === 'fulfilled'
            ? instruments.value.map((x) => ({ id: x.id, label: x.name }))
            : [],
      };

      optionsCache = next;
      setDynamicOptions(next);
    };

    void loadData();

    const handleRefDataUpdate = () => {
      console.log('Reference data updated, clearing optionsCache and refetching Explore options...');
      optionsCache = null;
      void loadData();
    };

    window.addEventListener('viettune:refdata-updated', handleRefDataUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener('viettune:refdata-updated', handleRefDataUpdate);
    };
  }, []);

  return useMemo(
    () => ({
      ...EXPLORE_STATIC_OPTIONS,
      ...dynamicOptions,
    }),
    [dynamicOptions],
  );
}
