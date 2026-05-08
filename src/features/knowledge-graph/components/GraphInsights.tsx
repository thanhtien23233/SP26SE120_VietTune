/**
 * Phase 4 — Insights cards: "Quan sát" (observations on selected node) and "Bạn có biết"
 * (researcher-facing tips computed from the global intelligence selector).
 */
import { AlertTriangle, Compass, Lightbulb, Network, Sparkles } from 'lucide-react';
import React from 'react';

import type {
  IntelligenceObservation,
  KgIntelligenceResult,
} from '@/features/knowledge-graph/utils/kgIntelligence';

interface GraphInsightsProps {
  /** Observations attached to the currently selected node. */
  selectedObservations: IntelligenceObservation[];
  /** Global intelligence (gaps, hubs, cross-region) — used to seed the "Bạn có biết" tip pool. */
  intelligence: KgIntelligenceResult;
  /** Click an observation node to refocus the canvas/explore on it. */
  onJumpToNode: (viewerNodeId: string) => void;
}

function iconFor(kind: IntelligenceObservation['kind']) {
  switch (kind) {
    case 'gap':
      return AlertTriangle;
    case 'isolated':
      return Compass;
    case 'cross-region':
      return Network;
    case 'hub':
    default:
      return Sparkles;
  }
}

function toneFor(kind: IntelligenceObservation['kind']): string {
  switch (kind) {
    case 'gap':
      return 'text-amber-700 bg-amber-50/70 border-amber-200';
    case 'isolated':
      return 'text-neutral-700 bg-neutral-50 border-neutral-200';
    case 'cross-region':
      return 'text-blue-800 bg-blue-50/80 border-blue-200';
    case 'hub':
    default:
      return 'text-violet-800 bg-violet-50/80 border-violet-200';
  }
}

const GraphInsights: React.FC<GraphInsightsProps> = ({
  selectedObservations,
  intelligence,
  onJumpToNode,
}) => {
  // "Bạn có biết" pool = top 3 most striking insights, deduped by node.
  const tipPool: IntelligenceObservation[] = [
    ...intelligence.crossRegion,
    ...intelligence.hubObservations,
    ...intelligence.metadataGaps,
  ];
  const seen = new Set<string>();
  const tips: IntelligenceObservation[] = [];
  for (const t of tipPool) {
    if (seen.has(t.nodeId)) continue;
    seen.add(t.nodeId);
    tips.push(t);
    if (tips.length >= 3) break;
  }

  if (selectedObservations.length === 0 && tips.length === 0) return null;

  return (
    <div className="space-y-2">
      {selectedObservations.length > 0 && (
        <section
          aria-labelledby="kg-observations-title"
          className="rounded-md border border-neutral-200/80 bg-white/95 p-2"
        >
          <h4
            id="kg-observations-title"
            className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"
          >
            <Compass className="h-3 w-3" aria-hidden /> Quan sát
          </h4>
          <ul className="space-y-1">
            {selectedObservations.slice(0, 4).map((obs) => {
              const Icon = iconFor(obs.kind);
              return (
                <li key={obs.id}>
                  <p
                    className={`text-[11px] rounded border px-1.5 py-1 leading-snug flex gap-1 items-start ${toneFor(obs.kind)}`}
                  >
                    <Icon className="h-3 w-3 mt-0.5 shrink-0" aria-hidden />
                    <span>{obs.message}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tips.length > 0 && (
        <section
          aria-labelledby="kg-tips-title"
          className="rounded-md border border-primary-100 bg-primary-50/40 p-2"
        >
          <h4
            id="kg-tips-title"
            className="text-[10px] font-semibold text-primary-800 uppercase tracking-wide mb-1.5 flex items-center gap-1"
          >
            <Lightbulb className="h-3 w-3" aria-hidden /> Bạn có biết
          </h4>
          <ul className="space-y-1">
            {tips.map((tip) => {
              const Icon = iconFor(tip.kind);
              return (
                <li key={tip.id}>
                  <button
                    type="button"
                    onClick={() => onJumpToNode(tip.nodeId)}
                    className="w-full text-left text-[11px] rounded px-1.5 py-1 leading-snug bg-white/80 hover:bg-white border border-primary-100 flex gap-1 items-start"
                    title={`Xem ${tip.label}`}
                  >
                    <Icon className="h-3 w-3 mt-0.5 shrink-0 text-primary-500" aria-hidden />
                    <span>
                      <span className="font-semibold text-primary-900">{tip.label}</span>
                      <span className="text-neutral-600"> — {tip.message}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
};

export default GraphInsights;
