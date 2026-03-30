import type { ReactNode } from "react";
import { memo } from "react";
import { ChevronDown } from "lucide-react";
import type { ExploreFilterOptions } from "@/constants/exploreFilterOptions";
import type { ExploreFacetDraft } from "@/utils/exploreFacetDraft";
import { cn } from "@/utils/helpers";
import type { RecordingType } from "@/types";
import { Region } from "@/types";

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
    <details
      className="group border-b border-secondary-200/70 last:border-b-0"
      open={defaultOpen}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-secondary-50/95 to-[#FFFCF5] py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:from-secondary-100/90 hover:to-secondary-50/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2",
          "[&::-webkit-details-marker]:hidden",
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
          "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1",
          "[scrollbar-gutter:stable]",
        )}
      >
        <AccordionSection title="Dân tộc" defaultOpen badge={ethnicityCount}>
          {options.ethnicities.map((e) => {
            const checked = selected.ethnicityIds.includes(e.id);
            return (
              <label
                key={e.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 text-sm text-neutral-800 hover:bg-secondary-50/90"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-400 text-primary-600 focus:ring-primary-500"
                  checked={checked}
                  onChange={() => set({ ethnicityIds: toggleString(selected.ethnicityIds, e.id) })}
                />
                <span>{e.label}</span>
              </label>
            );
          })}
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
          {options.genreTags.map((g) => {
            const checked = selected.genreTags.includes(g.label);
            return (
              <label
                key={g.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-0.5 text-sm text-neutral-800 hover:bg-secondary-50/90"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-400 text-primary-600 focus:ring-primary-500"
                  checked={checked}
                  onChange={() => set({ genreTags: toggleString(selected.genreTags, g.label) })}
                />
                <span>{g.label}</span>
              </label>
            );
          })}
        </AccordionSection>

        <AccordionSection title="Nhạc cụ (một phần)" badge={instrumentCount}>
          {options.instruments.map((i) => {
            const checked = selected.instrumentTags.includes(i.label);
            return (
              <label
                key={i.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-0.5 text-sm text-neutral-800 hover:bg-secondary-50/90"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-400 text-primary-600 focus:ring-primary-500"
                  checked={checked}
                  onChange={() => set({ instrumentTags: toggleString(selected.instrumentTags, i.label) })}
                />
                <span className="leading-snug">{i.label}</span>
              </label>
            );
          })}
        </AccordionSection>

        <AccordionSection title="Khu vực" badge={regionActive}>
          <select
            value={selected.region ?? ""}
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
          {options.culturalContexts.map((c) => {
            const checked = selected.culturalTags.includes(c.label);
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 text-sm text-neutral-800 hover:bg-secondary-50/90"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-400 text-primary-600 focus:ring-primary-500"
                  checked={checked}
                  onChange={() => set({ culturalTags: toggleString(selected.culturalTags, c.label) })}
                />
                <span>{c.label}</span>
              </label>
            );
          })}
        </AccordionSection>
      </div>

      <div className="relative z-10 mt-3 shrink-0 border-t border-secondary-200/70 bg-gradient-to-t from-secondary-50/50 to-[#FFFCF5] pt-3">
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
