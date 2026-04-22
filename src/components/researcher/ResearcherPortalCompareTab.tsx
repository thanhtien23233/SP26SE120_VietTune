import React, { useMemo } from 'react';

import SearchableDropdown from '@/components/common/SearchableDropdown';
import DualAudioComparePlayer from '@/components/researcher/DualAudioComparePlayer';
import { REGION_NAMES } from '@/config/constants';
import {
  buildExpertComparativeNotes,
  getTranscriptText,
  highlightTranscriptDiff,
} from '@/features/researcher/researcherRecordingUtils';
import { Recording } from '@/types';
import { isYouTubeUrl } from '@/utils/youtube';

export interface ResearcherPortalCompareTabProps {
  approvedRecordings: Recording[];
  compareLeftId: string;
  compareRightId: string;
  setCompareLeftId: React.Dispatch<React.SetStateAction<string>>;
  setCompareRightId: React.Dispatch<React.SetStateAction<string>>;
}

function isLikelyVideoSource(src: string): boolean {
  return (
    src.length > 0 &&
    (isYouTubeUrl(src) ||
      Boolean(src.match(/\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)$/i)) ||
      src.startsWith('data:video/'))
  );
}

function asObject(input: unknown): Record<string, unknown> | null {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null;
}

function readExtraString(rec: Recording | undefined, keys: string[]): string {
  const row = asObject(rec);
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readObjectString(obj: Record<string, unknown> | null, keys: string[]): string {
  if (!obj) return '';
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function resolvePlayableSource(rec: Recording | undefined): string {
  if (!rec) return '';
  const metadata = asObject(rec.metadata);
  const candidates = [
    rec.audioUrl,
    readExtraString(rec, ['audioFileUrl', 'audioData', 'mediaUrl', 'url']),
    readObjectString(metadata, ['audioUrl', 'audioFileUrl', 'sourceUrl']),
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

export default function ResearcherPortalCompareTab({
  approvedRecordings,
  compareLeftId,
  compareRightId,
  setCompareLeftId,
  setCompareRightId,
}: ResearcherPortalCompareTabProps) {
  const compareOptions = useMemo(
    () => approvedRecordings.map((r) => r.title ?? ''),
    [approvedRecordings],
  );
  const leftRecording = approvedRecordings.find((r) => r.id === compareLeftId);
  const rightRecording = approvedRecordings.find((r) => r.id === compareRightId);
  const leftTranscript = getTranscriptText(leftRecording);
  const rightTranscript = getTranscriptText(rightRecording);
  const transcriptDiff = highlightTranscriptDiff(leftTranscript, rightTranscript);
  const expertNotes = buildExpertComparativeNotes(leftRecording, rightRecording);
  const leftMediaSrc = resolvePlayableSource(leftRecording);
  const rightMediaSrc = resolvePlayableSource(rightRecording);
  const compareHasVideoMedia =
    isLikelyVideoSource(leftMediaSrc) || isLikelyVideoSource(rightMediaSrc);

  const renderCompareCard = (rec: Recording | undefined, side: 'left' | 'right') => (
    <div className="rounded-xl border-2 border-secondary-200/80 bg-gradient-to-br from-surface-panel to-[#FFF1F3] p-4">
      <SearchableDropdown
        value={rec?.title ?? ''}
        onChange={(title) => {
          const r = approvedRecordings.find((x) => x.title === title);
          if (side === 'left') setCompareLeftId(r?.id ?? '');
          else setCompareRightId(r?.id ?? '');
        }}
        options={compareOptions}
        placeholder="Chọn bản ghi âm..."
        searchable
      />
      <div className="mt-4 rounded-lg bg-white border border-primary-200/80 p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-neutral-700">Bản ghi âm</span>
        </div>
        {!rec ? (
          <p className="text-neutral-500 text-sm py-4 text-center">
            Chọn bản thu để xem metadata và so sánh đồng bộ
          </p>
        ) : (
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">Dân tộc:</span>
              <span className="font-semibold text-primary-800">
                {rec.ethnicity?.nameVietnamese ?? rec.ethnicity?.name ?? '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Nhạc cụ:</span>
              <span className="font-semibold text-primary-800">
                {rec.instruments?.map((i) => i.nameVietnamese ?? i.name).join(', ') || '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Vùng miền:</span>
              <span className="font-semibold text-primary-800">
                {rec.region ? REGION_NAMES[rec.region as keyof typeof REGION_NAMES] : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Thể loại / Tags:</span>
              <span className="font-semibold text-primary-800">
                {(rec.tags ?? []).slice(0, 3).join(', ') || '—'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-primary-800 mb-2">So sánh phân tích</h2>
        <p className="text-sm text-neutral-600 mb-6">
          Chọn hai bản thu để xem metadata và nghe đồng bộ bằng dual audio player.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-primary-800 mb-3">Lựa chọn #1</h3>
            {renderCompareCard(leftRecording, 'left')}
          </div>
          <div>
            <h3 className="font-semibold text-primary-800 mb-3">Lựa chọn #2</h3>
            {renderCompareCard(rightRecording, 'right')}
          </div>
        </div>

        <div className="mt-6">
          {leftRecording && rightRecording ? (
            compareHasVideoMedia ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-sm text-amber-800">
                  Một trong hai bản thu là nguồn video. Chế độ đồng bộ hiện áp dụng cho audio
                  waveform; vui lòng mở từng bản ở thẻ tìm kiếm để xem video.
                </p>
              </div>
            ) : (
              <DualAudioComparePlayer
                leftRecording={leftRecording}
                rightRecording={rightRecording}
                leftSource={leftMediaSrc}
                rightSource={rightMediaSrc}
              />
            )
          ) : (
            <div className="rounded-xl border border-secondary-200 bg-white p-4">
              <p className="text-sm text-neutral-600">Chọn đủ 2 bản thu để bật chế độ phát đồng bộ.</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-primary-800 mb-3">So sánh phiên âm / lời hát</h3>
        {!leftTranscript && !rightTranscript ? (
          <p className="text-sm text-neutral-600 mb-6">
            Hai bản thu chưa có transcript/lyrics để so sánh.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-secondary-200/70 bg-gradient-to-b from-surface-panel via-cream-50/80 to-secondary-50/45 p-3">
              <p className="text-xs font-semibold text-primary-700 mb-2">Bản #1</p>
              <div
                className="text-sm leading-7 text-neutral-700"
                dangerouslySetInnerHTML={{
                  __html: transcriptDiff.leftHtml || 'Chưa có dữ liệu',
                }}
              />
            </div>
            <div className="rounded-xl border border-secondary-200/70 bg-gradient-to-b from-surface-panel via-cream-50/80 to-secondary-50/45 p-3">
              <p className="text-xs font-semibold text-primary-700 mb-2">Bản #2</p>
              <div
                className="text-sm leading-7 text-neutral-700"
                dangerouslySetInnerHTML={{
                  __html: transcriptDiff.rightHtml || 'Chưa có dữ liệu',
                }}
              />
            </div>
          </div>
        )}

        <h3 className="text-lg font-semibold text-primary-800 mb-3">Nhận xét từ chuyên gia</h3>
        {expertNotes.length === 0 ? (
          <p className="text-sm text-neutral-600">
            Chọn đủ 2 bản thu để hệ thống gợi ý nhận xét so sánh theo metadata đã kiểm duyệt.
          </p>
        ) : (
          <ul className="text-neutral-700 leading-relaxed space-y-2 list-none pl-0">
            {expertNotes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary-600 font-bold">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
