import * as XLSX from 'xlsx';

import { RECORDING_TYPE_NAMES, REGION_NAMES } from '@/config/constants';
import type { Recording } from '@/types';

export type ExportFormat = 'json' | 'csv' | 'xlsx';

export type ExportColumnKey =
  | 'id'
  | 'title'
  | 'titleVietnamese'
  | 'description'
  | 'ethnicity'
  | 'region'
  | 'recordingType'
  | 'instruments'
  | 'performers'
  | 'tags'
  | 'recordedDate'
  | 'uploadedDate'
  | 'verificationStatus'
  | 'tuningSystem'
  | 'modalStructure'
  | 'tempo'
  | 'ritualContext'
  | 'regionalVariation'
  | 'lyrics'
  | 'lyricsTranslation'
  | 'transcription'
  | 'culturalSignificance'
  | 'historicalContext'
  | 'recordingQuality'
  | 'originalSource'
  | 'gpsLatitude'
  | 'gpsLongitude';

export interface ExportColumn {
  key: ExportColumnKey;
  label: string;
}

export interface ExportMeta {
  dataset: string;
  version: string;
  license: string;
  exportedAt: string;
  exportedBy?: string;
  total: number;
  columns: ExportColumnKey[];
  filters?: string;
}

export type ExportRow = Record<string, string | number | boolean | null>;

type RecordingWithGps = Recording & {
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
};

export const ALL_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'titleVietnamese', label: 'Title (Vietnamese)' },
  { key: 'description', label: 'Description' },
  { key: 'ethnicity', label: 'Ethnicity' },
  { key: 'region', label: 'Region' },
  { key: 'recordingType', label: 'Recording Type' },
  { key: 'instruments', label: 'Instruments' },
  { key: 'performers', label: 'Performers' },
  { key: 'tags', label: 'Tags' },
  { key: 'recordedDate', label: 'Recorded Date' },
  { key: 'uploadedDate', label: 'Uploaded Date' },
  { key: 'verificationStatus', label: 'Verification Status' },
  { key: 'tuningSystem', label: 'Tuning System' },
  { key: 'modalStructure', label: 'Modal Structure' },
  { key: 'tempo', label: 'Tempo' },
  { key: 'ritualContext', label: 'Ritual Context' },
  { key: 'regionalVariation', label: 'Regional Variation' },
  { key: 'lyrics', label: 'Lyrics' },
  { key: 'lyricsTranslation', label: 'Lyrics Translation' },
  { key: 'transcription', label: 'Transcription' },
  { key: 'culturalSignificance', label: 'Cultural Significance' },
  { key: 'historicalContext', label: 'Historical Context' },
  { key: 'recordingQuality', label: 'Recording Quality' },
  { key: 'originalSource', label: 'Original Source' },
  { key: 'gpsLatitude', label: 'GPS Latitude' },
  { key: 'gpsLongitude', label: 'GPS Longitude' },
];

export const ACADEMIC_PRESET_KEYS: ExportColumnKey[] = [
  'id',
  'title',
  'titleVietnamese',
  'ethnicity',
  'region',
  'instruments',
  'performers',
  'recordedDate',
  'verificationStatus',
  'ritualContext',
  'culturalSignificance',
  'historicalContext',
  'tuningSystem',
  'transcription',
];

function valueForColumn(recording: Recording, key: ExportColumnKey): string | number | null {
  const recWithGps = recording as RecordingWithGps;
  switch (key) {
    case 'id':
      return recording.id ?? '';
    case 'title':
      return recording.title ?? '';
    case 'titleVietnamese':
      return recording.titleVietnamese ?? '';
    case 'description':
      return recording.description ?? '';
    case 'ethnicity':
      return recording.ethnicity?.nameVietnamese ?? recording.ethnicity?.name ?? '';
    case 'region': {
      const regionKey = String(recording.region ?? '');
      return REGION_NAMES[regionKey as keyof typeof REGION_NAMES] ?? regionKey;
    }
    case 'recordingType': {
      const typeKey = String(recording.recordingType ?? '');
      return RECORDING_TYPE_NAMES[typeKey as keyof typeof RECORDING_TYPE_NAMES] ?? typeKey;
    }
    case 'instruments':
      return (recording.instruments ?? [])
        .map((item) => item.nameVietnamese || item.name)
        .filter(Boolean)
        .join('; ');
    case 'performers':
      return (recording.performers ?? [])
        .map((item) => item.nameVietnamese || item.name)
        .filter(Boolean)
        .join('; ');
    case 'tags':
      return (recording.tags ?? []).join('; ');
    case 'recordedDate':
      return recording.recordedDate ?? '';
    case 'uploadedDate':
      return recording.uploadedDate ?? '';
    case 'verificationStatus':
      return String(recording.verificationStatus ?? '');
    case 'tuningSystem':
      return recording.metadata?.tuningSystem ?? '';
    case 'modalStructure':
      return recording.metadata?.modalStructure ?? '';
    case 'tempo':
      return recording.metadata?.tempo ?? '';
    case 'ritualContext':
      return recording.metadata?.ritualContext ?? '';
    case 'regionalVariation':
      return recording.metadata?.regionalVariation ?? '';
    case 'lyrics':
      return recording.metadata?.lyrics ?? '';
    case 'lyricsTranslation':
      return recording.metadata?.lyricsTranslation ?? '';
    case 'transcription':
      return recording.metadata?.transcription ?? '';
    case 'culturalSignificance':
      return recording.metadata?.culturalSignificance ?? '';
    case 'historicalContext':
      return recording.metadata?.historicalContext ?? '';
    case 'recordingQuality':
      return recording.metadata?.recordingQuality ?? '';
    case 'originalSource':
      return recording.metadata?.originalSource ?? '';
    case 'gpsLatitude':
      return recWithGps.gpsLatitude ?? '';
    case 'gpsLongitude':
      return recWithGps.gpsLongitude ?? '';
    default:
      return '';
  }
}

export function buildRows(recordings: Recording[], columns: ExportColumn[]): ExportRow[] {
  return recordings.map((recording) => {
    const row: ExportRow = {};
    for (const column of columns) {
      row[column.key] = valueForColumn(recording, column.key);
    }
    return row;
  });
}

function quoteCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function toJson(rows: ExportRow[], meta: ExportMeta): Blob {
  const payload = {
    dataset: meta.dataset,
    version: meta.version,
    license: meta.license,
    exportedAt: meta.exportedAt,
    exportedBy: meta.exportedBy ?? 'Researcher Portal',
    total: meta.total,
    columns: meta.columns,
    filters: meta.filters ?? '',
    records: rows,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export function toCsv(rows: ExportRow[], columns: ExportColumn[], meta?: ExportMeta): Blob {
  const lines: string[] = [];
  if (meta) {
    lines.push(
      quoteCsvCell(
        `${meta.dataset} | Version: ${meta.version} | License: ${meta.license} | Exported: ${meta.exportedAt}`,
      ),
    );
  }
  lines.push(columns.map((column) => quoteCsvCell(column.label)).join(','));
  for (const row of rows) {
    lines.push(columns.map((column) => quoteCsvCell(row[column.key])).join(','));
  }
  return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
}

export function toXlsx(rows: ExportRow[], columns: ExportColumn[], meta: ExportMeta): Blob {
  const workbook = XLSX.utils.book_new();

  const recordRows = rows.map((row) => {
    const flat: Record<string, string | number | boolean | null> = {};
    for (const column of columns) {
      flat[column.label] = row[column.key];
    }
    return flat;
  });
  const recordsSheet = XLSX.utils.json_to_sheet(recordRows);
  XLSX.utils.book_append_sheet(workbook, recordsSheet, 'Records');

  const metadataRows = [
    { Key: 'Dataset', Value: meta.dataset },
    { Key: 'Version', Value: meta.version },
    { Key: 'License', Value: meta.license },
    { Key: 'Exported At', Value: meta.exportedAt },
    { Key: 'Exported By', Value: meta.exportedBy ?? 'Researcher Portal' },
    { Key: 'Total Records', Value: meta.total },
    { Key: 'Columns', Value: meta.columns.join(', ') },
    { Key: 'Filters', Value: meta.filters ?? '' },
  ];
  const metadataSheet = XLSX.utils.json_to_sheet(metadataRows);
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildFilename(format: ExportFormat, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `viettune-academic-dataset-${stamp}.${format}`;
}
