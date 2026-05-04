import { ChevronDown, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { memo, useMemo, useState } from 'react';

import type { ExploreFilterOptions } from '@/constants/exploreFilterOptions';
import type { ExploreFacetDraft } from '@/features/explore/utils/exploreFacetDraft';
import type { RecordingType } from '@/types';
import { Region } from '@/types';
import { cn } from '@/utils/helpers';

export type FilterSidebarProps = {
  options: ExploreFilterOptions;
  selected: ExploreFacetDraft;
  onChange: (next: ExploreFacetDraft) => void;
  onApply: () => void;
  onReset: () => void;
};

function toggleString(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function toggleRecordingType(list: RecordingType[], value: RecordingType): RecordingType[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

type LabeledFilterItem = { id: string; label: string };

function SearchableCheckboxList({
  items,
  placeholder,
  ariaLabel,
  emptyMessage,
  isChecked,
  onToggle,
  labelRowClassName = 'py-1',
  labelTextClassName,
}: {
  items: LabeledFilterItem[];
  placeholder: string;
  ariaLabel: string;
  emptyMessage: string;
  isChecked: (item: LabeledFilterItem) => boolean;
  onToggle: (item: LabeledFilterItem) => void;
  /** Padding row: dòng nhạc / nhạc cụ dùng py-0.5 */
  labelRowClassName?: string;
  /** Ví dụ leading-snug cho nhãn dài */
  labelTextClassName?: string;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) => e.label.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <>
      <div className="relative mb-1.5 shrink-0">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          className="w-full rounded-lg border border-secondary-200/80 bg-white py-2 pl-8 pr-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="px-1 text-xs text-neutral-500">{emptyMessage}</p>
      ) : (
        filtered.map((item) => (
          <label
            key={item.id}
            className={cn(
              'flex cursor-pointer items-start gap-2 rounded-lg px-1 text-sm text-neutral-800 hover:bg-secondary-50/90',
              labelRowClassName,
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-400 text-primary-600 focus:ring-primary-500"
              checked={isChecked(item)}
              onChange={() => onToggle(item)}
            />
            <span className={labelTextClassName}>{item.label}</span>
          </label>
        ))
      )}
    </>
  );
}

const MemoSearchableCheckboxList = memo(SearchableCheckboxList);

function AccordionSection({
  title,
  defaultOpen,
  children,
  badge,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <details className="group border-b border-secondary-200/70 last:border-b-0" open={defaultOpen}>
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-secondary-50/95 to-surface-panel py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:from-secondary-100/90 hover:to-secondary-50/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 leading-snug">{title}</span>
          {badge != null && badge > 0 ? (
            <span className="shrink-0 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              {badge}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-secondary-700/70 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-2 pb-3 pt-2">{children}</div>
    </details>
  );
}

function FilterSidebar({ options, selected, onChange, onApply, onReset }: FilterSidebarProps) {
  const set = (patch: Partial<ExploreFacetDraft>) => onChange({ ...selected, ...patch });

  const ethnicityCount = selected.ethnicityIds.length;
  const recordingTypeCount = selected.recordingTypes.length;
  const genreCount = selected.genreTags.length;
  const instrumentCount = selected.instrumentTags.length;
  const contextCount = selected.culturalTags.length;
  const regionActive = selected.region ? 1 : 0;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1',
          '[scrollbar-gutter:stable]',
        )}
      >
        <AccordionSection title="Dân tộc" defaultOpen badge={ethnicityCount}>
          <MemoSearchableCheckboxList
            items={options.ethnicities}
            placeholder="Tìm dân tộc…"
            ariaLabel="Tìm trong danh sách dân tộc"
            emptyMessage="Không có dân tộc khớp bộ lọc."
            isChecked={(e) => selected.ethnicityIds.includes(e.id)}
            onToggle={(e) => set({ ethnicityIds: toggleString(selected.ethnicityIds, e.id) })}
          />
        </AccordionSection>

        <AccordionSection title="Thể loại ghi âm" defaultOpen badge={recordingTypeCount}>
          {options.recordingTypes.map((t) => {
            const checked = selected.recordingTypes.includes(t.value);
            return (
              <label
                key={t.value}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-0.5 text-sm text-neutral-800 hover:bg-secondary-50/90"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-400 text-primary-600 focus:ring-primary-500"
                  checked={checked}
                  onChange={() =>
                    set({
                      recordingTypes: toggleRecordingType(selected.recordingTypes, t.value),
                    })
                  }
                />
                <span>{t.label}</span>
              </label>
            );
          })}
        </AccordionSection>

        <AccordionSection title="Dòng nhạc / thể loại dân gian" badge={genreCount}>
          <MemoSearchableCheckboxList
            items={options.genreTags}
            placeholder="Tìm dòng nhạc…"
            ariaLabel="Tìm trong danh sách dòng nhạc và thể loại dân gian"
            emptyMessage="Không có mục khớp bộ lọc."
            labelRowClassName="py-0.5"
            isChecked={(g) => selected.genreTags.includes(g.label)}
            onToggle={(g) => set({ genreTags: toggleString(selected.genreTags, g.label) })}
          />
        </AccordionSection>

        <AccordionSection title="Nhạc cụ (một phần)" badge={instrumentCount}>
          <MemoSearchableCheckboxList
            items={options.instruments}
            placeholder="Tìm nhạc cụ…"
            ariaLabel="Tìm trong danh sách nhạc cụ"
            emptyMessage="Không có nhạc cụ khớp bộ lọc."
            labelRowClassName="py-0.5"
            labelTextClassName="leading-snug"
            isChecked={(i) => selected.instrumentTags.includes(i.label)}
            onToggle={(i) =>
              set({ instrumentTags: toggleString(selected.instrumentTags, i.label) })
            }
          />
        </AccordionSection>

        <AccordionSection title="Khu vực" badge={regionActive}>
          <select
            value={selected.region ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                set({ region: null });
                return;
              }
              if (Object.values(Region).includes(v as Region)) {
                set({ region: v as Region });
              }
            }}
            className="w-full rounded-lg border border-secondary-200/80 bg-gradient-to-r from-secondary-50/90 to-cream-50/95 px-3 py-2.5 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none focus:ring-2 focus:ring-secondary-300/40"
            aria-label="Lọc theo khu vực"
          >
            <option value="">Tất cả khu vực</option>
            {options.regions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </AccordionSection>

        <AccordionSection title="Bối cảnh văn hóa" badge={contextCount}>
          <MemoSearchableCheckboxList
            items={options.culturalContexts}
            placeholder="Tìm bối cảnh…"
            ariaLabel="Tìm trong danh sách bối cảnh văn hóa"
            emptyMessage="Không có bối cảnh khớp bộ lọc."
            isChecked={(c) => selected.culturalTags.includes(c.label)}
            onToggle={(c) => set({ culturalTags: toggleString(selected.culturalTags, c.label) })}
          />
        </AccordionSection>
      </div>

      <div className="relative z-10 mt-3 shrink-0 border-t border-secondary-200/70 bg-gradient-to-t from-secondary-50/50 to-surface-panel pt-3">
        <button
          type="button"
          onClick={onApply}
          className="min-h-[44px] w-full rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition hover:from-primary-500 hover:to-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
        >
          Áp dụng
        </button>
        <button
          type="button"
          onClick={onReset}
          className="mt-2 min-h-[44px] w-full rounded-xl border-2 border-secondary-300/80 bg-gradient-to-br from-secondary-100 to-secondary-200/75 px-4 py-2.5 text-sm font-semibold text-primary-900 shadow-sm transition hover:from-secondary-200 hover:to-secondary-300/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
        >
          Xóa bộ lọc
        </button>
      </div>
    </div>
  );
}

export default memo(FilterSidebar);
