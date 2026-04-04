import { useMemo } from 'react';
import { Recording } from '@/types';
import { EthnicGroupItem, InstrumentItem, CeremonyItem } from '@/services/referenceDataService';
import { KnowledgeGraphData, GraphNode, GraphLink } from '@/types/graph';
import { REGION_NAMES } from '@/config/constants';

function getCeremonyLabel(r: Recording, eventTypes: string[]): string {
    const byTags = r.tags?.find((t) => t === eventTypes.find((e) => e === t) || eventTypes.some((e) => t.includes(e)));
    if (byTags) return byTags;
    const byMetadata = r.metadata?.ritualContext ?? "";
    if (byMetadata) return byMetadata;
    // @ts-expect-error object loosely typed
    const named = [r.ceremonyName, r.eventTypeName, r.ritualName].find(x => typeof x === 'string' && x.trim());
    return named || "";
}

function getRegionLabel(r: Recording): string {
    // @ts-expect-error object loosely typed
    const named = [r.regionName, r.regionLabel].find(x => typeof x === 'string' && x.trim());
    if (named) return named;
    const fromEnum = r.region ? REGION_NAMES[r.region as keyof typeof REGION_NAMES] : "";
    if (fromEnum) return fromEnum;
    // @ts-expect-error object loosely typed
    return [r.region, r.provinceName, r.recordingLocation].find(x => typeof x === 'string' && x.trim()) || "";
}

export const useKnowledgeGraphData = (
  recordings: Recording[],
  ethnicRefData: EthnicGroupItem[],
  instrumentRefData: InstrumentItem[],
  ceremonyRefData: CeremonyItem[]
): KnowledgeGraphData => {
  return useMemo(() => {
    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    const addNode = (node: GraphNode) => {
      if (!nodesMap.has(node.id)) {
        nodesMap.set(node.id, node);
      } else {
        const ext = nodesMap.get(node.id)!;
        ext.val = (ext.val || 0) + (node.val || 0); // Tăng kích thước node khi có nhiều bản thu liên chiếu tới nó
      }
    };

    const addLink = (source: string, target: string, type: string) => {
      // Chống trùng lặp connection để physics không bị đội giá trị
      const exists = links.find(l => 
        (l.source === source && l.target === target) || 
        (l.source === target && l.target === source)
      );
      if (!exists) links.push({ source, target, type });
    };

    const eventTypes = ceremonyRefData.map(c => c.name);

    // Map ảnh thumb của từng dân tộc, nhạc cụ vào Dictionary để tooltip hiển thị đẹp
    const ethImageMap: Record<string, string> = {};
    ethnicRefData.forEach(e => { if (e.imageUrl) ethImageMap[e.name] = e.imageUrl; });

    const instImageMap: Record<string, string> = {};
    instrumentRefData.forEach(i => { if (i.imageUrl) instImageMap[i.name] = i.imageUrl; });

    recordings.forEach((r) => {
      const recId = `rec_${r.id}`;
      // Node Bản thu
      addNode({
        id: recId,
        name: r.title || 'Unknown',
        type: 'recording',
        val: 1, // Kích thước cơ bản
        desc: r.description || '',
      });

      // Node Dân Tộc
      const ethName = r.ethnicity?.nameVietnamese ?? r.ethnicity?.name;
      if (ethName) {
        const ethId = `eth_${ethName}`;
        addNode({ 
            id: ethId, 
            name: ethName, 
            type: 'ethnic_group', 
            val: 0.5,
            imgUrl: ethImageMap[ethName]
        });
        addLink(recId, ethId, 'belongs_to');
      }

      // Node Vùng Miền
      const regionName = getRegionLabel(r);
      if (regionName) {
        const regId = `reg_${regionName}`;
        addNode({ id: regId, name: regionName, type: 'region', val: 0.8 });
        // Liên kết: Vùng miền -> Dân Tộc hoặc Vùng miền -> Bản thu
        if (ethName) {
          addLink(`eth_${ethName}`, regId, 'located_in');
        } else {
          addLink(recId, regId, 'located_in');
        }
      }

      // Node Nghi Lễ / Thể loại
      const cerName = getCeremonyLabel(r, eventTypes);
      if (cerName) {
        const cerId = `cer_${cerName}`;
        addNode({ id: cerId, name: cerName, type: 'ceremony', val: 0.3 });
        addLink(recId, cerId, 'played_in');
        if (ethName) {
            addLink(`eth_${ethName}`, cerId, 'performs');
        }
      }

      // Node Nhạc cụ
      if (r.instruments) {
        r.instruments.forEach(inst => {
          const iname = inst.nameVietnamese ?? inst.name;
          if (iname) {
            const instId = `inst_${iname}`;
            addNode({ 
                id: instId, 
                name: iname, 
                type: 'instrument', 
                val: 0.4,
                imgUrl: instImageMap[iname]
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
      links
    };
  }, [recordings, ethnicRefData, instrumentRefData, ceremonyRefData]);
};
