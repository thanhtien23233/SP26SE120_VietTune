import { useMemo } from 'react';

import { REGION_NAMES } from '@/config/constants';
import { buildViewerNodeId } from '@/features/knowledge-graph/utils/knowledgeGraphApiAdapter';
import type { ResearcherAnalysisRecord } from '@/features/researcher/researcherPortalTypes';
import { CeremonyItem, EthnicGroupItem, InstrumentItem } from '@/services/referenceDataService';
import { Recording } from '@/types';
import { ApiEntityType, GraphLink, GraphNode, KnowledgeGraphData } from '@/types/graph';
import { normalizeSearchText } from '@/utils/searchText';

/** Build composite viewer id + entity flags consistently with the API adapter. */
function makeLocalNode(
  entityType: ApiEntityType,
  entityId: string | null | undefined,
  fallbackSlug: string,
  partial: Omit<GraphNode, 'id' | 'viewerNodeId' | 'entityId' | 'entityType' | 'explorable' | 'backendId' | 'apiEntityType'>,
): GraphNode {
  const trimmedId = entityId?.trim() || null;
  const id = buildViewerNodeId(entityType, trimmedId, fallbackSlug);
  return {
    ...partial,
    id,
    viewerNodeId: id,
    entityId: trimmedId,
    entityType,
    explorable: !!trimmedId,
    backendId: trimmedId ?? undefined,
    apiEntityType: entityType,
  };
}

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

function makeSlug(name: string): string {
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
      if (!ext.entityId && node.entityId) ext.entityId = node.entityId;
      if (!ext.entityType && node.entityType) ext.entityType = node.entityType;
      if (!ext.explorable && node.explorable) ext.explorable = node.explorable;
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
    const recNode = makeLocalNode('Recording', r.id, makeSlug(r.title || r.id), {
      name: r.title || 'Unknown',
      type: 'recording',
      val: 1,
      desc: r.description || '',
    });
    addNode(recNode);
    const recId = recNode.id;

    const ethName = r.mappedEthnicity || r.ethnicity?.nameVietnamese || r.ethnicity?.name;
    const rawEthId = r.ethnicity?.id;
    let ethGraphId = '';
    if (ethName) {
      const ethNode = makeLocalNode('EthnicGroup', rawEthId, makeSlug(ethName), {
        name: ethName,
        type: 'ethnic_group',
        val: 0.5,
        imgUrl: rawEthId ? ethImageMap[rawEthId] : undefined,
      });
      addNode(ethNode);
      ethGraphId = ethNode.id;
      addLink(recId, ethGraphId, 'belongs_to');
    }

    const regionName = getRegionLabel(r);
    if (regionName) {
      const regNode = makeLocalNode('Province', undefined, makeSlug(r.region || regionName), {
        name: regionName,
        type: 'region',
        val: 0.8,
      });
      addNode(regNode);
      if (ethGraphId) addLink(ethGraphId, regNode.id, 'located_in');
      else addLink(recId, regNode.id, 'located_in');
    }

    const cerName = getCeremonyLabel(r, eventTypes);
    if (cerName) {
      const rawCerId = ceremonyRefData.find((c) => c.name === cerName)?.id;
      const cerNode = makeLocalNode('Ceremony', rawCerId, makeSlug(cerName), {
        name: cerName,
        type: 'ceremony',
        val: 0.3,
      });
      addNode(cerNode);
      addLink(recId, cerNode.id, 'played_in');
      if (ethGraphId) addLink(ethGraphId, cerNode.id, 'performs');
    }

    if (r.instruments) {
      r.instruments.forEach((inst) => {
        const iname = inst.nameVietnamese ?? inst.name;
        if (!iname) return;
        const instNode = makeLocalNode('Instrument', inst.id, makeSlug(iname), {
          name: iname,
          type: 'instrument',
          val: 0.4,
          imgUrl: inst.id ? instImageMap[inst.id] : undefined,
        });
        addNode(instNode);
        addLink(recId, instNode.id, 'uses_instrument');
        if (ethGraphId) addLink(instNode.id, ethGraphId, 'instrument_of');
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
