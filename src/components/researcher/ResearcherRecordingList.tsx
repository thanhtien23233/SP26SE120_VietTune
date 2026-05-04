import { Check, FileText, Play } from 'lucide-react';

import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  getCeremonyLabel,
  getCommuneName,
  getEthnicityLabel,
  getInstrumentLabel,
  getRegionLabel,
} from '@/features/researcher/researcherRecordingUtils';
import { Recording, VerificationStatus } from '@/types';

export interface ResearcherRecordingListProps {
  searchLoading: boolean;
  approvedRecordings: Recording[];
  eventTypes: string[];
  onPlay: (recording: Recording) => void;
  onDetail: (recording: Recording) => void;
}

export default function ResearcherRecordingList({
  searchLoading,
  approvedRecordings,
  eventTypes,
  onPlay,
  onDetail,
}: ResearcherRecordingListProps) {
  if (searchLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (approvedRecordings.length === 0) {
    return (
      <p className="text-neutral-600 py-8 text-center">
        Không có bản thu nào khớp với bộ lọc hoặc từ khóa. Chỉ hiển thị bản thu đã được chuyên gia
        kiểm duyệt.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {approvedRecordings.map((result, resultIdx) => {
        const ethnicValue = getEthnicityLabel(result);
        const regionValue = getRegionLabel(result);
        const instrumentValue = getInstrumentLabel(result);
        const ceremonyValue = getCeremonyLabel(result, eventTypes);
        const communeValue = getCommuneName(result);

        const metadataPairs = [
          { label: 'Dân tộc', value: ethnicValue },
          { label: 'Vùng miền', value: regionValue },
          { label: 'Nhạc cụ', value: instrumentValue },
          { label: 'Nghi lễ', value: ceremonyValue },
          { label: 'Xã/Phường', value: communeValue },
        ].filter((x) => Boolean(x.value));

        const missingMetadataCount = 5 - metadataPairs.length;

        return (
          <div
            key={result.id ?? `${result.title ?? 'recording'}-${resultIdx}`}
            className="group relative overflow-hidden rounded-2xl border border-secondary-200/60 bg-white/70 backdrop-blur-md p-5 sm:p-6 shadow-sm hover:shadow-lg hover:border-secondary-300 transition-all duration-300 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-gradient-to-b before:from-primary-400 before:to-secondary-500"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 sm:gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
                  <h3 className="text-xl font-bold text-neutral-900 group-hover:text-primary-700 transition-colors leading-tight">
                    {result.title}
                  </h3>
                  {result.verificationStatus === VerificationStatus.VERIFIED && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Đã xác minh
                    </span>
                  )}
                  {missingMetadataCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                      Thiếu metadata
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {(metadataPairs.length > 0
                    ? metadataPairs
                    : [
                        { label: 'Dân tộc', value: 'Chưa cập nhật' },
                        { label: 'Vùng miền', value: 'Chưa cập nhật' },
                        { label: 'Nhạc cụ', value: 'Chưa cập nhật' },
                        { label: 'Nghi lễ', value: 'Chưa cập nhật' },
                        { label: 'Xã/Phường', value: 'Chưa cập nhật' },
                      ]
                  ).map((item) => (
                    <span
                      key={`${result.id}-${item.label}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                        item.value === 'Chưa cập nhật'
                          ? 'border-neutral-200/60 bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100'
                          : 'border-neutral-200/70 bg-neutral-50/80 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100/80'
                      }`}
                      title={`${item.label}: ${item.value}`}
                    >
                      <span className="text-neutral-500">{item.label}:</span>
                      <span className="max-w-[280px] truncate font-semibold text-neutral-800">
                        {item.value}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-stretch gap-2.5 sm:flex-shrink-0 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={() => onPlay(result)}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/20 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" strokeWidth={2} />
                  Phát
                </button>
                <button
                  type="button"
                  onClick={() => onDetail(result)}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold text-sm shadow-sm transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" strokeWidth={2.5} />
                  Chi tiết
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
