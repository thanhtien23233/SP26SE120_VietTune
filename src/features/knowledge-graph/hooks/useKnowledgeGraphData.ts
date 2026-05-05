import { useMemo } from 'react';

import { REGION_NAMES } from '@/config/constants';
import type { ResearcherAnalysisRecord } from '@/features/researcher/researcherPortalTypes';
import { CeremonyItem, EthnicGroupItem, InstrumentItem } from '@/services/referenceDataService';
import { Recording } from '@/types';
import { GraphLink, GraphNode, KnowledgeGraphData } from '@/types/graph';
import { normalizeSearchText } from '@/utils/searchText';

function asRow(r: Recording): Record<string, unknown> {
  return r as unknown as Record<string, unknown>;
}

function getCeremonyLabel(r: Recording, eventTypes: string[]): string {
  const byTags = r.tags?.find(
    (t) => t === eventTypes.find((e) => e === t) || eventTypes.some((e) => t.includes(e)),
  );
  if (byTags) return byTags;
  const byMetadata = r.metadata?.ritualContext ?? '';
  if (byMetadata) return byMetadata;
  const row = asRow(r);
  const named = [row.ceremonyName, row.eventTypeName, row.ritualName].find(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  );
  return named || '';
}

function getRegionLabel(r: Recording): string {
  const row = asRow(r);
  const named = [row.regionName, row.regionLabel].find(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  );
  if (named) return named;
  const fromEnum = r.region ? REGION_NAMES[r.region as keyof typeof REGION_NAMES] : '';
  if (fromEnum) return fromEnum;
  return (
    [r.region, row.provinceName, row.recordingLocation].find(
      (x): x is string => typeof x === 'string' && x.trim().length > 0,
    ) || ''
  );
}

function normalizeId(id: string | undefined, name: string): string {
  if (id && id.trim()) return id.trim();
  return normalizeSearchText(name) || 'unknown';
}

// TODO: Phase 2 - Move this massive graph computation to backend/Neo4j API
// when the dataset scales beyond a few thousand nodes to prevent UI freezes.
export function buildKnowledgeGraphData(
  recordings: ResearcherAnalysisRecord[],
  ethnicRefData: EthnicGroupItem[],
  instrumentRefData: InstrumentItem[],
  ceremonyRefData: CeremonyItem[],
): KnowledgeGraphData {
  if (!recordings || recordings.length === 0) return { nodes: [], links: [] };

  const nodesMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  /** Canonical undirected pair (order-independent), matching prior `find` dedup (type of first edge kept). */
  const linkKeySet = new Set<string>();

  const addNode = (node: GraphNode) => {
    if (!node.id || !node.name) return;
    if (!nodesMap.has(node.id)) {
      nodesMap.set(node.id, node);
    } else {
      const ext = nodesMap.get(node.id)!;
      ext.val = Math.max(ext.val ?? 0, node.val ?? 0);
      if (!ext.backendId && node.backendId) ext.backendId = node.backendId;
      if (!ext.apiEntityType && node.apiEntityType) ext.apiEntityType = node.apiEntityType;
    }
  };

  const addLink = (source: string, target: string, type: string) => {
    if (!source || !target || source === target) return;
    const lo = source < target ? source : target;
    const hi = source < target ? target : source;
    const key = `${lo}\0${hi}`;
    if (linkKeySet.has(key)) return;
    linkKeySet.add(key);
    links.push({ source, target, type });
  };

  const eventTypes = ceremonyRefData.map((c) => c.name);

  const ethImageMap: Record<string, string> = {};
  ethnicRefData.forEach((e) => {
    if (e.imageUrl) ethImageMap[e.id] = e.imageUrl;
  });

  const instImageMap: Record<string, string> = {};
  instrumentRefData.forEach((i) => {
    if (i.imageUrl) instImageMap[i.id] = i.imageUrl;
  });

  recordings.forEach((r) => {
    if (!r || !r.id) return;
    const recId = `rec_${r.id}`;
    addNode({
      id: recId,
      backendId: r.id,
      name: r.title || 'Unknown',
      type: 'recording',
      apiEntityType: 'Recording',
      val: 1,
      desc: r.description || '',
    });

    const ethName = r.mappedEthnicity || r.ethnicity?.nameVietnamese || r.ethnicity?.name;
    const rawEthId = r.ethnicity?.id;
    let ethGraphId = '';
    if (ethName) {
      ethGraphId = `eth_${normalizeId(rawEthId, ethName)}`;
      addNode({
        id: ethGraphId,
        backendId: rawEthId?.trim() || undefined,
        name: ethName,
        type: 'ethnic_group',
        apiEntityType: 'EthnicGroup',
        val: 0.5,
        imgUrl: rawEthId ? ethImageMap[rawEthId] : undefined,
      });
      addLink(recId, ethGraphId, 'belongs_to');
    }

    const regionName = getRegionLabel(r);
    if (regionName) {
      const regGraphId = `reg_${normalizeId(r.region, regionName)}`;
      addNode({
        id: regGraphId,
        name: regionName,
        type: 'region',
        apiEntityType: 'Province',
        val: 0.8,
      });
      if (ethGraphId) {
        addLink(ethGraphId, regGraphId, 'located_in');
      } else {
        addLink(recId, regGraphId, 'located_in');
      }
    }

    const cerName = getCeremonyLabel(r, eventTypes);
    if (cerName) {
      const rawCerId = ceremonyRefData.find((c) => c.name === cerName)?.id;
      const cerGraphId = `cer_${normalizeId(rawCerId, cerName)}`;
      addNode({
        id: cerGraphId,
        backendId: rawCerId?.trim() || undefined,
        name: cerName,
        type: 'ceremony',
        apiEntityType: 'Ceremony',
        val: 0.3,
      });
      addLink(recId, cerGraphId, 'played_in');
      if (ethGraphId) {
        addLink(ethGraphId, cerGraphId, 'performs');
      }
    }

    if (r.instruments) {
      r.instruments.forEach((inst) => {
        const iname = inst.nameVietnamese ?? inst.name;
        if (iname) {
          const instGraphId = `inst_${normalizeId(inst.id, iname)}`;
          addNode({
            id: instGraphId,
            backendId: inst.id?.trim() || undefined,
            name: iname,
            type: 'instrument',
            apiEntityType: 'Instrument',
            val: 0.4,
            imgUrl: inst.id ? instImageMap[inst.id] : undefined,
          });
          addLink(recId, instGraphId, 'uses_instrument');
          if (ethGraphId) {
            addLink(instGraphId, ethGraphId, 'instrument_of');
          }
        }
      });
    }
  });

  return {
    nodes: Array.from(nodesMap.values()),
    links,
  };
}

export const useKnowledgeGraphData = (
  recordings: ResearcherAnalysisRecord[],
  ethnicRefData: EthnicGroupItem[],
  instrumentRefData: InstrumentItem[],
  ceremonyRefData: CeremonyItem[],
): KnowledgeGraphData => {
  return useMemo(
    () => buildKnowledgeGraphData(recordings, ethnicRefData, instrumentRefData, ceremonyRefData),
    [recordings, ethnicRefData, instrumentRefData, ceremonyRefData],
  );
};
