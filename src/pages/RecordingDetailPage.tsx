import { AlertTriangle, Download, User, MapPin, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import AudioPlayer from '@/components/features/AudioPlayer';
import DisputeReportForm from '@/components/features/moderation/DisputeReportForm';
import VideoPlayer from '@/components/features/VideoPlayer';
import { RECORDING_TYPE_NAMES } from '@/config/constants';
import { useRecordingDetail } from '@/hooks/useRecordingDetail';
import { useAuthStore } from '@/stores/authStore';
import { useLoginModalStore } from '@/stores/loginModalStore';
import { Recording } from '@/types';
import type { AnnotationDto, AnnotationType } from '@/types/annotation';
import { ANNOTATION_TYPE_LABELS } from '@/types/annotation';
import { COPYRIGHT_DISPUTE_STATUS_LABELS } from '@/types/copyrightDispute';
import { uiToast } from '@/uiToast';
import { formatSecondsToTime, isLikelyHttpUrl } from '@/utils/annotationHelpers';
import { formatDateTime, formatDate, formatDuration } from '@/utils/helpers';
import { getRegionDisplayName } from '@/utils/recordingTags';
import { SURFACE_CARD } from '@/utils/surfaceTokens';
import { isYouTubeUrl } from '@/utils/youtube';

type LocationState = { from?: string; preloadedRecording?: Recording };

function readExtraString(
  row: unknown,
  keys: string[],
): string | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const fields = row as Record<string, unknown>;
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function readExtraNumber(
  row: unknown,
  keys: string[],
): number | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const fields = row as Record<string, unknown>;
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

type TopicChip = { key: string; label: string; variant: 'primary' | 'secondary' };
type AnnotationGroup = { key: string; label: string; items: AnnotationDto[] };

const ANNOTATION_TYPE_ORDER: AnnotationType[] = [
  'scholarly_note',
  'rare_variant',
  'research_link',
  'general',
];

/** Single canonical chip row: ethnicity, region, type, freeform tags (instruments stay in sidebar only). */
function buildTopicChips(recording: Recording): TopicChip[] {
  const seen = new Set<string>();
  const out: TopicChip[] = [];
  const add = (
    key: string,
    raw: string | undefined,
    variant: TopicChip['variant'] = 'secondary',
  ) => {
    const t = raw?.trim();
    if (!t || t === 'Không xác định' || t.toLowerCase() === 'unknown') return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ key, label: t, variant });
  };

  if (recording.ethnicity && typeof recording.ethnicity === 'object') {
    add('ethnicity', recording.ethnicity.nameVietnamese || recording.ethnicity.name);
  }
  add('region', getRegionDisplayName(recording.region, undefined));
  const rt = RECORDING_TYPE_NAMES[recording.recordingType];
  if (rt && rt !== 'Khác') add('type', rt, 'primary');
  recording.tags?.forEach((tag, idx) => add(`tag-${idx}`, tag));
  return out;
}

function isRecordingVideoUrl(url: string): boolean {
  return (
    isYouTubeUrl(url) ||
    /\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)(\?|$)/i.test(url) ||
    url.startsWith('data:video/')
  );
}

export default function RecordingDetailPage() {
  const user = useAuthStore((s) => s.user);
  const openLoginModal = useLoginModalStore((s) => s.openLoginModal);
  const { id: idParam } = useParams<{ id: string }>();
  const id = idParam ? decodeURIComponent(idParam) : undefined;
  const location = useLocation();
  const state = (location.state as LocationState | undefined) ?? {};
  const returnTo = state.from;
  const preloadedRecording = state.preloadedRecording;
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const { recording, loading, notFound, annotations, embargo, disputes, refetchDisputes } =
    useRecordingDetail(id, preloadedRecording);

  const topicChips = useMemo(() => (recording ? buildTopicChips(recording) : []), [recording]);
  const recordingLocation = useMemo(
    () => readExtraString(recording, ['recordingLocation', 'provinceName']),
    [recording],
  );
  const gpsLat = useMemo(
    () => readExtraNumber(recording, ['gpsLatitude', 'latitude']),
    [recording],
  );
  const gpsLon = useMemo(
    () => readExtraNumber(recording, ['gpsLongitude', 'longitude']),
    [recording],
  );
  const hasGps = useMemo(
    () =>
      typeof gpsLat === 'number' &&
      typeof gpsLon === 'number' &&
      (gpsLat !== 0 || gpsLon !== 0),
    [gpsLat, gpsLon],
  );
  const gpsMapUrl = useMemo(
    () => (hasGps ? `https://www.google.com/maps?q=${gpsLat},${gpsLon}` : null),
    [hasGps, gpsLat, gpsLon],
  );
  const gpsEmbedUrl = useMemo(
    () =>
      hasGps
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${gpsLon! - 0.01},${
            gpsLat! - 0.01
          },${gpsLon! + 0.01},${gpsLat! + 0.01}&marker=${gpsLat},${gpsLon}`
        : null,
    [hasGps, gpsLat, gpsLon],
  );
  const annotationGroups = useMemo<AnnotationGroup[]>(() => {
    if (annotations.length === 0) return [];

    const buckets = new Map<string, AnnotationDto[]>();
    for (const item of annotations) {
      const key = (item.type ?? 'general').trim() || 'general';
      const arr = buckets.get(key) ?? [];
      arr.push(item);
      buckets.set(key, arr);
    }

    for (const arr of buckets.values()) {
      arr.sort((a, b) => {
        const aStart = a.timestampStart ?? Number.MAX_SAFE_INTEGER;
        const bStart = b.timestampStart ?? Number.MAX_SAFE_INTEGER;
        if (aStart !== bStart) return aStart - bStart;
        return String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''));
      });
    }

    const ordered: AnnotationGroup[] = [];
    for (const type of ANNOTATION_TYPE_ORDER) {
      const items = buckets.get(type);
      if (items && items.length > 0) {
        ordered.push({
          key: type,
          label: ANNOTATION_TYPE_LABELS[type] ?? type,
          items,
        });
        buckets.delete(type);
      }
    }

    for (const [key, items] of buckets.entries()) {
      ordered.push({
        key,
        label: ANNOTATION_TYPE_LABELS[key] ?? key,
        items,
      });
    }
    return ordered;
  }, [annotations]);
  const isEmbargoActive = embargo?.status === 3;
  const activeDisputes = useMemo(
    () => disputes.filter((row) => row.status === 0 || row.status === 1),
    [disputes],
  );
  const hasActiveDispute = activeDisputes.length > 0;
  const activeDisputeStatus = useMemo(() => {
    const first = activeDisputes[0];
    if (!first) return null;
    return COPYRIGHT_DISPUTE_STATUS_LABELS[first.status] ?? `Trạng thái ${first.status}`;
  }, [activeDisputes]);

  function openDisputeModal(): void {
    if (!user?.id) {
      uiToast.warning('Bạn cần đăng nhập để báo cáo tranh chấp bản quyền.');
      openLoginModal({ redirect: location.pathname });
      return;
    }
    setShowDisputeModal(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-center justify-between mb-4 gap-4">
            <h1 className="text-2xl font-bold text-neutral-900">
              {notFound
                ? 'Bản ghi không tồn tại hoặc đã bị hạn chế truy cập'
                : 'Không tìm thấy bản ghi'}
            </h1>
            <BackButton to={returnTo} />
          </div>
          {notFound && (
            <p className="text-neutral-600 max-w-xl text-sm sm:text-base leading-relaxed">
              Bản ghi này có thể đã bị xóa, đang trong thời gian hạn chế công bố, hoặc bạn không có
              quyền xem.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-800">
              Chi tiết bản ghi
            </p>
            <BackButton to={returnTo} />
          </div>
          <h1
            className="mt-2 text-2xl sm:text-3xl font-bold text-neutral-900 leading-tight"
            title={recording.title}
          >
            {recording.title}
          </h1>
          {isEmbargoActive && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="inline-flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Bản ghi đang trong thời hạn hạn chế công bố.
              </p>
              {embargo?.embargoEndDate && (
                <p className="mt-1 text-xs text-amber-800">
                  Dự kiến kết thúc: {formatDateTime(embargo.embargoEndDate)}
                </p>
              )}
            </div>
          )}
          {hasActiveDispute && (
            <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              <p className="inline-flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                Bản ghi đang bị tranh chấp bản quyền.
              </p>
              <p className="mt-1 text-xs text-rose-800">
                Trạng thái hiện tại: {activeDisputeStatus} · Số vụ tranh chấp đang mở:{' '}
                {activeDisputes.length}
              </p>
            </div>
          )}
          <div className="mt-3">
            <button
              type="button"
              onClick={openDisputeModal}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Báo cáo vi phạm bản quyền
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-12">
          {/* Main Content */}
          <div className="space-y-5 lg:col-span-8">
            {/* Media — audio URLs on Supabase etc. must not use the video shell */}
            <div className={`${SURFACE_CARD} overflow-hidden p-0 sm:p-0`}>
              {recording.audioUrl ? (
                isRecordingVideoUrl(recording.audioUrl) ? (
                  <VideoPlayer
                    src={recording.audioUrl}
                    title={recording.title}
                    artist={recording.performers?.[0]?.name}
                    recording={recording}
                    showContainer={true}
                    showMetadataTags={false}
                  />
                ) : (
                  <AudioPlayer
                    src={recording.audioUrl}
                    title={recording.title}
                    artist={recording.performers?.[0]?.name}
                    recording={recording}
                    showContainer={true}
                    showMetadataTags={false}
                  />
                )
              ) : (
                <div className="flex min-h-[200px] items-center justify-center bg-neutral-100 px-4 text-center text-sm text-neutral-500">
                  Không có tệp phát lại cho bản ghi này.
                </div>
              )}
            </div>

            {topicChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topicChips.map((c) => (
                  <Badge key={c.key} variant={c.variant} size="sm" className="cursor-default">
                    {c.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions — chỉ nút tải xuống */}
            <div className={SURFACE_CARD}>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="cursor-pointer">
                  <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Tải xuống
                </Button>
              </div>
            </div>

            {/* Description */}
            {recording.description && (
              <div className={SURFACE_CARD}>
                <h2 className="text-base font-semibold mb-3 text-neutral-900">Mô tả</h2>
                <p className="text-neutral-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {recording.description}
                </p>
              </div>
            )}

            {hasGps && gpsEmbedUrl && (
              <div className={SURFACE_CARD}>
                <h2 className="text-base font-semibold mb-3 text-neutral-900">Bản đồ vị trí ghi âm</h2>
                <iframe
                  title="Recording location map"
                  src={gpsEmbedUrl}
                  className="h-52 w-full rounded-xl border border-neutral-200/80"
                  loading="lazy"
                />
              </div>
            )}

            {/* Metadata */}
            {recording.metadata &&
              (recording.metadata.tuningSystem ||
                recording.metadata.modalStructure ||
                recording.metadata.ritualContext ||
                recording.metadata.culturalSignificance) && (
                <div className={SURFACE_CARD}>
                  <h2 className="text-base font-semibold mb-3 text-neutral-900">
                    Thông tin chuyên môn
                  </h2>
                  <dl className="space-y-3">
                    {recording.metadata.tuningSystem && (
                      <div>
                        <dt className="font-medium text-neutral-900">Hệ thống điệu thức</dt>
                        <dd className="text-neutral-700 font-medium">
                          {recording.metadata.tuningSystem}
                        </dd>
                      </div>
                    )}
                    {recording.metadata.modalStructure && (
                      <div>
                        <dt className="font-medium text-neutral-900">Cấu trúc giai điệu</dt>
                        <dd className="text-neutral-700 font-medium">
                          {recording.metadata.modalStructure}
                        </dd>
                      </div>
                    )}
                    {recording.metadata.ritualContext && (
                      <div>
                        <dt className="font-medium text-neutral-900">Ngữ cảnh nghi lễ</dt>
                        <dd className="text-neutral-700 font-medium">
                          {recording.metadata.ritualContext}
                        </dd>
                      </div>
                    )}
                    {recording.metadata.culturalSignificance && (
                      <div>
                        <dt className="font-medium text-neutral-900">Ý nghĩa văn hóa</dt>
                        <dd className="text-neutral-700 font-medium">
                          {recording.metadata.culturalSignificance}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

            {/* Expert annotations (read-only) */}
            {annotationGroups.length > 0 && (
              <div className={SURFACE_CARD}>
                <h2 className="text-base font-semibold mb-3 text-neutral-900">Chú thích chuyên gia</h2>
                <div className="space-y-4">
                  {annotationGroups.map((group) => (
                    <section key={group.key} className="rounded-xl border border-neutral-200 bg-white p-3">
                      <h3 className="text-sm font-semibold text-primary-800 mb-2">{group.label}</h3>
                      <ul className="space-y-2">
                        {group.items.map((item) => {
                          const timeStart = formatSecondsToTime(item.timestampStart ?? null, '');
                          const timeEnd = formatSecondsToTime(item.timestampEnd ?? null, '');
                          const hasTime = Boolean(timeStart || timeEnd);
                          const citation = (item.researchCitation ?? '').trim();
                          return (
                            <li key={item.id} className="rounded-lg border border-neutral-200 bg-surface-panel p-3">
                              {hasTime && (
                                <p className="mb-1 text-xs font-medium text-neutral-600">
                                  {timeStart && timeEnd ? `${timeStart} - ${timeEnd}` : timeStart || timeEnd}
                                </p>
                              )}
                              <p className="text-sm text-neutral-800 whitespace-pre-wrap">
                                {item.content || '(Không có nội dung)'}
                              </p>
                              {citation && (
                                <p className="mt-2 text-xs text-neutral-700">
                                  Trích dẫn:{' '}
                                  {isLikelyHttpUrl(citation) ? (
                                    <a
                                      href={citation}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary-700 hover:text-primary-800 underline"
                                    >
                                      {citation}
                                    </a>
                                  ) : (
                                    <span>{citation}</span>
                                  )}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            )}

            {/* Lyrics */}
            {recording.metadata?.lyrics && (
              <div className={SURFACE_CARD}>
                <h2 className="text-base font-semibold mb-3 text-neutral-900">Lời bài hát</h2>
                <p className="text-neutral-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-4">
                  {recording.metadata.lyrics}
                </p>
                {recording.metadata.lyricsTranslation && (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-2">Dịch nghĩa</h3>
                    <p className="text-neutral-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                      {recording.metadata.lyricsTranslation}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:col-span-4">
            {/* Basic Info */}
            <div className={SURFACE_CARD}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-800 mb-4">
                Thông tin
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-neutral-500">Dân tộc</dt>
                  <dd className="font-medium text-neutral-900">
                    {recording.ethnicity?.nameVietnamese ?? recording.ethnicity?.name ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-neutral-500">Vùng miền</dt>
                  <dd className="font-medium text-neutral-900">
                    {getRegionDisplayName(recording.region, undefined)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-neutral-500">Loại hình</dt>
                  <dd className="font-medium text-neutral-900">
                    {RECORDING_TYPE_NAMES[recording.recordingType]}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-neutral-500">Thời lượng</dt>
                  <dd className="font-medium text-neutral-900">
                    {formatDuration(Math.max(0, Math.floor(Number(recording.duration) || 0)))}
                  </dd>
                </div>
                {recording.recordedDate && (
                  <div>
                    <dt className="text-sm text-neutral-500">Ngày thu âm</dt>
                    <dd className="font-medium text-neutral-900">
                      {formatDate(recording.recordedDate)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-neutral-500">Thời điểm tải lên</dt>
                  <dd className="font-medium text-neutral-900">
                    {formatDateTime(recording.uploadedDate)}
                  </dd>
                </div>
                {(recordingLocation || hasGps) && (
                  <div>
                    <dt className="text-sm text-neutral-500">Vị trí ghi âm</dt>
                    <dd className="font-medium text-neutral-900 space-y-1">
                      {recordingLocation && <p>{recordingLocation}</p>}
                      {hasGps && (
                        <p>
                          <span className="inline-flex items-center gap-1 text-neutral-700">
                            <MapPin className="h-4 w-4 text-primary-600" strokeWidth={2.25} />
                            {`${gpsLat?.toFixed(6)}, ${gpsLon?.toFixed(6)}`}
                          </span>
                          {gpsMapUrl && (
                            <a
                              href={gpsMapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 text-primary-700 hover:text-primary-800 underline"
                            >
                              Xem bản đồ
                            </a>
                          )}
                        </p>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Instruments */}
            {recording.instruments.length > 0 && (
              <div className={SURFACE_CARD}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-800 mb-4">
                  Nhạc cụ
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recording.instruments.map((instrument) => (
                    <Badge key={instrument.id} variant="primary" size="sm">
                      {instrument.nameVietnamese ?? instrument.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Performers */}
            {recording.performers.length > 0 && (
              <div className={SURFACE_CARD}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-800 mb-4">
                  Nghệ nhân
                </h3>
                <ul className="space-y-2">
                  {recording.performers.map((performer) => (
                    <li key={performer.id} className="flex items-center text-neutral-700">
                      <User className="h-4 w-4 mr-2 text-primary-600" strokeWidth={2.5} />
                      <span>{performer.name}</span>
                      {performer.title && (
                        <Badge variant="secondary" size="sm" className="ml-2">
                          {performer.title}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Uploader */}
            <div className={SURFACE_CARD}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-800 mb-4">
                Người đóng góp
              </h3>
              <div className="flex items-center">
                <div className="bg-primary-100 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">{recording.uploader.fullName}</p>
                  {recording.uploader.username ? (
                    <p className="text-sm text-neutral-500">@{recording.uploader.username}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {showDisputeModal && recording?.id && user?.id && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onClick={() => setShowDisputeModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dispute-title"
            className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-surface-panel p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="report-dispute-title" className="text-lg font-semibold text-neutral-900">
                Báo cáo tranh chấp bản quyền
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowDisputeModal(false)}>
                Đóng
              </Button>
            </div>
            <DisputeReportForm
              recordingId={recording.id}
              userId={user.id}
              onCancel={() => setShowDisputeModal(false)}
              onSuccess={async () => {
                setShowDisputeModal(false);
                await refetchDisputes();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
