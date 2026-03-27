import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Recording } from "@/types";
import { recordingService } from "@/services/recordingService";
import { submissionService } from "@/services/submissionService";
import { buildSubmissionLookupMaps } from "@/services/expertModerationApi";
import { mapSubmissionToLocalRecording } from "@/services/submissionApiMapper";
import { convertLocalToRecording } from "@/utils/localRecordingToRecording";
import { fetchVerifiedSubmissionsAsRecordings } from "@/services/researcherArchiveService";
import { Heart, Download, Share2, Eye, User } from "lucide-react";
import Badge from "@/components/common/Badge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Button from "@/components/common/Button";
import BackButton from "@/components/common/BackButton";
import { RECORDING_TYPE_NAMES } from "@/config/constants";


import { formatDateTime, formatDate, formatDuration } from "@/utils/helpers";
import AudioPlayer from "@/components/features/AudioPlayer";
import VideoPlayer from "@/components/features/VideoPlayer";
import { isYouTubeUrl } from "@/utils/youtube";
import { getRegionDisplayName } from "@/utils/recordingTags";

type LocationState = { from?: string; preloadedRecording?: Recording };

function pickRecordingFromApiBody(body: unknown): Recording | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const nested = b.data ?? b.Data;
  if (nested && typeof nested === "object" && !Array.isArray(nested) && "id" in nested && "title" in nested) {
    return nested as unknown as Recording;
  }
  if ("id" in b && "title" in b) return b as unknown as Recording;
  return null;
}

function pickSubmissionDetailRow(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== "object") return null;
  const r = res as Record<string, unknown>;
  const failed = r.isSuccess === false || r.IsSuccess === false;
  if (failed) return null;
  const d = r.data ?? r.Data;
  if (d && typeof d === "object" && !Array.isArray(d)) return d as Record<string, unknown>;
  return null;
}

function extractRecordingListFromApiResponse(res: unknown): Recording[] {
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  if (Array.isArray(r.items)) return r.items as Recording[];
  if (Array.isArray(r.data)) return r.data as Recording[];
  const data = r.data as Record<string, unknown> | undefined;
  if (data && Array.isArray(data.items)) return data.items as Recording[];
  return [];
}

const SURFACE_CARD =
  "rounded-xl border border-neutral-200/80 bg-[#FFFCF5] p-4 sm:p-5 shadow-sm transition-shadow duration-200 hover:shadow-md";

type TopicChip = { key: string; label: string; variant: "primary" | "secondary" };

/** Single canonical chip row: ethnicity, region, type, freeform tags (instruments stay in sidebar only). */
function buildTopicChips(recording: Recording): TopicChip[] {
  const seen = new Set<string>();
  const out: TopicChip[] = [];
  const add = (key: string, raw: string | undefined, variant: TopicChip["variant"] = "secondary") => {
    const t = raw?.trim();
    if (!t || t === "Không xác định" || t.toLowerCase() === "unknown") return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ key, label: t, variant });
  };

  if (recording.ethnicity && typeof recording.ethnicity === "object") {
    add("ethnicity", recording.ethnicity.nameVietnamese || recording.ethnicity.name);
  }
  add("region", getRegionDisplayName(recording.region, undefined));
  const rt = RECORDING_TYPE_NAMES[recording.recordingType];
  if (rt && rt !== "Khác") add("type", rt, "primary");
  recording.tags?.forEach((tag, idx) => add(`tag-${idx}`, tag));
  return out;
}

function isRecordingVideoUrl(url: string): boolean {
  return (
    isYouTubeUrl(url) ||
    /\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)(\?|$)/i.test(url) ||
    url.startsWith("data:video/")
  );
}

export default function RecordingDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = idParam ? decodeURIComponent(idParam) : undefined;
  const location = useLocation();
  const state = (location.state as LocationState | undefined) ?? {};
  const returnTo = state.from;
  const preloadedRecording = state.preloadedRecording;
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setRecording(null);
      setLoading(false);
      return;
    }
    if (preloadedRecording?.id === id) {
      setRecording(preloadedRecording);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        try {
          const response = await recordingService.getRecordingById(id);
          const rec = pickRecordingFromApiBody(response);
          if (rec && !cancelled) {
            setRecording(rec);
            return;
          }
        } catch (err) {
          console.warn("GET /Recording/{id} failed, trying submission / list fallbacks", err);
        }

        try {
          const subRes = await submissionService.getSubmissionById(id);
          const row = pickSubmissionDetailRow(subRes);
          if (row && !cancelled) {
            const lookups = await buildSubmissionLookupMaps();
            const local = mapSubmissionToLocalRecording(row, lookups);
            const rec = await convertLocalToRecording(local);
            if (!cancelled) setRecording(rec);
            return;
          }
        } catch {
          // ignore
        }

        try {
          const listRes = await recordingService.getRecordings(1, 500);
          const items = extractRecordingListFromApiResponse(listRes);
          const matched = items.find((x) => x.id === id);
          if (matched && !cancelled) {
            setRecording(matched);
            return;
          }
        } catch {
          // ignore and try verified-submission fallback below
        }

        try {
          const fallback = await fetchVerifiedSubmissionsAsRecordings();
          const matched = fallback.find((x) => x.id === id);
          if (matched && !cancelled) setRecording(matched);
          else if (!cancelled) setRecording(null);
        } catch {
          if (!cancelled) setRecording(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, preloadedRecording]);

  const topicChips = useMemo(
    () => (recording ? buildTopicChips(recording) : []),
    [recording]
  );

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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-neutral-900">
              Không tìm thấy bản thu
            </h1>
            <BackButton to={returnTo} />
          </div>
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

            {/* Actions + compact stats — one visual band */}
            <div
              className={`${SURFACE_CARD} flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between`}
            >
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="cursor-pointer">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Thích
                </Button>
                <Button variant="outline" className="cursor-pointer">
                  <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Tải xuống
                </Button>
                <Button variant="outline" className="cursor-pointer">
                  <Share2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Chia sẻ
                </Button>
              </div>
              <div
                className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-neutral-200/80 pt-3 text-sm text-neutral-600 sm:border-t-0 sm:pt-0"
                aria-label="Thống kê tương tác"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4 shrink-0 text-primary-600" strokeWidth={2.25} />
                  {recording.viewCount} xem
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="h-4 w-4 shrink-0 text-primary-600" strokeWidth={2.25} />
                  {recording.likeCount} thích
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Download className="h-4 w-4 shrink-0 text-primary-600" strokeWidth={2.25} />
                  {recording.downloadCount} tải
                </span>
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

            {/* Metadata */}
            {recording.metadata && (
              recording.metadata.tuningSystem ||
              recording.metadata.modalStructure ||
              recording.metadata.ritualContext ||
              recording.metadata.culturalSignificance
            ) && (
                <div className={SURFACE_CARD}>
                  <h2 className="text-base font-semibold mb-3 text-neutral-900">
                    Thông tin chuyên môn
                  </h2>
                  <dl className="space-y-3">
                    {recording.metadata.tuningSystem && (
                      <div>
                        <dt className="font-medium text-neutral-900">
                          Hệ thống điệu thức
                        </dt>
                        <dd className="text-neutral-700 font-medium">
                          {recording.metadata.tuningSystem}
                        </dd>
                      </div>
                    )}
                    {recording.metadata.modalStructure && (
                      <div>
                        <dt className="font-medium text-neutral-900">
                          Cấu trúc giai điệu
                        </dt>
                        <dd className="text-neutral-700 font-medium">
                          {recording.metadata.modalStructure}
                        </dd>
                      </div>
                    )}
                    {recording.metadata.ritualContext && (
                      <div>
                        <dt className="font-medium text-neutral-900">
                          Ngữ cảnh nghi lễ
                        </dt>
                        <dd className="text-neutral-700 font-medium">
                          {recording.metadata.ritualContext}
                        </dd>
                      </div>
                    )}
                    {recording.metadata.culturalSignificance && (
                      <div>
                        <dt className="font-medium text-neutral-900">
                          Ý nghĩa văn hóa
                        </dt>
                        <dd className="text-neutral-700 font-medium">
                          {recording.metadata.culturalSignificance}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

            {/* Lyrics */}
            {recording.metadata?.lyrics && (
              <div className={SURFACE_CARD}>
                <h2 className="text-base font-semibold mb-3 text-neutral-900">
                  Lời bài hát
                </h2>
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
                    {recording.ethnicity?.nameVietnamese ?? recording.ethnicity?.name ?? "—"}
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
                    <li
                      key={performer.id}
                      className="flex items-center text-neutral-700"
                    >
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
                  <p className="font-medium text-neutral-900">
                    {recording.uploader.fullName}
                  </p>
                  <p className="text-sm text-neutral-500">
                    @{recording.uploader.username}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}