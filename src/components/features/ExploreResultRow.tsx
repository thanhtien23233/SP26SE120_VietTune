import { Check, FileText, Play } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/common/Button';
import { REGION_NAMES } from '@/config/constants';
import { type Recording, VerificationStatus } from '@/types';
import { cn } from '@/utils/helpers';

const MAX_ROW_METADATA = 5;

function asObject(input: unknown): Record<string, unknown> | null {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null;
}

function readExtraString(rec: Recording, keys: string[]): string {
  const row = asObject(rec);
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function getEthnicityLabel(rec: Recording): string {
  if (rec.ethnicity && typeof rec.ethnicity === 'object') {
    return (
      rec.ethnicity.nameVietnamese ||
      rec.ethnicity.name ||
      readExtraString(rec, ['ethnicityName', 'ethnicGroupName', 'ethnicName'])
    );
  }
  return readExtraString(rec, ['ethnicityName', 'ethnicGroupName', 'ethnicName']);
}

function getRegionLabel(rec: Recording): string {
  const named = readExtraString(rec, ['regionName', 'regionLabel']);
  if (named) return named;
  if (rec.region) return REGION_NAMES[rec.region as keyof typeof REGION_NAMES] || String(rec.region);
  return readExtraString(rec, ['region', 'provinceName', 'recordingLocation']);
}

function getInstrumentLabel(rec: Recording): string {
  const fromList = (rec.instruments ?? [])
    .map((i) => i.nameVietnamese || i.name || '')
    .filter(Boolean)
    .join(', ');
  if (fromList) return fromList;

  const row = asObject(rec);
  if (!row) return '';
  const names = row.instrumentNames;
  if (Array.isArray(names)) {
    const list = names.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
    if (list.length > 0) return list.join(', ');
  }
  return '';
}

function getCeremonyLabel(rec: Recording): string {
  const byMetadata = rec.metadata?.ritualContext ?? '';
  if (byMetadata) return byMetadata;
  const fromExtra = readExtraString(rec, ['ceremonyName', 'eventTypeName', 'ritualName']);
  if (fromExtra) return fromExtra;
  const fromTags = (rec.tags ?? []).find(
    (t) =>
      t.toLowerCase().includes('lễ') ||
      t.toLowerCase().includes('nghi') ||
      t.toLowerCase().includes('hội'),
  );
  return fromTags ?? '';
}

function getCommuneLabel(rec: Recording): string {
  const row = asObject(rec);
  const communeObject = asObject(row?.commune);
  const fromMeta = asObject(row?.metadata);
  const byName =
    readExtraString(rec, ['communeName', 'recordingLocation', 'provinceName']) ||
    (typeof communeObject?.name === 'string' ? communeObject.name : '') ||
    (typeof fromMeta?.communeName === 'string' ? fromMeta.communeName : '');
  if (byName.trim()) return byName.trim();

  const fromTags = (rec.tags ?? []).find(
    (t) =>
      t.toLowerCase().includes('phường') ||
      t.toLowerCase().includes('xã') ||
      t.toLowerCase().includes('huyện'),
  );
  return fromTags ?? '';
}

export const ExploreResultRow = memo(function ExploreResultRow({
  recording: r,
  returnTo,
  rowIndex,
}: {
  recording: Recording;
  returnTo: string;
  rowIndex: number;
}) {
  const navigate = useNavigate();
  const openDetail = () =>
    navigate(`/recordings/${r.id}`, { state: { from: returnTo, preloadedRecording: r } });

  const metadataPairs = [
    { label: 'Dân tộc', value: getEthnicityLabel(r) },
    { label: 'Vùng miền', value: getRegionLabel(r) },
    { label: 'Nhạc cụ', value: getInstrumentLabel(r) },
    { label: 'Nghi lễ', value: getCeremonyLabel(r) },
    { label: 'Xã/Phường', value: getCommuneLabel(r) },
  ].filter((x) => Boolean(x.value));
  const displayPairs =
    metadataPairs.length > 0
      ? metadataPairs
      : [
          { label: 'Dân tộc', value: 'Chưa cập nhật' },
          { label: 'Vùng miền', value: 'Chưa cập nhật' },
          { label: 'Nhạc cụ', value: 'Chưa cập nhật' },
          { label: 'Nghi lễ', value: 'Chưa cập nhật' },
          { label: 'Xã/Phường', value: 'Chưa cập nhật' },
        ];
  const missingMetadataCount = MAX_ROW_METADATA - metadataPairs.length;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-secondary-200/60 bg-white/70 p-5 shadow-sm transition-all duration-300 hover:border-secondary-300 hover:shadow-lg before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1.5 before:bg-gradient-to-b before:from-primary-400 before:to-secondary-500"
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
            <h3 className="text-xl font-bold leading-tight text-neutral-900 transition-colors group-hover:text-primary-700">
              {r.title}
            </h3>
            {r.verificationStatus === VerificationStatus.VERIFIED && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Đã xác minh
              </span>
            )}
            {missingMetadataCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                Thiếu metadata
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {displayPairs.map((item, itemIdx) => (
              <span
                key={`${r.id ?? rowIndex}-${item.label}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                  itemIdx >= 3 && 'max-sm:hidden',
                  item.value === 'Chưa cập nhật'
                    ? 'border-neutral-200/60 bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100'
                    : 'border-neutral-200/70 bg-neutral-50/80 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100/80',
                )}
                title={`${item.label}: ${item.value}`}
              >
                <span className="text-neutral-500">{item.label}:</span>
                <span className="max-w-[280px] truncate font-semibold text-neutral-800">
                  {item.value}
                </span>
              </span>
            ))}
            {displayPairs.length > 3 && (
              <span className="inline-flex items-center rounded-xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-1.5 text-xs font-medium text-neutral-600 sm:hidden">
                +{displayPairs.length - 3} thêm
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-row items-center gap-2.5 pt-2 sm:flex-shrink-0 sm:flex-col sm:items-stretch sm:pt-0">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openDetail}
            className="w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm sm:w-auto"
          >
            <Play className="h-4 w-4 fill-white" strokeWidth={2} />
            Phát
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openDetail}
            className="w-full items-center justify-center gap-2 rounded-xl border-neutral-200 bg-white px-5 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 sm:w-auto"
          >
            <FileText className="h-4 w-4" strokeWidth={2.5} />
            Chi tiết
          </Button>
        </div>
      </div>
    </div>
  );
});

export default ExploreResultRow;
