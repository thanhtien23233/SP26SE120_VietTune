import { Download } from 'lucide-react';

import type { ResearcherCatalogSource } from '@/features/researcher/researcherPortalTypes';

export interface ResearcherExportPanelProps {
  searchLoading: boolean;
  approvedRecordingsCount: number;
  catalogSource: ResearcherCatalogSource;
  onOpenExport: () => void;
}

export default function ResearcherExportPanel({
  searchLoading,
  approvedRecordingsCount,
  catalogSource,
  onOpenExport,
}: ResearcherExportPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-neutral-600 font-medium">
        {searchLoading
          ? 'Đang tải...'
          : `Tìm thấy ${approvedRecordingsCount} bản ghi đã kiểm duyệt`}
      </span>
      {!searchLoading && (
        <span className="text-[11px] text-neutral-500">
          Nguồn: {catalogSource === 'api-filter' ? 'API filter' : 'Không có dữ liệu'}
        </span>
      )}
      <button
        type="button"
        onClick={onOpenExport}
        disabled={searchLoading || approvedRecordingsCount === 0}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-300/70 bg-gradient-to-br from-secondary-100 to-secondary-200/70 text-sm font-semibold text-primary-900 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
      >
        <Download className="h-4 w-4" strokeWidth={2.5} />
        Xuất dataset
      </button>
    </div>
  );
}
