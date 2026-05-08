/**
 * Phase 3 — Exploration breadcrumb.
 *
 * Renders the linear path of nodes the user has explored, from the original entry point to
 * the current focus. Clicking any segment teleports back to that step (truncates the trail).
 */
import { ChevronRight, Compass, Home } from 'lucide-react';
import React from 'react';

import type { ExploreHistoryStep } from '@/features/knowledge-graph/hooks/useKnowledgeGraphController';

interface GraphBreadcrumbProps {
  history: ExploreHistoryStep[];
  onJump: (index: number) => void;
  onReset: () => void;
}

const ENTITY_LABEL_VI: Record<string, string> = {
  EthnicGroup: 'Dân tộc',
  Instrument: 'Nhạc cụ',
  Ceremony: 'Nghi lễ',
  Recording: 'Bản thu',
  Province: 'Địa phương',
  VocalStyle: 'Lối hát',
  MusicalScale: 'Điệu thức',
  Tag: 'Thẻ',
};

const GraphBreadcrumb: React.FC<GraphBreadcrumbProps> = ({ history, onJump, onReset }) => {
  if (history.length === 0) return null;
  return (
    <nav
      aria-label="Lịch sử khám phá"
      className="flex flex-wrap items-center gap-1 rounded-lg border border-primary-100 bg-primary-50/40 px-2 py-1.5 text-[11px] text-primary-900"
    >
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold hover:bg-white/80"
        title="Về tổng quan"
      >
        <Home className="h-3 w-3" aria-hidden />
        <span className="hidden sm:inline">Tổng quan</span>
      </button>
      {history.map((step, idx) => {
        const isLast = idx === history.length - 1;
        const typeLabel = ENTITY_LABEL_VI[step.entityType] ?? step.entityType;
        return (
          <React.Fragment key={`${step.viewerNodeId}-${idx}`}>
            <ChevronRight className="h-3 w-3 shrink-0 text-primary-300" aria-hidden />
            <button
              type="button"
              disabled={isLast}
              onClick={() => onJump(idx)}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 max-w-[14ch] truncate ${
                isLast
                  ? 'cursor-default bg-white text-primary-900 font-semibold ring-1 ring-primary-200'
                  : 'hover:bg-white/80 text-primary-700'
              }`}
              title={`${typeLabel} · ${step.label}`}
            >
              <Compass className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              <span className="truncate">{step.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default GraphBreadcrumb;
