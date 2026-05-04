import { ListFilter } from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject } from 'react';

import {
  CONTRIBUTIONS_SUBMISSIONS_PANEL_ID,
  CONTRIBUTOR_STATUS_TABS,
  MODERATION_LEGEND_STEPS,
} from '@/features/contributions/contributionFilterConstants';
import { cn } from '@/utils/helpers';

function renderModerationLegendPills(compact: boolean) {
  return (
    <div
      className={cn('flex flex-wrap gap-2', compact ? 'gap-1.5 text-[11px]' : 'text-xs sm:text-sm')}
    >
      {MODERATION_LEGEND_STEPS.map((step, i) => (
        <span
          key={step}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-secondary-200/80 bg-gradient-to-br from-white/90 to-secondary-50/70 py-1.5 font-medium text-neutral-800 shadow-sm',
            compact ? 'pl-1 pr-2.5' : 'pl-1.5 pr-3.5',
          )}
        >
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-white font-bold text-primary-800 shadow-sm ring-1 ring-secondary-200/60',
              compact ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]',
            )}
            aria-hidden
          >
            {i + 1}
          </span>
          <span className="pr-0.5 leading-snug">{step}</span>
        </span>
      ))}
    </div>
  );
}

export interface ContributionStatusTabsSharedProps {
  activeStatusTab: number | 'ALL';
  onStatusChange: (value: number | 'ALL') => void;
  statusFilterTabClass: (isActive: boolean, layout: 'sidebar' | 'horizontal') => string;
  onContributorStatusTabKeyDown: (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
    orientation: 'horizontal' | 'vertical',
  ) => void;
  statusTabHorizRefs: MutableRefObject<(HTMLButtonElement | null)[]>;
  statusTabSideRefs: MutableRefObject<(HTMLButtonElement | null)[]>;
}

/** Horizontal scroll tabs — visible below `lg`. */
export function ContributionsMobileStatusTabs({
  activeStatusTab,
  onStatusChange,
  statusFilterTabClass,
  onContributorStatusTabKeyDown,
  statusTabHorizRefs,
}: ContributionStatusTabsSharedProps) {
  return (
    <div
      className="mb-6 flex gap-2 overflow-x-auto overscroll-x-contain pb-2 -mx-1 px-1 scrollbar-hide lg:hidden"
      role="tablist"
      aria-label="Lọc theo trạng thái"
    >
      {CONTRIBUTOR_STATUS_TABS.map((tab, index) => {
        const selected = activeStatusTab === tab.value;
        return (
          <button
            key={String(tab.value)}
            ref={(el) => {
              statusTabHorizRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`contrib-status-tab-h-${index}`}
            aria-selected={selected}
            aria-controls={CONTRIBUTIONS_SUBMISSIONS_PANEL_ID}
            tabIndex={selected ? 0 : -1}
            onClick={() => onStatusChange(tab.value)}
            onKeyDown={(e) => onContributorStatusTabKeyDown(e, index, 'horizontal')}
            className={statusFilterTabClass(selected, 'horizontal')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Sticky sidebar with moderation legend + vertical status tabs — `lg+`. */
export function ContributionsDesktopFilterAside({
  activeStatusTab,
  onStatusChange,
  statusFilterTabClass,
  onContributorStatusTabKeyDown,
  statusTabSideRefs,
}: ContributionStatusTabsSharedProps) {
  return (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-col lg:rounded-2xl lg:border lg:border-secondary-200/50 lg:bg-gradient-to-b lg:from-surface-panel lg:to-secondary-50/55 lg:p-6 lg:shadow-lg lg:backdrop-blur-sm lg:transition-all lg:duration-300 lg:hover:border-secondary-300/50 lg:hover:shadow-xl xl:p-8',
        'lg:sticky lg:top-32 lg:self-start lg:max-h-[min(100vh-10rem,56rem)] lg:overflow-y-auto xl:top-40 xl:max-h-[min(100vh-12rem,56rem)]',
      )}
      aria-label="Bảng điều khiển lọc đóng góp"
    >
      <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-neutral-900 sm:gap-3 sm:text-xl">
        <span className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100/95 to-secondary-100/90 p-2 shadow-sm ring-1 ring-secondary-200/50">
          <ListFilter className="h-5 w-5 text-primary-600" strokeWidth={2.5} aria-hidden />
        </span>
        <span className="leading-tight">Theo dõi luồng kiểm duyệt</span>
      </h2>
      <p className="mt-2 text-sm font-medium text-neutral-700">
        Các bước sàng lọc do đội ngũ duyệt thực hiện; dùng tab bên dưới để lọc đóng góp theo trạng thái.
      </p>
      <div className="mt-4">{renderModerationLegendPills(false)}</div>

      <div className="mt-8 border-t border-secondary-200/50 pt-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">Trạng thái</p>
        <div
          className="flex flex-col gap-2"
          role="tablist"
          aria-label="Lọc theo trạng thái (desktop)"
        >
          {CONTRIBUTOR_STATUS_TABS.map((tab, index) => {
            const selected = activeStatusTab === tab.value;
            return (
              <button
                key={String(tab.value)}
                ref={(el) => {
                  statusTabSideRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`contrib-status-tab-v-${index}`}
                aria-selected={selected}
                aria-controls={CONTRIBUTIONS_SUBMISSIONS_PANEL_ID}
                tabIndex={selected ? 0 : -1}
                onClick={() => onStatusChange(tab.value)}
                onKeyDown={(e) => onContributorStatusTabKeyDown(e, index, 'vertical')}
                className={statusFilterTabClass(selected, 'sidebar')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

/** Collapsible moderation legend for small screens — lives above the list inside `main`. */
export function ContributionsModerationLegendCollapsible() {
  return (
    <details className="group mb-6 rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/85 to-secondary-50/45 p-4 shadow-md backdrop-blur-sm lg:hidden open:shadow-lg">
      <summary className="cursor-pointer list-none font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100/95 to-secondary-100/90 p-1.5 ring-1 ring-secondary-200/50">
            <ListFilter className="h-4 w-4 text-primary-600" strokeWidth={2.5} aria-hidden />
          </span>
          Luồng kiểm duyệt (chú giải)
          <span className="ml-auto text-sm font-medium text-primary-700 group-open:hidden">Mở</span>
          <span className="ml-auto hidden text-sm font-medium text-primary-700 group-open:inline">
            Thu gọn
          </span>
        </span>
      </summary>
      <div className="mt-4 border-t border-secondary-200/50 pt-4">{renderModerationLegendPills(true)}</div>
    </details>
  );
}
