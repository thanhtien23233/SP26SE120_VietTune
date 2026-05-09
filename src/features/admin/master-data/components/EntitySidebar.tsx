import { entityConfigs } from '../utils/entityFieldConfig';
import type { EntityKind } from '../types/masterDataTypes';
import { clsx } from 'clsx';
import { Music, Users, Mic2, Flame, Database } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EntitySidebarProps {
  currentKind: EntityKind;
  onSelect: (kind: EntityKind) => void;
}

const icons: Record<EntityKind, LucideIcon> = {
  instruments: Music,
  ethnicities: Users,
  rituals: Flame,
  vocalStyles: Mic2,
};

export function EntitySidebar({ currentKind, onSelect }: EntitySidebarProps) {
  const kinds = Object.keys(entityConfigs) as EntityKind[];

  return (
    <aside className="w-full md:w-60 lg:w-64 flex-shrink-0">
      {/* Floating sidebar panel */}
      <div className="md:sticky md:top-44 rounded-2xl border border-neutral-200/60 bg-surface-panel shadow-md overflow-hidden">
        {/* Sidebar header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-1.5 rounded-lg bg-primary-50">
              <Database className="w-4 h-4 text-primary-600" strokeWidth={2.2} />
            </div>
            <h2 className="text-sm font-bold text-neutral-800 tracking-tight">Dữ liệu hệ thống</h2>
          </div>
          <p className="text-xs text-neutral-500 ml-9">
            Quản lý danh mục tham chiếu
          </p>
        </div>

        {/* Navigation items */}
        <nav className="flex flex-row md:flex-col gap-0.5 px-2.5 pb-3 overflow-x-auto md:overflow-visible">
          {kinds.map((kind) => {
            const config = entityConfigs[kind];
            const Icon = icons[kind] || Music;
            const isActive = currentKind === kind;

            return (
              <button
                key={kind}
                onClick={() => onSelect(kind)}
                className={clsx(
                  'group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap md:whitespace-normal text-left',
                  isActive
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                    : 'text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900'
                )}
              >
                <Icon
                  className={clsx(
                    'w-4 h-4 flex-shrink-0 transition-colors duration-200',
                    isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-600'
                  )}
                  strokeWidth={2}
                />
                <span className="truncate">{config.title}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
