import {
  Calendar,
  CheckCircle2,
  CircleDot,
  Clock,
  Edit3,
  FileAudio,
  FileText,
  Headphones,
  Loader2,
  MapPin,
  Mic2,
  Music,
  RefreshCw,
  Settings2,
  StickyNote,
  Tag,
  User,
  X,
} from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import AudioPlayer from '@/components/features/AudioPlayer';
import {
  ContributionStageBadge,
  ContributionStatusBadge,
} from '@/components/features/contributions/ContributionCard';
import SubmissionVersionTimeline from '@/components/features/submission/SubmissionVersionTimeline';
import VideoPlayer from '@/components/features/VideoPlayer';
import {
  formatContributionDate,
  formatContributionPerformanceType,
  formatRecordingDurationLabel,
  formatRecordingFileSizeMb,
  type SubmissionRecordingMedia,
} from '@/features/contributions/contributionDisplayUtils';
import { MODERATION_LEGEND_STEPS } from '@/features/contributions/contributionFilterConstants';
import type { InstrumentItem } from '@/services/referenceDataService';
import type { Submission } from '@/services/submissionService';
import { cn } from '@/utils/helpers';
import { isYouTubeUrl } from '@/utils/youtube';

function renderDetailField(
  label: string,
  value: string | number | null | undefined,
  icon?: ReactNode,
) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (value === 0 && label.toLowerCase().includes('tempo'))
  )
    return null;
  return (
    <div className="flex flex-col border-b border-secondary-100 py-2.5 last:border-0">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {icon != null && <span className="shrink-0 text-neutral-400">{icon}</span>}
        {label}
      </span>
      <p className="mt-0.5 break-words text-sm font-medium text-neutral-900">{String(value)}</p>
    </div>
  );
}

export default function ContributionsDetailModal({
  detailSubmission,
  detailLoading,
  onClose,
  instruments,
  onQuickEdit,
}: {
  detailSubmission: Submission | null;
  detailLoading: boolean;
  onClose: () => void;
  instruments: InstrumentItem[];
  onQuickEdit: (sub: Submission) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.24s ease-out' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contributions-detail-title"
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/95 to-secondary-50/45 shadow-2xl backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.24s ease-out' }}
      >
        <div className="border-b border-secondary-200/60 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/45">
          <div className="flex justify-end px-4 pt-3 sm:px-5">
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 cursor-pointer rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Đóng chi tiết"
            >
              <X className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </div>
          <div className="px-5 pb-4 sm:px-6 sm:pb-5">
            {detailSubmission ? (
              <>
                <h2
                  id="contributions-detail-title"
                  className="truncate text-xl font-bold leading-snug text-neutral-900 sm:text-2xl"
                >
                  {detailSubmission.recording?.title || 'Chưa có tiêu đề'}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-neutral-600">
                  <User className="h-4 w-4 shrink-0" />
                  {detailSubmission.recording?.performerName || 'Chưa rõ nghệ sĩ'}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <ContributionStatusBadge status={detailSubmission.status} />
                  {detailSubmission.status !== 1 && (
                    <ContributionStageBadge stage={detailSubmission.currentStage} />
                  )}
                </div>
              </>
            ) : (
              <h2
                id="contributions-detail-title"
                className="text-xl font-bold text-neutral-900 sm:text-2xl"
              >
                Chi tiết đóng góp
              </h2>
            )}
          </div>
        </div>

        <div className="overflow-y-auto p-5 pr-4 sm:p-6 sm:pr-5 scroll-smooth overscroll-contain">
          {detailLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              <p className="text-neutral-600 font-medium">Đang tải chi tiết...</p>
            </div>
          )}

          {detailSubmission && (
            <div className="space-y-4">
              {detailSubmission.status === 1 && (
                <div className="rounded-xl border border-sky-200/60 bg-sky-50/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sky-800">
                    Quy trình kiểm duyệt
                  </p>
                  <div className="flex min-w-0 items-start justify-between gap-0.5 sm:gap-1">
                    {MODERATION_LEGEND_STEPS.map((step, i) => {
                      const stage = Math.min(3, Math.max(0, detailSubmission.currentStage ?? 0));
                      const done = i < stage;
                      const active = i === stage;
                      const segmentComplete = i > 0 && i - 1 < stage;
                      return (
                        <Fragment key={step}>
                          {i > 0 && (
                            <div
                              className={cn(
                                'mx-0.5 mt-3 h-0.5 min-w-[6px] flex-1 rounded-full sm:mt-3.5',
                                segmentComplete ? 'bg-emerald-400' : 'bg-neutral-200',
                              )}
                              aria-hidden
                            />
                          )}
                          <div className="flex max-w-[22%] flex-1 flex-col items-center gap-1">
                            {done ? (
                              <CheckCircle2
                                className="h-6 w-6 shrink-0 text-emerald-500 sm:h-7 sm:w-7"
                                strokeWidth={2}
                                aria-hidden
                              />
                            ) : active ? (
                              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center sm:h-7 sm:w-7">
                                <span
                                  className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400/35"
                                  aria-hidden
                                />
                                <CircleDot
                                  className="relative h-6 w-6 text-primary-600 sm:h-7 sm:w-7"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                              </span>
                            ) : (
                              <div
                                className="h-6 w-6 shrink-0 rounded-full border-2 border-neutral-300 bg-white sm:h-7 sm:w-7"
                                aria-hidden
                              />
                            )}
                            <span
                              className={cn(
                                'text-center text-[9px] font-medium leading-tight sm:text-[10px]',
                                active
                                  ? 'font-semibold text-primary-800'
                                  : done
                                    ? 'text-emerald-800'
                                    : 'text-neutral-400',
                              )}
                            >
                              {step}
                            </span>
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {detailSubmission.recording &&
                (() => {
                  const rec = detailSubmission.recording;
                  const title = rec.title || 'Không có tiêu đề';
                  const performer = rec.performerName || 'Đang cập nhật...';

                  const recMedia = rec as SubmissionRecordingMedia;
                  const audioSrc = recMedia.audioFileUrl || recMedia.audioUrl;
                  const videoSrc = rec.videoFileUrl;

                  let playerNode: ReactNode = null;
                  if (
                    videoSrc &&
                    (isYouTubeUrl(videoSrc) ||
                      videoSrc.match(/\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)$/i) ||
                      videoSrc.startsWith('data:video/') ||
                      videoSrc.includes('supabase.co'))
                  ) {
                    playerNode = (
                      <VideoPlayer
                        src={videoSrc}
                        title={title}
                        artist={performer}
                        showContainer={true}
                      />
                    );
                  } else if (audioSrc) {
                    playerNode = <AudioPlayer src={audioSrc} title={title} artist={performer} />;
                  } else if (videoSrc) {
                    playerNode = <AudioPlayer src={videoSrc} title={title} artist={performer} />;
                  }

                  if (!playerNode) return null;

                  return (
                    <div className="rounded-xl border border-secondary-300/60 bg-gradient-to-br from-secondary-50/60 via-cream-50/70 to-secondary-50/40 p-1 shadow-sm ring-1 ring-secondary-200/50 ring-offset-0">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Headphones
                          className="h-4 w-4 shrink-0 text-secondary-600"
                          strokeWidth={2}
                          aria-hidden
                        />
                        <span className="text-xs font-semibold uppercase tracking-wider text-secondary-800">
                          Nghe / Xem bản thu
                        </span>
                      </div>
                      <div className="px-1 pb-1">{playerNode}</div>
                    </div>
                  );
                })()}

              <div className="rounded-xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel to-cream-50/60 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-900">
                  <FileText className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={2} />
                  Thông tin đóng góp
                </h3>
                <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {renderDetailField(
                    'Ngày gửi',
                    formatContributionDate(detailSubmission.submittedAt),
                    <Calendar className="h-3.5 w-3.5" strokeWidth={2} />,
                  )}
                  {renderDetailField(
                    'Cập nhật lần cuối',
                    formatContributionDate(detailSubmission.updatedAt),
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />,
                  )}
                  {renderDetailField(
                    'Ghi chú',
                    detailSubmission.notes,
                    <StickyNote className="h-3.5 w-3.5" strokeWidth={2} />,
                  )}
                </div>
              </div>

              <div className="space-y-5 rounded-xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel to-cream-50/60 p-4">
                <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
                  <FileAudio className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={2} />
                  Metadata bản thu
                </h3>

                {(() => {
                  const rec = detailSubmission.recording;
                  return (
                    <>
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                          <Music className="h-3 w-3 shrink-0" strokeWidth={2} />
                          Cơ bản
                        </p>
                        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                          {renderDetailField(
                            'Tiêu đề',
                            rec?.title,
                            <Tag className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                          {renderDetailField(
                            'Nghệ sĩ',
                            rec?.performerName,
                            <Mic2 className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                          {renderDetailField(
                            'Mô tả',
                            rec?.description,
                            <StickyNote className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                          {renderDetailField(
                            'Bối cảnh biểu diễn',
                            formatContributionPerformanceType(rec?.performanceContext),
                            <Music className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                          <Settings2 className="h-3 w-3 shrink-0" strokeWidth={2} />
                          Kỹ thuật
                        </p>
                        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                          {renderDetailField(
                            'Định dạng',
                            rec?.audioFormat,
                            <Settings2 className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                          {renderDetailField(
                            'Thời lượng',
                            formatRecordingDurationLabel(rec?.durationSeconds),
                            <Clock className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                          {renderDetailField(
                            'Kích thước',
                            formatRecordingFileSizeMb(rec?.fileSizeBytes),
                            <FileAudio className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                          {renderDetailField(
                            'Ngày ghi âm',
                            formatContributionDate(rec?.recordingDate || null),
                            <Calendar className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                          {renderDetailField(
                            'Tempo',
                            rec?.tempo,
                            <Settings2 className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                          {renderDetailField(
                            'Khóa nhạc',
                            rec?.keySignature,
                            <Settings2 className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                          {rec?.gpsLatitude != null &&
                            rec?.gpsLongitude != null &&
                            (rec.gpsLatitude !== 0 || rec.gpsLongitude !== 0) &&
                            renderDetailField(
                              'Tọa độ GPS',
                              `${rec.gpsLatitude}, ${rec.gpsLongitude}`,
                              <MapPin className="h-3.5 w-3.5" strokeWidth={2} />,
                            )}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                          <FileText className="h-3 w-3 shrink-0" strokeWidth={2} />
                          Nội dung
                        </p>
                        {rec?.instrumentIds && rec.instrumentIds.length > 0 && (
                          <div className="mb-3 flex flex-col border-b border-secondary-100 pb-3">
                            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                              <Music
                                className="h-3.5 w-3.5 shrink-0 text-neutral-400"
                                strokeWidth={2}
                              />
                              Nhạc cụ
                            </span>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {rec.instrumentIds.map((id) => {
                                const instrument = instruments.find((i) => i.id === id);
                                return (
                                  <span
                                    key={id}
                                    className="group inline-flex cursor-default items-center gap-1.5 rounded-lg border border-secondary-200/80 bg-secondary-50/80 px-2.5 py-1.5 text-xs font-medium text-neutral-800 transition-all hover:border-secondary-300 hover:bg-secondary-100/90 hover:shadow-sm"
                                  >
                                    <Music
                                      className="h-3 w-3 shrink-0 text-secondary-500 transition-colors group-hover:text-secondary-700"
                                      strokeWidth={2}
                                    />
                                    {instrument ? instrument.name : `Nhạc cụ (ID: ${id})`}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                          {renderDetailField(
                            'Lời gốc',
                            rec?.lyricsOriginal,
                            <FileText className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                          {renderDetailField(
                            'Lời tiếng Việt',
                            rec?.lyricsVietnamese,
                            <FileText className="h-3.5 w-3.5" strokeWidth={2} />,
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {detailSubmission?.id && (
                <div className="rounded-xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel to-cream-50/60 p-4">
                  <SubmissionVersionTimeline submissionId={detailSubmission.id} canDelete={false} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-secondary-200/60 bg-gradient-to-r from-surface-panel/95 to-secondary-50/40 p-4 sm:p-5">
          {detailSubmission && detailSubmission.status === 0 && (
            <button
              type="button"
              className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-2.5 font-medium text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:from-primary-500 hover:to-primary-600 hover:shadow-lg active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel cursor-pointer"
              onClick={() => {
                void onQuickEdit(detailSubmission);
              }}
            >
              <Edit3 className="h-4 w-4 shrink-0" strokeWidth={2} />
              Sửa
            </button>
          )}

          {detailSubmission && detailSubmission.status === 1 && (
            <button
              type="button"
              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-2.5 font-medium text-white shadow-md transition-all duration-200 cursor-pointer hover:from-primary-500 hover:to-primary-600 hover:shadow-lg hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel"
              onClick={() => {
                void onQuickEdit(detailSubmission);
              }}
            >
              <Edit3 className="h-4 w-4 shrink-0" strokeWidth={2} />
              Cập nhật
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl border border-secondary-200/80 bg-white/90 px-6 py-2.5 font-medium text-neutral-800 shadow-sm transition-all hover:border-secondary-300 hover:bg-secondary-50/90 hover:shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel cursor-pointer"
          >
            <X className="h-4 w-4 shrink-0" strokeWidth={2} />
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
