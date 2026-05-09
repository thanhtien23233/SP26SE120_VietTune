import { ethnicityService } from '@/services/ethnicityService';
import { instrumentService } from '@/services/instrumentService';
import { ritualService } from '@/services/ritualService';
import { vocalStyleService } from '@/services/vocalStyleService';
import type { EntityKind, ReferenceEntity } from '../types/masterDataTypes';
import type { ApiInstrumentDto, ApiEthnicGroupDto, ApiCeremonyDto, ApiVocalStyleDto } from '@/api';

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

  create: async (kind: EntityKind, data: any) => {
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

  update: async (kind: EntityKind, id: string, data: any) => {
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

  checkUsage: async (_kind: EntityKind, _id: string): Promise<number> => {
    // TODO: Phase 3 implementation plan notes that backend lacks usage endpoints.
    // E.g., GET /api/Instrument/{id}/usage.
    // For now, return 0 to allow deletion. Once backend adds the endpoint, implement here.
    return 0;
  },
};
