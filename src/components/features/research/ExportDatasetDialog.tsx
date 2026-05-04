import { Download, FileSpreadsheet, FileText, FileType2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Recording } from '@/types';
import { notifyLine, uiToast } from '@/uiToast';
import {
  ACADEMIC_PRESET_KEYS,
  ALL_EXPORT_COLUMNS,
  buildFilename,
  buildRows,
  toCsv,
  toJson,
  toXlsx,
  triggerDownload,
  type ExportColumn,
  type ExportColumnKey,
  type ExportFormat,
  type ExportMeta,
} from '@/utils/datasetExport';

export interface ExportDatasetDialogProps {
  open: boolean;
  onClose: () => void;
  recordings: Recording[];
  filtersSummary?: string;
}

type ColumnGroup = {
  id: string;
  label: string;
  keys: ExportColumnKey[];
};

const COLUMN_GROUPS: ColumnGroup[] = [
  {
    id: 'core',
    label: 'Core',
    keys: ['id', 'title', 'titleVietnamese', 'description', 'recordingType'],
  },
  {
    id: 'metadata',
    label: 'Metadata',
    keys: [
      'ethnicity',
      'region',
      'instruments',
      'performers',
      'tags',
      'recordedDate',
      'uploadedDate',
      'verificationStatus',
    ],
  },
  {
    id: 'cultural',
    label: 'Cultural / Academic',
    keys: [
      'tuningSystem',
      'modalStructure',
      'tempo',
      'ritualContext',
      'regionalVariation',
      'culturalSignificance',
      'historicalContext',
      'recordingQuality',
      'originalSource',
    ],
  },
  {
    id: 'transcript',
    label: 'Transcript',
    keys: ['lyrics', 'lyricsTranslation', 'transcription'],
  },
  {
    id: 'geo',
    label: 'GPS',
    keys: ['gpsLatitude', 'gpsLongitude'],
  },
];

const FORMAT_OPTIONS: Array<{ id: ExportFormat; label: string; icon: typeof FileText }> = [
  { id: 'json', label: 'JSON', icon: FileText },
  { id: 'csv', label: 'CSV', icon: FileType2 },
  { id: 'xlsx', label: 'XLSX', icon: FileSpreadsheet },
];

export default function ExportDatasetDialog({
  open,
  onClose,
  recordings,
  filtersSummary,
}: ExportDatasetDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<ExportColumnKey>>(
    () => new Set(ACADEMIC_PRESET_KEYS),
  );

  useEffect(() => {
    if (!open) return;
    setFormat('xlsx');
    setIsExporting(false);
    setSelectedKeys(new Set(ACADEMIC_PRESET_KEYS));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const selectedColumns = useMemo<ExportColumn[]>(
    () => ALL_EXPORT_COLUMNS.filter((column) => selectedKeys.has(column.key)),
    [selectedKeys],
  );

  const totalColumns = ALL_EXPORT_COLUMNS.length;
  const allSelected = selectedKeys.size === totalColumns;
  const noneSelected = selectedKeys.size === 0;

  const toggleColumn = (key: ExportColumnKey) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelectedKeys(new Set(ALL_EXPORT_COLUMNS.map((column) => column.key)));
  const clearAll = () => setSelectedKeys(new Set<ExportColumnKey>());
  const applyAcademicPreset = () => setSelectedKeys(new Set(ACADEMIC_PRESET_KEYS));

  const handleExport = async () => {
    if (recordings.length === 0) {
      uiToast.warning(notifyLine('Không có dữ liệu', 'Danh sách hiện tại chưa có bản thu để xuất.'));
      return;
    }
    if (selectedColumns.length === 0) {
      uiToast.warning(notifyLine('Thiếu cột dữ liệu', 'Vui lòng chọn ít nhất 1 cột để xuất.'));
      return;
    }

    setIsExporting(true);
    try {
      const exportedAt = new Date().toISOString();
      const meta: ExportMeta = {
        dataset: 'VietTune Traditional Music Archive',
        version: '1.0',
        license: 'CC-BY-NC 4.0',
        exportedAt,
        exportedBy: 'Researcher Portal',
        total: recordings.length,
        columns: selectedColumns.map((column) => column.key),
        filters: filtersSummary,
      };

      const rows = buildRows(recordings, selectedColumns);
      const blob =
        format === 'json'
          ? toJson(rows, meta)
          : format === 'csv'
            ? toCsv(rows, selectedColumns, meta)
            : toXlsx(rows, selectedColumns, meta);

      triggerDownload(blob, buildFilename(format));
      uiToast.success(
        notifyLine(
          'Xuất dữ liệu thành công',
          `Đã xuất ${recordings.length} bản thu (${selectedColumns.length} cột) dạng ${format.toUpperCase()}.`,
        ),
      );
      onClose();
    } catch {
      uiToast.error(notifyLine('Lỗi', 'Không thể xuất dữ liệu. Vui lòng thử lại.'));
    } finally {
      setIsExporting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dataset-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-neutral-300/80 bg-surface-panel shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700 px-5 py-4">
          <div>
            <h2 id="export-dataset-title" className="text-lg font-bold text-white">
              Xuất bộ dữ liệu học thuật
            </h2>
            <p className="mt-1 text-xs text-primary-100">
              Chọn định dạng và trường dữ liệu để tải dataset.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white transition-colors hover:bg-primary-500/50"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5">
          <div className="rounded-xl border border-neutral-200 bg-surface-panel p-4">
            <p className="mb-2 text-sm font-semibold text-primary-800">Định dạng</p>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = format === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFormat(option.id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-secondary-300 bg-white text-primary-800 hover:bg-primary-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-neutral-200 bg-surface-panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-primary-800">Cột dữ liệu</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyAcademicPreset}
                  className="rounded-lg border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-primary-100"
                >
                  Academic preset
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allSelected}
                  className="rounded-lg border border-secondary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={noneSelected}
                  className="rounded-lg border border-secondary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {COLUMN_GROUPS.map((group) => (
                <div key={group.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-600">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.keys.map((key) => {
                      const column = ALL_EXPORT_COLUMNS.find((candidate) => candidate.key === key);
                      if (!column) return null;
                      const checked = selectedKeys.has(key);
                      return (
                        <label
                          key={key}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleColumn(key)}
                            className="h-4 w-4 accent-primary-600"
                          />
                          <span>{column.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-secondary-200 bg-secondary-50/50 p-4 text-sm text-neutral-700">
            <p>
              Sẽ xuất: <span className="font-semibold text-primary-800">{recordings.length}</span> bản
              thu · <span className="font-semibold text-primary-800">{selectedColumns.length}</span> cột
              · <span className="font-semibold text-primary-800">{format.toUpperCase()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200/80 bg-neutral-50/70 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="rounded-xl border border-secondary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              void handleExport();
            }}
            disabled={isExporting || recordings.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Đang xuất...' : `Xuất ngay (${format.toUpperCase()})`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
