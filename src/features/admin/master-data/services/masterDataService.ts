import type { EntityKind, EntityFormValues, ReferenceEntity } from '../types/masterDataTypes';

import type { ApiInstrumentDto, ApiEthnicGroupDto, ApiCeremonyDto, ApiVocalStyleDto } from '@/api';
import { legacyGet } from '@/api/legacyHttp';
import { logEvent } from '@/services/errorReporting';
import { ethnicityService } from '@/services/ethnicityService';
import { instrumentService } from '@/services/instrumentService';
import { ritualService } from '@/services/ritualService';
import { vocalStyleService } from '@/services/vocalStyleService';

export const masterDataService = {
  list: async (kind: EntityKind, page: number, pageSize: number) => {
    switch (kind) {
      case 'instruments': {
        const res = await instrumentService.getInstruments(page, pageSize);
        return {
          items: res.items?.map((item) => ({
            id: item.id!,
            name: item.name!,
            isActive: true, // Assuming true for now, adapt if backend supports soft-delete
            raw: item,
          })) as ReferenceEntity<ApiInstrumentDto>[],
          total: res.total || 0,
        };
      }
      case 'ethnicities': {
        const res = await ethnicityService.getEthnicities(page, pageSize);
        return {
          items: res.items?.map((item) => ({
            id: item.id!,
            name: item.name!,
            isActive: true,
            raw: item,
          })) as ReferenceEntity<ApiEthnicGroupDto>[],
          total: res.total || 0,
        };
      }
      case 'rituals': {
        const res = await ritualService.getCeremonies(page, pageSize);
        return {
          items: res.items?.map((item) => ({
            id: item.id!,
            name: item.name!,
            isActive: true,
            raw: item,
          })) as ReferenceEntity<ApiCeremonyDto>[],
          total: res.total || 0,
        };
      }
      case 'vocalStyles': {
        const res = await vocalStyleService.getVocalStyles(page, pageSize);
        return {
          items: res.items?.map((item) => ({
            id: item.id!,
            name: item.name!,
            isActive: true,
            raw: item,
          })) as ReferenceEntity<ApiVocalStyleDto>[],
          total: res.total || 0,
        };
      }
      default:
        throw new Error(`Unsupported entity kind: ${kind}`);
    }
  },

  create: async (kind: EntityKind, data: EntityFormValues) => {
    switch (kind) {
      case 'instruments':
        return await instrumentService.createInstrument(data);
      case 'ethnicities':
        return await ethnicityService.createEthnicity(data);
      case 'rituals':
        return await ritualService.createCeremony(data);
      case 'vocalStyles':
        return await vocalStyleService.createVocalStyle(data);
      default:
        throw new Error(`Unsupported entity kind: ${kind}`);
    }
  },

  update: async (kind: EntityKind, id: string, data: EntityFormValues) => {
    switch (kind) {
      case 'instruments':
        return await instrumentService.updateInstrument(id, data);
      case 'ethnicities':
        return await ethnicityService.updateEthnicity(id, data);
      case 'rituals':
        return await ritualService.updateCeremony(id, data);
      case 'vocalStyles':
        return await vocalStyleService.updateVocalStyle(id, data);
      default:
        throw new Error(`Unsupported entity kind: ${kind}`);
    }
  },

  delete: async (kind: EntityKind, id: string) => {
    switch (kind) {
      case 'instruments':
        return await instrumentService.deleteInstrument(id);
      case 'ethnicities':
        return await ethnicityService.deleteEthnicity(id);
      case 'rituals':
        return await ritualService.deleteCeremony(id);
      case 'vocalStyles':
        return await vocalStyleService.deleteVocalStyle(id);
      default:
        throw new Error(`Unsupported entity kind: ${kind}`);
    }
  },

  /**
   * Reference count before delete. Without `VITE_MASTER_DATA_USAGE_PATH`, returns 0 (unknown → allow delete in UI).
   * When set, performs GET `{API_BASE_URL}/{path}` with `{kind}` and `{id}` substituted (encodeURIComponent).
   * Expect JSON like `{ count }` or `{ usageCount }`.
   */
  checkUsage: async (kind: EntityKind, id: string): Promise<number> => {
    const tmpl = (import.meta.env.VITE_MASTER_DATA_USAGE_PATH as string | undefined)?.trim();
    if (!tmpl) return 0;
    try {
      const path = tmpl
        .replace('{kind}', encodeURIComponent(kind))
        .replace('{id}', encodeURIComponent(id));
      const normalized = path.startsWith('/') ? path.slice(1) : path;
      const res = await legacyGet<unknown>(normalized);
      if (res && typeof res === 'object' && !Array.isArray(res)) {
        const o = res as Record<string, unknown>;
        const raw = o.count ?? o.usageCount ?? o.referenceCount;
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
      }
    } catch {
      logEvent('master_data.usage_check_failed', { kind, id });
    }
    return 0;
  },
};
