import { CalendarDays, Map, MapPin, Music2, Users } from 'lucide-react';
import React, { useState } from 'react';

import SearchableDropdown from '@/components/common/SearchableDropdown';
import { REGION_NAMES } from '@/config/constants';
import type {
  ResearcherFilterDropdownKey,
  SearchFiltersState,
} from '@/features/researcher/researcherPortalTypes';
import type {
  CeremonyItem,
  CommuneItem,
  EthnicGroupItem,
  InstrumentItem,
} from '@/services/referenceDataService';

export interface ResearcherFilterBarProps {
  filters: SearchFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<SearchFiltersState>>;
  activeFilterCount: number;
  ethnicRefData: EthnicGroupItem[];
  instrumentRefData: InstrumentItem[];
  ceremonyRefData: CeremonyItem[];
  communeRefData: CommuneItem[];
}

export default function ResearcherFilterBar({
  filters,
  setFilters,
  activeFilterCount,
  ethnicRefData,
  instrumentRefData,
  ceremonyRefData,
  communeRefData,
}: ResearcherFilterBarProps) {
  const [filterDropdownOpen, setFilterDropdownOpen] = useState<ResearcherFilterDropdownKey | null>(
    null,
  );

  return (
    <div className="rounded-2xl border border-primary-200/60 bg-gradient-to-br from-surface-panel via-white to-primary-50/30 shadow-sm p-5 sm:p-6">
      <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-primary-800 tracking-tight">Bộ lọc nâng cao</h3>
          <p className="text-xs text-neutral-500 mt-1">Lọc nhanh theo metadata đã xác minh.</p>
          {activeFilterCount > 0 && (
            <p className="text-[11px] text-primary-700 mt-1">
              Đang áp dụng {activeFilterCount} bộ lọc
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            setFilters({
              ethnicGroupId: '',
              instrumentId: '',
              regionCode: '',
              ceremonyId: '',
              communeId: '',
            })
          }
          disabled={activeFilterCount === 0}
          className="text-xs px-3 py-1.5 rounded-lg border border-primary-200/80 text-primary-700 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Xóa tất cả
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
        {(
          [
            {
              key: 'ethnic' as const,
              label: 'Dân tộc',
              icon: Users,
              placeholder: 'Tất cả dân tộc',
              value: ethnicRefData.find((x) => x.id === filters.ethnicGroupId)?.name || '',
              onChange: (v: string) =>
                setFilters((p) => ({
                  ...p,
                  ethnicGroupId: ethnicRefData.find((x) => x.name === v)?.id || '',
                })),
              options: ethnicRefData.map((x) => x.name),
              searchable: true,
            },
            {
              key: 'instrument' as const,
              label: 'Nhạc cụ',
              icon: Music2,
              placeholder: 'Tất cả nhạc cụ',
              value: instrumentRefData.find((x) => x.id === filters.instrumentId)?.name || '',
              onChange: (v: string) =>
                setFilters((p) => ({
                  ...p,
                  instrumentId: instrumentRefData.find((x) => x.name === v)?.id || '',
                })),
              options: instrumentRefData.map((x) => x.name),
              searchable: true,
            },
            {
              key: 'ceremony' as const,
              label: 'Nghi lễ',
              icon: CalendarDays,
              placeholder: 'Tất cả nghi lễ',
              value: ceremonyRefData.find((x) => x.id === filters.ceremonyId)?.name || '',
              onChange: (v: string) =>
                setFilters((p) => ({
                  ...p,
                  ceremonyId: ceremonyRefData.find((x) => x.name === v)?.id || '',
                })),
              options: ceremonyRefData.map((x) => x.name),
              searchable: false,
            },
            {
              key: 'region' as const,
              label: 'Vùng miền',
              icon: Map,
              placeholder: 'Tất cả vùng miền',
              value: filters.regionCode
                ? REGION_NAMES[filters.regionCode as keyof typeof REGION_NAMES] || ''
                : '',
              onChange: (v: string) =>
                setFilters((p) => ({
                  ...p,
                  regionCode: Object.entries(REGION_NAMES).find(([, label]) => label === v)?.[0] || '',
                })),
              options: Object.values(REGION_NAMES),
              searchable: false,
            },
            {
              key: 'commune' as const,
              label: 'Xã / Phường',
              icon: MapPin,
              placeholder: 'Tất cả xã / phường',
              value: communeRefData.find((x) => x.id === filters.communeId)?.name || '',
              onChange: (v: string) =>
                setFilters((p) => ({
                  ...p,
                  communeId: communeRefData.find((x) => x.name === v)?.id || '',
                })),
              options: communeRefData.map((x) => x.name),
              searchable: true,
            },
          ] as const
        ).map((field) => {
          const Icon = field.icon;
          return (
            <div
              key={field.key}
              className="flex flex-col gap-2 min-h-0 rounded-xl border border-neutral-200/75 bg-white/90 p-3.5 sm:p-4 shadow-sm hover:border-primary-200/80 hover:shadow transition-all"
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-primary-800 select-none">
                <Icon
                  className="w-4 h-4 text-primary-600 flex-shrink-0"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span className="truncate">{field.label}</span>
              </label>
              <SearchableDropdown
                value={field.value}
                onChange={field.onChange}
                options={field.options}
                placeholder={field.placeholder}
                searchable={field.searchable}
                isOpen={filterDropdownOpen === field.key}
                onOpenChange={(open) => setFilterDropdownOpen(open ? field.key : null)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
