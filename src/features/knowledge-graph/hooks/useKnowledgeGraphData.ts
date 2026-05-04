import { useMemo } from 'react';

import { REGION_NAMES } from '@/config/constants';
import { EthnicGroupItem, InstrumentItem, CeremonyItem } from '@/services/referenceDataService';
import { Recording } from '@/types';
import { KnowledgeGraphData, GraphNode, GraphLink } from '@/types/graph';

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

export const useKnowledgeGraphData = (
  recordings: Recording[],
  ethnicRefData: EthnicGroupItem[],
  instrumentRefData: InstrumentItem[],
  ceremonyRefData: CeremonyItem[],
): KnowledgeGraphData => {
  return useMemo(() => {
    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    const addNode = (node: GraphNode) => {
      if (!nodesMap.has(node.id)) {
        nodesMap.set(node.id, node);
      } else {
        const ext = nodesMap.get(node.id)!;
        ext.val = (ext.val || 0) + (node.val || 0);
      }
    };

    const addLink = (source: string, target: string, type: string) => {
      const exists = links.find(
        (l) =>
          (l.source === source && l.target === target) ||
          (l.source === target && l.target === source),
      );
      if (!exists) links.push({ source, target, type });
    };

    const eventTypes = ceremonyRefData.map((c) => c.name);

    const ethImageMap: Record<string, string> = {};
    ethnicRefData.forEach((e) => {
      if (e.imageUrl) ethImageMap[e.name] = e.imageUrl;
    });

    const instImageMap: Record<string, string> = {};
    instrumentRefData.forEach((i) => {
      if (i.imageUrl) instImageMap[i.name] = i.imageUrl;
    });

    recordings.forEach((r) => {
      const recId = `rec_${r.id}`;
      addNode({
        id: recId,
        name: r.title || 'Unknown',
        type: 'recording',
        val: 1,
        desc: r.description || '',
      });

      const ethName = r.ethnicity?.nameVietnamese ?? r.ethnicity?.name;
      if (ethName) {
        const ethId = `eth_${ethName}`;
        addNode({
          id: ethId,
          name: ethName,
          type: 'ethnic_group',
          val: 0.5,
          imgUrl: ethImageMap[ethName],
        });
        addLink(recId, ethId, 'belongs_to');
      }

      const regionName = getRegionLabel(r);
      if (regionName) {
        const regId = `reg_${regionName}`;
        addNode({ id: regId, name: regionName, type: 'region', val: 0.8 });
        if (ethName) {
          addLink(`eth_${ethName}`, regId, 'located_in');
        } else {
          addLink(recId, regId, 'located_in');
        }
      }

      const cerName = getCeremonyLabel(r, eventTypes);
      if (cerName) {
        const cerId = `cer_${cerName}`;
        addNode({ id: cerId, name: cerName, type: 'ceremony', val: 0.3 });
        addLink(recId, cerId, 'played_in');
        if (ethName) {
          addLink(`eth_${ethName}`, cerId, 'performs');
        }
      }

      if (r.instruments) {
        r.instruments.forEach((inst) => {
          const iname = inst.nameVietnamese ?? inst.name;
          if (iname) {
            const instId = `inst_${iname}`;
            addNode({
              id: instId,
              name: iname,
              type: 'instrument',
              val: 0.4,
              imgUrl: instImageMap[iname],
            });
            addLink(recId, instId, 'uses_instrument');
            if (ethName) {
              addLink(instId, `eth_${ethName}`, 'instrument_of');
            }
          }
        });
      }
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links,
    };
  }, [recordings, ethnicRefData, instrumentRefData, ceremonyRefData]);
};
