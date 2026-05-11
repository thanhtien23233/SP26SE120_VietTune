import { useCallback } from 'react';

import type { EntityKind } from '../types/masterDataTypes';

import { referenceDataService } from '@/services/referenceDataService';

export const REF_DATA_UPDATED_EVENT = 'viettune:refdata-updated';

export function useMasterDataInvalidation() {
  const invalidateCache = useCallback((kind: EntityKind) => {
    // 1. Clear the in-memory module-level cache
    referenceDataService.clearCache();

    // 2. Emit an event so active consumers (like Upload form) know to refetch
    window.dispatchEvent(
      new CustomEvent(REF_DATA_UPDATED_EVENT, { detail: { kind } })
    );
  }, []);

  return { invalidateCache };
}
