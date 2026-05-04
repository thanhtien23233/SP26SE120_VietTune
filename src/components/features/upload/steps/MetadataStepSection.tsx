import { AlertCircle, Check, MapPin, Music, Navigation, Sparkles } from 'lucide-react';

import type {
  CommuneItem,
  DistrictItem,
  MusicalScaleItem,
  ProvinceItem,
  VocalStyleItem,
} from '@/services/referenceDataService';

type SectionHeaderProps = {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  optional?: boolean;
  required?: boolean;
};

type FormFieldProps = {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  id?: string;
};

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
};

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

type SearchableDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
};

type MultiSelectTagsProps = {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
};

type CollapsibleSectionProps = {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  optional?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

type PerformanceTypeOption = {
  key: string;
  label: string;
};

type MetadataStepSectionProps = {
  show: boolean;
  isFormDisabled: boolean;
  errors: Record<string, string>;
  title: string;
  setTitle: (value: string) => void;
  artist: string;
  setArtist: (value: string) => void;
  artistUnknown: boolean;
  setArtistUnknown: (value: boolean) => void;
  composer: string;
  setComposer: (value: string) => void;
  composerUnknown: boolean;
  setComposerUnknown: (value: boolean) => void;
  language: string;
  setLanguage: (value: string) => void;
  customLanguage: string;
  setCustomLanguage: (value: string) => void;
  noLanguage: boolean;
  setNoLanguage: (value: boolean) => void;
  recordingDate: string;
  setRecordingDate: (value: string) => void;
  dateEstimated: boolean;
  setDateEstimated: (value: boolean) => void;
  dateNote: string;
  setDateNote: (value: string) => void;
  recordingLocation: string;
  setRecordingLocation: (value: string) => void;
  performanceType: string;
  setPerformanceType: (value: string) => void;
  instruments: string[];
  setInstruments: (value: string[]) => void;
  vocalStyle: string;
  setVocalStyle: (value: string) => void;
  requiresInstruments: boolean;
  allowsLyrics: boolean;
  instrumentImage: File | null;
  instrumentImagePreview: string;
  setInstrumentImage: (value: File | null) => void;
  setInstrumentImagePreview: (value: string) => void;
  handleInstrumentImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  lyricsFile: File | null;
  setLyricsFile: (value: File | null) => void;
  handleLyricsFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  genreEthnicityWarning: string | null;
  ethnicity: string;
  setEthnicity: (value: string) => void;
  customEthnicity: string;
  setCustomEthnicity: (value: string) => void;
  ETHNICITIES: string[];
  region: string;
  setRegion: (value: string) => void;
  REGIONS: string[];
  province: string;
  setProvince: (value: string) => void;
  district: string;
  setDistrict: (value: string) => void;
  commune: string;
  setCommune: (value: string) => void;
  eventType: string;
  setEventType: (value: string) => void;
  customEventType: string;
  setCustomEventType: (value: string) => void;
  EVENT_TYPES: string[];
  musicalScale: string;
  setMusicalScale: (value: string) => void;
  provincesData: ProvinceItem[];
  districtsData: DistrictItem[];
  communesData: CommuneItem[];
  vocalStylesData: VocalStyleItem[];
  musicalScalesData: MusicalScaleItem[];
  INSTRUMENTS: string[];
  LANGUAGES: string[];
  PERFORMANCE_TYPES: PerformanceTypeOption[];
  getRegionName: (regionCode: string) => string;
  gpsLoading: boolean;
  gpsError: string | null;
  capturedGpsLat: number | null;
  capturedGpsLon: number | null;
  capturedGpsAccuracy: number | null;
  handleGetGpsLocation: () => void;
  aiSuggestLoading: boolean;
  aiSuggestError: string | null;
  aiSuggestSuccess: string | null;
  handleAiSuggestMetadata: () => void;
  SectionHeaderComponent: React.ComponentType<SectionHeaderProps>;
  FormFieldComponent: React.ComponentType<FormFieldProps>;
  TextInputComponent: React.ComponentType<TextInputProps>;
  DatePickerComponent: React.ComponentType<DatePickerProps>;
  SearchableDropdownComponent: React.ComponentType<SearchableDropdownProps>;
  MultiSelectTagsComponent: React.ComponentType<MultiSelectTagsProps>;
  CollapsibleSectionComponent: React.ComponentType<CollapsibleSectionProps>;
};

export default function MetadataStepSection({
  show,
  isFormDisabled,
  errors,
  title,
  setTitle,
  artist,
  setArtist,
  artistUnknown,
  setArtistUnknown,
  composer,
  setComposer,
  composerUnknown,
  setComposerUnknown,
  language,
  setLanguage,
  customLanguage,
  setCustomLanguage,
  noLanguage,
  setNoLanguage,
  recordingDate,
  setRecordingDate,
  dateEstimated,
  setDateEstimated,
  dateNote,
  setDateNote,
  recordingLocation,
  setRecordingLocation,
  performanceType,
  setPerformanceType,
  instruments,
  setInstruments,
  vocalStyle,
  setVocalStyle,
  requiresInstruments,
  allowsLyrics,
  instrumentImage,
  instrumentImagePreview,
  setInstrumentImage,
  setInstrumentImagePreview,
  handleInstrumentImageChange,
  lyricsFile,
  setLyricsFile,
  handleLyricsFileChange,
  genreEthnicityWarning,
  ethnicity,
  setEthnicity,
  customEthnicity,
  setCustomEthnicity,
  ETHNICITIES,
  region,
  setRegion,
  REGIONS,
  province,
  setProvince,
  district,
  setDistrict,
  commune,
  setCommune,
  eventType,
  setEventType,
  customEventType,
  setCustomEventType,
  EVENT_TYPES,
  musicalScale,
  setMusicalScale,
  provincesData,
  districtsData,
  communesData,
  vocalStylesData,
  musicalScalesData,
  INSTRUMENTS,
  LANGUAGES,
  PERFORMANCE_TYPES,
  getRegionName,
  gpsLoading,
  gpsError,
  capturedGpsLat,
  capturedGpsLon,
  capturedGpsAccuracy,
  handleGetGpsLocation,
  aiSuggestLoading,
  aiSuggestError,
  aiSuggestSuccess,
  handleAiSuggestMetadata,
  SectionHeaderComponent,
  FormFieldComponent,
  TextInputComponent,
  DatePickerComponent,
  SearchableDropdownComponent,
  MultiSelectTagsComponent,
  CollapsibleSectionComponent,
}: MetadataStepSectionProps) {
  if (!show) return null;
  const hasGps = capturedGpsLat != null && capturedGpsLon != null;
  const gpsAccuracyLabel =
    capturedGpsAccuracy == null
      ? null
      : capturedGpsAccuracy < 50
        ? 'Chinh xac cao'
        : capturedGpsAccuracy <= 200
          ? 'Trung binh'
          : 'Thap - nen kiem tra lai';
  const mapEmbedUrl = hasGps
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${capturedGpsLon - 0.01},${
        capturedGpsLat - 0.01
      },${capturedGpsLon + 0.01},${capturedGpsLat + 0.01}&marker=${capturedGpsLat},${capturedGpsLon}`
    : null;

  return (
    <>
      <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/45 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl">
        <SectionHeaderComponent
          icon={Music}
          title="Thông tin mô tả cơ bản"
          subtitle="Thông tin chính về bản nhạc"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormFieldComponent label="Tiêu đề/Tên bản nhạc" required id="field-title">
            <TextInputComponent
              value={title}
              onChange={setTitle}
              placeholder="Nhập tên bản nhạc"
              required
            />
            {errors.title && <p className="text-sm text-red-400">{errors.title}</p>}
          </FormFieldComponent>

          <div className="space-y-2">
            <FormFieldComponent
              label="Nghệ sĩ/Người biểu diễn"
              required={!artistUnknown}
              id="field-artist"
            >
              <TextInputComponent
                value={artist}
                onChange={setArtist}
                placeholder="Tên người hát hoặc chơi nhạc cụ"
                required={!artistUnknown}
                disabled={isFormDisabled || artistUnknown}
              />
            </FormFieldComponent>
            <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={artistUnknown}
                onChange={(e) => {
                  setArtistUnknown(e.target.checked);
                  if (e.target.checked) setArtist('');
                }}
                className="w-4 h-4 rounded border-neutral-400 text-primary-600 focus:outline-none bg-surface-panel"
                disabled={isFormDisabled}
              />
              Không rõ
            </label>
            {errors.artist && <p className="text-sm text-red-400">{errors.artist}</p>}
          </div>

          <div className="space-y-2">
            <FormFieldComponent
              label="Nhạc sĩ/Tác giả"
              required={!composerUnknown}
              id="field-composer"
            >
              <TextInputComponent
                value={composer}
                onChange={setComposer}
                placeholder="Tên người sáng tác"
                disabled={isFormDisabled || composerUnknown}
              />
            </FormFieldComponent>
            <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={composerUnknown}
                onChange={(e) => {
                  setComposerUnknown(e.target.checked);
                  if (e.target.checked) setComposer('');
                }}
                className="w-4 h-4 rounded border-neutral-400 text-primary-600 focus:outline-none bg-surface-panel"
                disabled={isFormDisabled}
              />
              Dân gian/Không rõ tác giả
            </label>
            {errors.composer && <p className="text-sm text-red-400">{errors.composer}</p>}
          </div>

          <div className="space-y-2">
            <FormFieldComponent label="Ngôn ngữ">
              <SearchableDropdownComponent
                value={language}
                onChange={(val) => {
                  setLanguage(val);
                  if (val !== 'Khác') setCustomLanguage('');
                }}
                options={LANGUAGES}
                placeholder="Chọn ngôn ngữ"
                disabled={isFormDisabled || noLanguage}
              />
            </FormFieldComponent>
            {language === 'Khác' && !noLanguage && (
              <TextInputComponent
                value={customLanguage}
                onChange={setCustomLanguage}
                placeholder="Nhập tên ngôn ngữ khác..."
                disabled={isFormDisabled || noLanguage}
              />
            )}
            <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={noLanguage}
                onChange={(e) => {
                  setNoLanguage(e.target.checked);
                  if (e.target.checked) {
                    setLanguage('');
                    setCustomLanguage('');
                  }
                }}
                className="w-4 h-4 rounded border-neutral-400 text-primary-600 focus:outline-none bg-surface-panel"
                disabled={isFormDisabled}
              />
              Không có ngôn ngữ
            </label>
          </div>

          <div className="space-y-2">
            <FormFieldComponent label="Ngày ghi âm">
              <DatePickerComponent
                value={recordingDate}
                onChange={setRecordingDate}
                placeholder="Chọn ngày/tháng/năm"
                disabled={isFormDisabled || dateEstimated}
              />
            </FormFieldComponent>
            <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={dateEstimated}
                onChange={(e) => {
                  setDateEstimated(e.target.checked);
                  if (e.target.checked) setRecordingDate('');
                }}
                className="w-4 h-4 rounded border-neutral-400 text-primary-600 focus:outline-none bg-surface-panel"
                disabled={isFormDisabled}
              />
              Ngày ước tính/không chính xác
            </label>
            {dateEstimated && (
              <TextInputComponent
                value={dateNote}
                onChange={setDateNote}
                placeholder="Ghi chú về ngày tháng (Ví dụ: khoảng năm 1990)"
                disabled={isFormDisabled || dateEstimated}
              />
            )}
          </div>

          <FormFieldComponent label="Địa điểm ghi âm" hint="Ví dụ: Đình làng X, Nhà văn hóa Y">
            <TextInputComponent
              value={recordingLocation}
              onChange={setRecordingLocation}
              placeholder="Nhập địa điểm cụ thể"
              disabled={isFormDisabled}
            />
          </FormFieldComponent>

          <div className="md:col-span-2">
            <FormFieldComponent label="Loại hình biểu diễn" required id="field-performanceType">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PERFORMANCE_TYPES.map((pt) => (
                  <button
                    key={pt.key}
                    type="button"
                    onClick={() => {
                      if (performanceType === pt.key) {
                        setPerformanceType('');
                      } else {
                        setPerformanceType(pt.key);
                        if (pt.key === 'acappella') {
                          setInstruments([]);
                        }
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all border border-neutral-200 ${
                      performanceType === pt.key
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'text-neutral-700 hover:border-primary-400 bg-surface-panel hover:bg-[#F5F0E8]'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
              {errors.performanceType && (
                <p className="text-sm text-red-400">{errors.performanceType}</p>
              )}
            </FormFieldComponent>
          </div>

          {(performanceType === 'vocal_accompaniment' || performanceType === 'acappella') && (
            <div
              className={
                performanceType === 'vocal_accompaniment' ? 'md:col-span-1' : 'md:col-span-2'
              }
            >
              <FormFieldComponent
                label="Lối hát / Thể loại (Vocal Style)"
                required
                id="field-vocalStyle"
              >
                <SearchableDropdownComponent
                  value={vocalStyle}
                  onChange={setVocalStyle}
                  options={vocalStylesData.map((v) => v.name)}
                  placeholder="Chọn lối hát / thể loại"
                />
                {errors.vocalStyle && <p className="text-sm text-red-400">{errors.vocalStyle}</p>}
              </FormFieldComponent>
            </div>
          )}

          {requiresInstruments && (
            <div
              className={
                performanceType === 'vocal_accompaniment' ? 'md:col-span-1' : 'md:col-span-2'
              }
            >
              <FormFieldComponent
                label="Nhạc cụ sử dụng"
                required={requiresInstruments}
                hint="Chọn một hoặc nhiều nhạc cụ"
                id="field-instruments"
              >
                <MultiSelectTagsComponent
                  values={instruments}
                  onChange={setInstruments}
                  options={INSTRUMENTS}
                  placeholder="Tìm và chọn nhạc cụ..."
                  disabled={isFormDisabled}
                />
                {errors.instruments && <p className="text-sm text-red-400">{errors.instruments}</p>}
              </FormFieldComponent>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
            {(performanceType === 'instrumental' || performanceType === 'vocal_accompaniment') && (
              <div
                className={
                  performanceType === 'vocal_accompaniment'
                    ? 'col-span-1'
                    : 'col-span-1 md:col-span-2'
                }
              >
                <FormFieldComponent
                  label="Tải lên hình ảnh nhạc cụ (nếu có)"
                  hint="Ảnh minh họa cho các nhạc cụ sử dụng"
                >
                  <div className="flex items-center gap-3">
                    <label
                      className={`px-4 py-2 rounded-xl text-sm text-neutral-800 border border-neutral-300 transition-colors shadow-sm inline-block ${
                        isFormDisabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:shadow-md cursor-pointer hover:bg-[#F5F0E8]'
                      } bg-surface-panel`}
                    >
                      Chọn ảnh
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleInstrumentImageChange}
                        className="sr-only"
                        disabled={isFormDisabled}
                      />
                    </label>
                    {instrumentImage && (
                      <span className="text-neutral-800/60 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                        {instrumentImage.name}
                      </span>
                    )}
                    {instrumentImagePreview && (
                      <img
                        src={instrumentImagePreview}
                        alt="Xem trước ảnh nhạc cụ"
                        className="h-10 rounded-lg border border-neutral-300"
                      />
                    )}
                    {instrumentImage && (
                      <button
                        type="button"
                        className="ml-2 text-xs text-red-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => {
                          if (isFormDisabled) return;
                          setInstrumentImage(null);
                          setInstrumentImagePreview('');
                        }}
                        disabled={isFormDisabled}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </FormFieldComponent>
              </div>
            )}

            {allowsLyrics && (
              <div
                className={
                  performanceType === 'vocal_accompaniment'
                    ? 'col-span-1'
                    : 'col-span-1 md:col-span-2'
                }
              >
                <FormFieldComponent
                  label="Tải lên lời bài hát (nếu có)"
                  hint="File .txt hoặc .docx"
                >
                  <div className="flex items-center gap-3">
                    <label
                      className={`px-4 py-2 rounded-xl text-sm text-neutral-800 border border-neutral-300 transition-colors shadow-sm inline-block ${
                        isFormDisabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:shadow-md cursor-pointer hover:bg-[#F5F0E8]'
                      } bg-surface-panel`}
                    >
                      Chọn file
                      <input
                        type="file"
                        accept=".txt,.doc,.docx"
                        onChange={handleLyricsFileChange}
                        className="sr-only"
                        disabled={isFormDisabled}
                      />
                    </label>
                    <span className="text-neutral-800/60 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                      {lyricsFile ? lyricsFile.name : 'Chưa chọn file'}
                    </span>
                    {lyricsFile && (
                      <button
                        type="button"
                        className="ml-2 text-xs text-red-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => {
                          if (isFormDisabled) return;
                          setLyricsFile(null);
                        }}
                        disabled={isFormDisabled}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </FormFieldComponent>
              </div>
            )}
          </div>
        </div>
      </div>

      <CollapsibleSectionComponent
        icon={MapPin}
        title="Thông tin bối cảnh văn hóa"
        subtitle="Thông tin về nguồn gốc và bối cảnh biểu diễn"
      >
        {genreEthnicityWarning && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-yellow-500/20 border border-yellow-500/40 rounded-2xl">
            <AlertCircle className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
            <p className="text-black text-sm leading-relaxed">{genreEthnicityWarning}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <FormFieldComponent label="Dân tộc">
              <SearchableDropdownComponent
                value={ethnicity}
                onChange={(val) => {
                  setEthnicity(val);
                  if (val !== 'Khác') setCustomEthnicity('');
                }}
                options={ETHNICITIES}
                placeholder="Chọn dân tộc"
              />
            </FormFieldComponent>
            {ethnicity === 'Khác' && (
              <TextInputComponent
                value={customEthnicity}
                onChange={setCustomEthnicity}
                placeholder="Nhập tên dân tộc khác..."
              />
            )}
          </div>

          <FormFieldComponent label="Khu vực">
            <SearchableDropdownComponent
              value={region}
              onChange={(r) => {
                setRegion(r);
                setProvince('');
                setDistrict('');
                setCommune('');
              }}
              options={REGIONS}
              placeholder="Chọn khu vực"
              searchable={false}
            />
          </FormFieldComponent>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormFieldComponent label="Tỉnh/Thành phố">
              <SearchableDropdownComponent
                value={province}
                onChange={(p) => {
                  setProvince(p);
                  setDistrict('');
                  setCommune('');
                  const selectedProv = provincesData.find((prov) => prov.name === p);
                  if (selectedProv?.regionCode) {
                    setRegion(getRegionName(selectedProv.regionCode));
                  }
                }}
                options={provincesData
                  .filter((p) => !region || getRegionName(p.regionCode) === region)
                  .map((p) => p.name)}
                placeholder="Chọn tỉnh thành"
              />
            </FormFieldComponent>

            <FormFieldComponent label="Quận/Huyện">
              <SearchableDropdownComponent
                value={district}
                onChange={(d) => {
                  setDistrict(d);
                  setCommune('');
                }}
                options={districtsData.map((d) => d.name)}
                placeholder="Chọn quận huyện"
                disabled={!province}
              />
            </FormFieldComponent>

            <FormFieldComponent label="Phường/Xã">
              <SearchableDropdownComponent
                value={commune}
                onChange={setCommune}
                options={communesData.map((c) => c.name)}
                placeholder="Chọn phường xã"
                disabled={!district}
              />
            </FormFieldComponent>
          </div>

          <div className="space-y-2">
            <FormFieldComponent label="Loại sự kiện">
              <SearchableDropdownComponent
                value={eventType}
                onChange={(val) => {
                  setEventType(val);
                  if (val !== 'Khác') setCustomEventType('');
                }}
                options={EVENT_TYPES}
                placeholder="Chọn loại sự kiện"
              />
            </FormFieldComponent>
            {eventType === 'Khác' && (
              <TextInputComponent
                value={customEventType}
                onChange={setCustomEventType}
                placeholder="Nhập loại sự kiện khác..."
              />
            )}
          </div>

          <FormFieldComponent label="Âm giai (Musical Scale)">
            <SearchableDropdownComponent
              value={musicalScale}
              onChange={setMusicalScale}
              options={musicalScalesData.map((m) => m.name)}
              placeholder="Chọn âm giai"
            />
          </FormFieldComponent>
        </div>
      </CollapsibleSectionComponent>

      <div className="mt-6 mb-2 rounded-2xl border border-dashed border-secondary-200/60 bg-gradient-to-br from-secondary-50/70 via-primary-50/25 to-cream-50/60 p-6 shadow-sm sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <SectionHeaderComponent
              icon={Navigation}
              title="Gắn vị trí GPS"
              subtitle="Lấy địa chỉ hiện tại để điền vào 'Địa điểm ghi âm' phía trên"
              optional
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleGetGpsLocation}
                  disabled={isFormDisabled || gpsLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium transition-colors cursor-pointer text-sm"
                >
                  <Navigation className="w-4 h-4" strokeWidth={2.5} />
                  {gpsLoading ? 'Đang lấy vị trí...' : 'Lấy vị trí hiện tại'}
                </button>
              </div>
              {gpsError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {gpsError}
                </p>
              )}
              {capturedGpsLat != null && capturedGpsLon != null && (
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {`Da gan GPS: ${capturedGpsLat.toFixed(6)}, ${capturedGpsLon.toFixed(6)}`}
                </p>
              )}
              {capturedGpsAccuracy != null && (
                <p className="text-xs text-neutral-700">
                  {`Do chinh xac: ~${Math.round(capturedGpsAccuracy)}m${
                    gpsAccuracyLabel ? ` (${gpsAccuracyLabel})` : ''
                  }`}
                </p>
              )}
              {mapEmbedUrl && (
                <div className="pt-2">
                  <iframe
                    title="GPS map preview"
                    src={mapEmbedUrl}
                    className="h-44 w-full rounded-xl border border-secondary-200/70"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeaderComponent
              icon={Sparkles}
              title="Hỗ trợ điền bằng AI"
              subtitle="Dựa trên 'Lối hát' để gợi ý Dân tộc & Nhạc cụ phù hợp"
              optional
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAiSuggestMetadata}
                  disabled={isFormDisabled || aiSuggestLoading || !vocalStyle}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-medium transition-colors cursor-pointer text-sm"
                >
                  <Sparkles className="w-4 h-4" strokeWidth={2.5} />
                  {aiSuggestLoading ? 'Đang xử lý...' : 'Lấy gợi ý AI'}
                </button>
                {!vocalStyle && (
                  <span className="text-xs text-neutral-500 italic">
                    Chọn lối hát/thể loại trước khi dùng
                  </span>
                )}
              </div>
              {aiSuggestError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {aiSuggestError}
                </p>
              )}
              {aiSuggestSuccess && (
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {aiSuggestSuccess}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
