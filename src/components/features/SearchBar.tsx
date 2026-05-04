import { Search, MapPin, Music, Filter, AlertCircle } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';

import {
  CollapsibleSection,
  FormField,
  MultiSelectTags,
  SearchableDropdown,
} from '@/components/features/search/SearchBarPrimitives';
import {
  ETHNICITIES,
  EVENT_TYPES,
  GENRES,
  GENRE_ETHNICITY_MAP,
  INSTRUMENTS,
  PERFORMANCE_TYPES,
  PROVINCES,
  REGION_TO_LABEL,
  REGIONS,
  VERIFICATION_STATUS,
  YEAR_RANGES,
} from '@/features/search/searchBarConstants';
import { SearchFilters, Region, RecordingType, VerificationStatus } from '@/types';

// ===== MAIN COMPONENT =====
interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
}

export default function SearchBar({ onSearch, initialFilters = {} }: SearchBarProps) {
  const [query, setQuery] = useState(initialFilters.query || '');
  const [genres, setGenres] = useState<string[]>([]);
  const [ethnicity, setEthnicity] = useState('');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [eventType, setEventType] = useState('');
  const [performanceType, setPerformanceType] = useState('');
  const [instruments, setInstruments] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');

  // Hydrate form from initialFilters (e.g. URL params or parent state) so filter search can be restored
  useEffect(() => {
    if (!initialFilters || Object.keys(initialFilters).length === 0) return;
    if (initialFilters.query !== undefined) setQuery(initialFilters.query);
    if (initialFilters.regions?.length) {
      const label = REGION_TO_LABEL[initialFilters.regions[0]];
      if (label) setRegion(label);
    }
    if (initialFilters.recordingTypes?.length) {
      const rt = initialFilters.recordingTypes[0];
      const pt = PERFORMANCE_TYPES.find(
        (p) =>
          (rt === RecordingType.INSTRUMENTAL && p.key === 'instrumental') ||
          (rt === RecordingType.VOCAL &&
            (p.key === 'acappella' || p.key === 'vocal_accompaniment')),
      );
      if (pt) setPerformanceType(pt.label);
    }
    if (initialFilters.verificationStatus?.length) {
      const vs = VERIFICATION_STATUS.find((s) => s.key === initialFilters.verificationStatus![0]);
      if (vs) setVerificationStatus(vs.label);
    }
    if (initialFilters.dateFrom || initialFilters.dateTo) {
      const from = initialFilters.dateFrom;
      const to = initialFilters.dateTo;
      const yr = YEAR_RANGES.find((y) => {
        switch (y.key) {
          case 'before_1950':
            return to === '1949-12-31';
          case '1950_1975':
            return from === '1950-01-01' && to === '1975-12-31';
          case '1975_2000':
            return from === '1975-01-01' && to === '2000-12-31';
          case '2000_2010':
            return from === '2000-01-01' && to === '2010-12-31';
          case '2010_2020':
            return from === '2010-01-01' && to === '2020-12-31';
          case 'after_2020':
            return from === '2021-01-01';
          default:
            return false;
        }
      });
      if (yr) setYearRange(yr.label);
    }
    if (initialFilters.tags?.length) {
      const tags = initialFilters.tags;
      const newGenres = tags.filter((t) => GENRES.includes(t));
      const newInstruments = tags.filter((t) => INSTRUMENTS.includes(t));
      const eth = tags.find((t) => ETHNICITIES.includes(t));
      const prov = tags.find((t) => PROVINCES.includes(t));
      const evt = tags.find((t) => EVENT_TYPES.includes(t));
      if (newGenres.length) setGenres(newGenres);
      if (newInstruments.length) setInstruments(newInstruments);
      if (eth) setEthnicity(eth);
      if (prov) setProvince(prov);
      if (evt) setEventType(evt);
    }
  }, [initialFilters]);

  // Check for genre-ethnicity mismatch
  const genreEthnicityWarning = useMemo(() => {
    if (genres.length === 1 && ethnicity && ethnicity !== 'Tất cả dân tộc') {
      const genre = genres[0];
      const expectedEthnicities = GENRE_ETHNICITY_MAP[genre];
      if (expectedEthnicities && !expectedEthnicities.includes(ethnicity)) {
        return `Lưu ý: Thể loại "${genre}" thường là đặc trưng của người ${expectedEthnicities.join(', ')}. Tuy nhiên, giao lưu văn hóa giữa các dân tộc là điều bình thường.`;
      }
    }
    return null;
  }, [genres, ethnicity]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (genres.length > 0) count++;
    if (ethnicity && !ethnicity.startsWith('Tất cả')) count++;
    if (region && !region.startsWith('Tất cả')) count++;
    if (province && !province.startsWith('Tất cả')) count++;
    if (eventType && !eventType.startsWith('Tất cả')) count++;
    if (performanceType && !performanceType.startsWith('Tất cả')) count++;
    if (instruments.length > 0) count++;
    if (yearRange && !yearRange.startsWith('Tất cả')) count++;
    if (verificationStatus && !verificationStatus.startsWith('Tất cả')) count++;
    return count;
  }, [
    genres,
    ethnicity,
    region,
    province,
    eventType,
    performanceType,
    instruments,
    yearRange,
    verificationStatus,
  ]);

  const handleSearch = useCallback(() => {
    const filters: SearchFilters = {
      query: query.trim() || undefined,
    };

    // Map performanceType label to RecordingType enum (labels aligned with UploadMusic)
    if (performanceType && !performanceType.startsWith('Tất cả')) {
      const perfMap: Record<string, RecordingType> = {
        'Chỉ nhạc cụ (Instrumental)': RecordingType.INSTRUMENTAL,
        'Chỉ giọng hát không đệm (Acappella)': RecordingType.VOCAL,
        'Giọng hát có nhạc đệm (Vocal with accompaniment)': RecordingType.VOCAL,
      };
      const mapped = perfMap[performanceType];
      if (mapped) filters.recordingTypes = [mapped];
    }

    // Use human-friendly selections (genres, instruments, eventType, province, ethnicity) as tags
    const tags: string[] = [];
    if (genres.length > 0) tags.push(...genres);
    if (instruments.length > 0) tags.push(...instruments);
    if (eventType && !eventType.startsWith('Tất cả')) tags.push(eventType);
    if (province && !province.startsWith('Tất cả')) tags.push(province);
    if (ethnicity && !ethnicity.startsWith('Tất cả')) tags.push(ethnicity);
    if (tags.length > 0) filters.tags = tags;

    // Map region label back to Region enum
    const regionMap: Record<string, Region> = {
      'Trung du và miền núi Bắc Bộ': Region.NORTHERN_MOUNTAINS,
      'Đồng bằng Bắc Bộ': Region.RED_RIVER_DELTA,
      'Bắc Trung Bộ': Region.NORTH_CENTRAL,
      'Nam Trung Bộ': Region.SOUTH_CENTRAL_COAST,
      'Cao nguyên Trung Bộ': Region.CENTRAL_HIGHLANDS,
      'Đông Nam Bộ': Region.SOUTHEAST,
      'Tây Nam Bộ': Region.MEKONG_DELTA,
    };
    if (region && !region.startsWith('Tất cả')) {
      const mapped = regionMap[region];
      if (mapped) filters.regions = [mapped];
    }

    // Map verification status label back to enum key
    if (verificationStatus && !verificationStatus.startsWith('Tất cả')) {
      const vs = VERIFICATION_STATUS.find((s) => s.label === verificationStatus);
      if (vs) filters.verificationStatus = [vs.key as VerificationStatus];
    }

    // Map year range label to dateFrom/dateTo
    if (yearRange && !yearRange.startsWith('Tất cả')) {
      const yr = YEAR_RANGES.find((y) => y.label === yearRange);
      if (yr) {
        switch (yr.key) {
          case 'before_1950':
            filters.dateTo = '1949-12-31';
            break;
          case '1950_1975':
            filters.dateFrom = '1950-01-01';
            filters.dateTo = '1975-12-31';
            break;
          case '1975_2000':
            filters.dateFrom = '1975-01-01';
            filters.dateTo = '2000-12-31';
            break;
          case '2000_2010':
            filters.dateFrom = '2000-01-01';
            filters.dateTo = '2010-12-31';
            break;
          case '2010_2020':
            filters.dateFrom = '2010-01-01';
            filters.dateTo = '2020-12-31';
            break;
          case 'after_2020':
            filters.dateFrom = '2021-01-01';
            break;
        }
      }
    }

    onSearch(filters);
  }, [
    query,
    performanceType,
    genres,
    instruments,
    eventType,
    province,
    ethnicity,
    region,
    verificationStatus,
    yearRange,
    onSearch,
  ]);

  const handleClearAll = useCallback(() => {
    setQuery('');
    setGenres([]);
    setEthnicity('');
    setRegion('');
    setProvince('');
    setEventType('');
    setPerformanceType('');
    setInstruments([]);
    setYearRange('');
    setVerificationStatus('');
    onSearch({});
  }, [onSearch]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch],
  );

  return (
    <div className="w-full space-y-6">
      {/* Main Search Input — same style as SemanticSearchPage main card */}
      <div
        className="border border-neutral-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
          <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
            <Search className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
          </div>
          Tìm kiếm bài hát
        </h2>
        <p className="text-neutral-600 font-medium leading-relaxed mb-4">
          Nhập từ khóa để tìm kiếm nhanh. Kết hợp bộ lọc bên dưới để thu hẹp kết quả.
        </p>

        <div
          className="relative w-full min-h-[48px] px-4 py-2.5 border border-neutral-400/80 rounded-xl focus-within:border-primary-500 focus-within:border-transparent transition-all duration-200 shadow-sm hover:shadow-md mb-4 bg-surface-panel"
        >
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500"
            strokeWidth={2}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tìm kiếm bài hát, nhạc cụ, nghệ nhân,..."
            className="w-full pl-12 pr-32 py-2 bg-transparent text-neutral-900 placeholder-neutral-500 focus:outline-none rounded-xl"
            aria-label="Từ khóa tìm kiếm"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-colors duration-200 flex items-center gap-2 cursor-pointer"
          >
            Tìm kiếm
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {activeFilterCount > 0 ? (
          <p className="text-sm text-neutral-500">{activeFilterCount} bộ lọc đang được áp dụng</p>
        ) : null}
      </div>

      {/* Basic Filters — same card style as SemanticSearchPage */}
      <div
        className="border border-neutral-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
          <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
            <Music className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
          </div>
          Bộ lọc cơ bản
        </h2>
        <p className="text-neutral-600 font-medium leading-relaxed mb-4">
          Lọc theo thể loại và nguồn gốc
        </p>

        {/* Genre-Ethnicity Warning */}
        {genreEthnicityWarning && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-yellow-50/90 border border-yellow-300/80 rounded-2xl shadow-sm backdrop-blur-sm">
            <AlertCircle
              className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5"
              strokeWidth={2.5}
            />
            <p className="text-yellow-700 font-medium text-sm leading-relaxed">
              {genreEthnicityWarning}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Thể loại/Loại hình">
            <MultiSelectTags
              values={genres}
              onChange={setGenres}
              options={GENRES}
              placeholder="Chọn thể loại..."
            />
          </FormField>

          <FormField label="Dân tộc">
            <SearchableDropdown
              value={ethnicity}
              onChange={setEthnicity}
              options={['Tất cả dân tộc', ...ETHNICITIES]}
              placeholder="Tất cả dân tộc"
            />
          </FormField>

          <FormField label="Khu vực">
            <SearchableDropdown
              value={region}
              onChange={setRegion}
              options={['Tất cả khu vực', ...REGIONS]}
              placeholder="Tất cả khu vực"
              searchable={false}
            />
          </FormField>

          <FormField label="Tỉnh/Thành phố">
            <SearchableDropdown
              value={province}
              onChange={setProvince}
              options={['Tất cả tỉnh thành', ...PROVINCES]}
              placeholder="Tất cả tỉnh thành"
            />
          </FormField>
        </div>
      </div>

      {/* Cultural Context Filters */}
      <CollapsibleSection
        icon={MapPin}
        title="Bộ lọc bối cảnh văn hóa"
        subtitle="Lọc theo sự kiện và hình thức biểu diễn"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Loại sự kiện">
            <SearchableDropdown
              value={eventType}
              onChange={setEventType}
              options={['Tất cả sự kiện', ...EVENT_TYPES]}
              placeholder="Tất cả sự kiện"
            />
          </FormField>

          <FormField label="Loại hình biểu diễn">
            <SearchableDropdown
              value={performanceType}
              onChange={setPerformanceType}
              options={['Tất cả loại hình', ...PERFORMANCE_TYPES.map((p) => p.label)]}
              placeholder="Tất cả loại hình"
              searchable={false}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Nhạc cụ" hint="Chọn một hoặc nhiều nhạc cụ">
              <MultiSelectTags
                values={instruments}
                onChange={setInstruments}
                options={INSTRUMENTS}
                placeholder="Tìm và chọn nhạc cụ..."
              />
            </FormField>
          </div>
        </div>
      </CollapsibleSection>

      {/* Time & Status Filters */}
      <CollapsibleSection
        icon={Filter}
        title="Bộ lọc thời gian và trạng thái"
        subtitle="Lọc theo năm ghi âm và trạng thái xác minh"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Năm ghi âm">
            <SearchableDropdown
              value={yearRange}
              onChange={setYearRange}
              options={['Tất cả thời gian', ...YEAR_RANGES.map((y) => y.label)]}
              placeholder="Tất cả thời gian"
              searchable={false}
            />
          </FormField>

          <FormField label="Trạng thái xác minh">
            <SearchableDropdown
              value={verificationStatus}
              onChange={setVerificationStatus}
              options={['Tất cả trạng thái', ...VERIFICATION_STATUS.map((s) => s.label)]}
              placeholder="Tất cả trạng thái"
              searchable={false}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6">
        <button
          type="button"
          onClick={handleClearAll}
          className="px-6 py-2.5 text-neutral-800 rounded-xl transition-colors shadow-sm hover:shadow-md border-2 border-primary-600 bg-surface-panel hover:bg-[#F5F0E8]"
        >
          Xóa bộ lọc
        </button>
        <button
          type="button"
          onClick={handleSearch}
          className="px-8 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
        >
          <Search className="h-4 w-4" strokeWidth={2.5} />
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}
