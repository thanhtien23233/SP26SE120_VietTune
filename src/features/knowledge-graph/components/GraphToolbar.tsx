/**
 * Phase 4 — semantic mode toolbar.
 *
 * Lets researchers ask "show me only X" without rebuilding the graph: ethnicity, region,
 * ceremony, hub, or `free` (no filter). The viewer can use this as additional dim signal.
 */
import { Compass, Layers, MapPin, Mic2, Sparkles, Users } from 'lucide-react';
import React from 'react';

import type { SemanticMode } from '@/features/knowledge-graph/utils/kgIntelligence';

interface GraphToolbarProps {
  mode: SemanticMode;
  onChange: (mode: SemanticMode) => void;
}

const MODES: { id: SemanticMode; label: string; Icon: typeof Compass; tone: string }[] = [
  { id: 'free', label: 'Tự do', Icon: Compass, tone: 'text-neutral-700' },
  { id: 'ethnicity', label: 'Theo dân tộc', Icon: Users, tone: 'text-emerald-700' },
  { id: 'region', label: 'Theo vùng', Icon: MapPin, tone: 'text-blue-700' },
  { id: 'ceremony', label: 'Theo nghi lễ', Icon: Mic2, tone: 'text-violet-700' },
  { id: 'hub', label: 'Trung tâm', Icon: Sparkles, tone: 'text-amber-700' },
];

const GraphToolbar: React.FC<GraphToolbarProps> = ({ mode, onChange }) => {
  return (
    <div
      role="toolbar"
      aria-label="Chế độ khám phá ngữ nghĩa"
      className="flex flex-wrap items-center gap-1 rounded-lg border border-neutral-200/80 bg-white/80 px-2 py-1.5"
    >
      <Layers className="h-3 w-3 text-neutral-400 mr-0.5" aria-hidden />
      {MODES.map(({ id, label, Icon, tone }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              active
                ? 'bg-primary-100 text-primary-900 ring-1 ring-primary-200'
                : `hover:bg-neutral-100 ${tone}`
            }`}
            title={label}
          >
            <Icon className="h-3 w-3 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default GraphToolbar;
