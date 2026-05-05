import React, { useEffect, useMemo, useRef, useState } from 'react';

import SearchableDropdown from '@/components/common/SearchableDropdown';
import DualAudioComparePlayer from '@/components/researcher/DualAudioComparePlayer';
import { REGION_NAMES } from '@/config/constants';
import {
  buildExpertComparativeNotes,
  getTranscriptText,
  highlightTranscriptDiff,
} from '@/features/researcher/researcherRecordingUtils';
import { instrumentDetectionFlags, instrumentDetectionService } from '@/services/instrumentDetectionService';
import { Recording } from '@/types';
import type { InstrumentDetectionResult } from '@/types/instrumentDetection';
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

function normalizeBaseSongKey(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\((.*?)\)|\[(.*?)\]/g, ' ')
    .replace(/\b(version|ver|live|cover|remix|ban|bản)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function getBaseSongTitle(rec: Recording | undefined): string {
  if (!rec) return '';
  const explicit = readExtraString(rec, ['baseSongTitle', 'base_song_title', 'baseTitle']);
  const source = explicit || rec.title || rec.titleVietnamese || '';
  return source.trim();
}

function getVersionDescriptor(rec: Recording | undefined): string {
  if (!rec) return '—';
  const explicit = readExtraString(rec, ['versionDescriptor', 'version_descriptor']);
  if (explicit) return explicit;
  const instruments = rec.instruments
    ?.map((i) => i.nameVietnamese ?? i.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');
  const region = rec.region ? REGION_NAMES[rec.region as keyof typeof REGION_NAMES] : '';
  const year = (rec.recordedDate || '').slice(0, 4);
  return [instruments, region, year].filter(Boolean).join(' • ') || '—';
}

function getGenreLabel(rec: Recording | undefined): string {
  if (!rec) return '—';
  return readExtraString(rec, ['genreName', 'musicGenre', 'genre']) || rec.tags?.[0] || '—';
}

function getPerformerLabel(rec: Recording | undefined): string {
  if (!rec) return '—';
  const fromPerformers = (rec.performers ?? [])
    .map((p) => p.nameVietnamese ?? p.name)
    .filter(Boolean)
    .join(', ');
  if (fromPerformers) return fromPerformers;
  return readExtraString(rec, ['artistName', 'performerName', 'artist']) || '—';
}

type CompareAiSummary = {
  topInstrument: string;
  topConfidence: number | null;
};

function summarizeAi(result: InstrumentDetectionResult | null): CompareAiSummary {
  const sorted = [...(result?.instruments ?? [])].sort((a, b) => {
    const ca = a.confidence !== null && Number.isFinite(a.confidence) ? a.confidence : -1;
    const cb = b.confidence !== null && Number.isFinite(b.confidence) ? b.confidence : -1;
    return cb - ca;
  });
  if (sorted.length === 0) return { topInstrument: '—', topConfidence: null };
  return {
    topInstrument: sorted[0]?.name ?? '—',
    topConfidence: sorted[0]?.confidence ?? null,
  };
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
  const [leftAi, setLeftAi] = useState<InstrumentDetectionResult | null>(null);
  const [rightAi, setRightAi] = useState<InstrumentDetectionResult | null>(null);
  const [leftAiLoading, setLeftAiLoading] = useState(false);
  const [rightAiLoading, setRightAiLoading] = useState(false);

  const leftRequestRef = useRef(0);
  const rightRequestRef = useRef(0);
  const fetchedAiIds = useRef(new Set<string>());
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
  const leftBaseSongTitle = getBaseSongTitle(leftRecording);
  const rightBaseSongTitle = getBaseSongTitle(rightRecording);
  const sameBaseSong =
    Boolean(leftRecording && rightRecording) &&
    normalizeBaseSongKey(leftBaseSongTitle) !== '' &&
    normalizeBaseSongKey(leftBaseSongTitle) === normalizeBaseSongKey(rightBaseSongTitle);
  const sameSongCandidates = useMemo(() => {
    if (!leftRecording) return [];
    const leftKey = normalizeBaseSongKey(getBaseSongTitle(leftRecording));
    if (!leftKey) return [];
    return approvedRecordings.filter(
      (r) => r.id !== leftRecording.id && normalizeBaseSongKey(getBaseSongTitle(r)) === leftKey,
    );
  }, [approvedRecordings, leftRecording]);

  useEffect(() => {
    if (!instrumentDetectionFlags.confidenceEnabled) {
      setLeftAi(null);
      return;
    }
    const leftId = leftRecording?.id;
    if (!leftId) {
      setLeftAi(null);
      return;
    }

    const isCached = fetchedAiIds.current.has(leftId);
    leftRequestRef.current += 1;
    const seq = leftRequestRef.current;

    const runFetch = () => {
      setLeftAiLoading(true);
      instrumentDetectionService
        .analyzeRecording(leftId)
        .then((result) => {
          fetchedAiIds.current.add(leftId);
          if (leftRequestRef.current === seq) setLeftAi(result);
        })
        .catch(() => {
          if (leftRequestRef.current === seq) setLeftAi(null);
        })
        .finally(() => {
          if (leftRequestRef.current === seq) setLeftAiLoading(false);
        });
    };

    if (isCached) {
      runFetch();
    } else {
      const timeoutId = setTimeout(runFetch, 400);
      return () => clearTimeout(timeoutId);
    }
  }, [leftRecording?.id]);

  useEffect(() => {
    if (!instrumentDetectionFlags.confidenceEnabled) {
      setRightAi(null);
      return;
    }
    const rightId = rightRecording?.id;
    if (!rightId) {
      setRightAi(null);
      return;
    }

    const isCached = fetchedAiIds.current.has(rightId);
    rightRequestRef.current += 1;
    const seq = rightRequestRef.current;

    const runFetch = () => {
      setRightAiLoading(true);
      instrumentDetectionService
        .analyzeRecording(rightId)
        .then((result) => {
          fetchedAiIds.current.add(rightId);
          if (rightRequestRef.current === seq) setRightAi(result);
        })
        .catch(() => {
          if (rightRequestRef.current === seq) setRightAi(null);
        })
        .finally(() => {
          if (rightRequestRef.current === seq) setRightAiLoading(false);
        });
    };

    if (isCached) {
      runFetch();
    } else {
      const timeoutId = setTimeout(runFetch, 400);
      return () => clearTimeout(timeoutId);
    }
  }, [rightRecording?.id]);

  const leftAiSummary = summarizeAi(leftAi);
  const rightAiSummary = summarizeAi(rightAi);

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
        {leftRecording && (
          <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/50 p-3">
            <p className="text-xs font-semibold text-primary-800">Base song title</p>
            <p className="text-sm text-primary-900">
              {leftBaseSongTitle || leftRecording.title}
            </p>
            {sameSongCandidates.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {sameSongCandidates.slice(0, 6).map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setCompareRightId(candidate.id)}
                    className="rounded-full border border-primary-300 bg-white px-2.5 py-1 text-xs text-primary-800 hover:bg-primary-100"
                  >
                    So sánh với: {candidate.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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

        {leftRecording && rightRecording && (
          <div
            className={`mt-4 rounded-xl border p-3 text-sm ${
              sameBaseSong
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {sameBaseSong
              ? 'Hai bản ghi cùng base song title, phù hợp để so sánh dị bản theo nhạc cụ.'
              : 'Hai bản ghi chưa cùng base song title. Nên chọn cùng bài để so sánh học thuật chính xác hơn.'}
          </div>
        )}

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

        {leftRecording && rightRecording && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-base font-semibold text-neutral-900">
              Compare Panel — Side by Side
            </h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="font-semibold text-neutral-500">Tiêu chí</div>
              <div className="font-semibold text-primary-800">{leftRecording.title}</div>
              <div className="font-semibold text-primary-800">{rightRecording.title}</div>

              <div className="text-neutral-600">Base song title</div>
              <div>{leftBaseSongTitle || '—'}</div>
              <div>{rightBaseSongTitle || '—'}</div>

              <div className="text-neutral-600">Version descriptor</div>
              <div>{getVersionDescriptor(leftRecording)}</div>
              <div>{getVersionDescriptor(rightRecording)}</div>

              <div className="text-neutral-600">Nhạc cụ</div>
              <div>{leftRecording.instruments?.map((i) => i.nameVietnamese ?? i.name).join(', ') || '—'}</div>
              <div>{rightRecording.instruments?.map((i) => i.nameVietnamese ?? i.name).join(', ') || '—'}</div>

              <div className="text-neutral-600">Vùng miền</div>
              <div>{leftRecording.region ? REGION_NAMES[leftRecording.region as keyof typeof REGION_NAMES] : '—'}</div>
              <div>{rightRecording.region ? REGION_NAMES[rightRecording.region as keyof typeof REGION_NAMES] : '—'}</div>

              <div className="text-neutral-600">Thể loại</div>
              <div>{getGenreLabel(leftRecording)}</div>
              <div>{getGenreLabel(rightRecording)}</div>

              <div className="text-neutral-600">AI confidence</div>
              <div>
                {leftAiSummary.topConfidence == null
                  ? leftAiLoading
                    ? 'Đang phân tích...'
                    : '—'
                  : `${leftAiSummary.topInstrument} (${Math.round(leftAiSummary.topConfidence * 100)}%)`}
              </div>
              <div>
                {rightAiSummary.topConfidence == null
                  ? rightAiLoading
                    ? 'Đang phân tích...'
                    : '—'
                  : `${rightAiSummary.topInstrument} (${Math.round(rightAiSummary.topConfidence * 100)}%)`}
              </div>

              <div className="text-neutral-600">Performer</div>
              <div>{getPerformerLabel(leftRecording)}</div>
              <div>{getPerformerLabel(rightRecording)}</div>

              <div className="text-neutral-600">Ghi âm</div>
              <div>{leftRecording.recordedDate || '—'}</div>
              <div>{rightRecording.recordedDate || '—'}</div>
            </div>
          </div>
        )}
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
