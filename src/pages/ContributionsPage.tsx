import { useEffect, useState, useCallback, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import BackButton from "@/components/common/BackButton";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { notify } from "@/stores/notificationStore";
import { LogIn, ChevronLeft, ChevronRight, Clock, FileAudio, AlertCircle, X, Music, User, Loader2, Trash2, ListFilter } from "lucide-react";
import axios from "axios";
import { submissionService, type Submission, type SubmissionRecording } from "@/services/submissionService";
import AudioPlayer from "@/components/features/AudioPlayer";
import VideoPlayer from "@/components/features/VideoPlayer";
import { isYouTubeUrl } from "@/utils/youtube";
import { deleteFileFromSupabase } from "@/services/uploadService";
import { sessionSetItem } from "@/services/storageService";
import { referenceDataService, type InstrumentItem } from "@/services/referenceDataService";
import { buildLoginRedirectPath } from "@/utils/routeAccess";
import { cn } from "@/utils/helpers";

// Helpers for formatted strings
const formatDuration = (seconds?: number | null) => {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/** Backend may expose alternate casing / legacy field names for media URLs. */
type SubmissionRecordingMedia = SubmissionRecording & {
  audioUrl?: string | null;
  audiofileurl?: string | null;
};

const formatSize = (bytes?: number | null) => {
  if (bytes == null) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

// Status labels — contrast trên nền cream / gradient thẻ Explore
const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Bản nháp", color: "bg-amber-50/95 text-amber-950 border-amber-200/90" },
  1: { label: "Chờ phê duyệt", color: "bg-sky-50/95 text-sky-950 border-sky-200/90" },
  2: { label: "Đã duyệt", color: "bg-emerald-50/95 text-emerald-950 border-emerald-200/90" },
  3: { label: "Từ chối", color: "bg-rose-50/95 text-rose-950 border-rose-200/90" },
  4: { label: "Yêu cầu cập nhật", color: "bg-orange-50/95 text-orange-950 border-orange-200/90" },
};

const STAGE_INFO: Record<number, { label: string; color: string }> = {
  0: { label: "Khởi tạo", color: "bg-neutral-100/95 text-neutral-800 border-neutral-200/90" },
  1: { label: "Sơ bộ", color: "bg-indigo-50/95 text-indigo-900 border-indigo-200/90" },
  2: { label: "Chuyên sâu", color: "bg-purple-50/95 text-purple-900 border-purple-200/90" },
  3: { label: "Hoàn thành", color: "bg-emerald-50/95 text-emerald-900 border-emerald-200/90" },
};

function formatPerformanceType(type: string | null | undefined): string {
  if (!type) return "—";
  const mapping: Record<string, string> = {
    "instrumental": "Nhạc cụ",
    "acappella": "Hát không đệm",
    "vocal_accompaniment": "Hát với nhạc đệm",
  };
  return mapping[type] || type;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

const CONTRIBUTOR_STATUS_TABS: Array<{ label: string; value: number | "ALL" }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Bản nháp", value: 0 },
  { label: "Chờ phê duyệt", value: 1 },
  { label: "Yêu cầu cập nhật", value: 4 },
  { label: "Đã duyệt", value: 2 },
  { label: "Từ chối", value: 3 },
];

const CONTRIBUTIONS_SUBMISSIONS_PANEL_ID = "contributions-submissions-panel";

export default function ContributionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState<number | "ALL">("ALL");
  const pageSize = 10;

  const statusTabHorizRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const statusTabSideRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const MODERATION_LEGEND_STEPS = [
    "Khởi tạo bản nháp",
    "Bước 1: Sàng lọc ban đầu",
    "Bước 2: Xác minh chi tiết",
    "Bước 3: Phê duyệt xuất bản",
  ] as const;

  const statusFilterTabClass = (isActive: boolean, layout: "sidebar" | "horizontal") =>
    cn(
      "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 sm:text-base",
      layout === "sidebar" ? "w-full justify-start text-left" : "shrink-0 justify-center whitespace-nowrap",
      isActive
        ? "bg-gradient-to-br from-white to-secondary-50 text-primary-900 shadow-md ring-2 ring-secondary-300/70"
        : "text-neutral-700 hover:bg-secondary-50/90 hover:text-neutral-900",
    );

  const renderModerationLegendPills = (compact: boolean) => (
    <div className={cn("flex flex-wrap gap-2", compact ? "gap-1.5 text-[11px]" : "text-xs sm:text-sm")}>
      {MODERATION_LEGEND_STEPS.map((step, i) => (
        <span
          key={step}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-secondary-200/80 bg-gradient-to-br from-white/90 to-secondary-50/70 py-1.5 font-medium text-neutral-800 shadow-sm",
            compact ? "pl-1 pr-2.5" : "pl-1.5 pr-3.5",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-white font-bold text-primary-800 shadow-sm ring-1 ring-secondary-200/60",
              compact ? "h-5 min-w-5 text-[9px]" : "h-6 min-w-6 text-[10px]",
            )}
            aria-hidden
          >
            {i + 1}
          </span>
          <span className="pr-0.5 leading-snug">{step}</span>
        </span>
      ))}
    </div>
  );

  // Detail modal
  const [detailSubmission, setDetailSubmission] = useState<Submission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isRequestingEdit, setIsRequestingEdit] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [instruments, setInstruments] = useState<InstrumentItem[]>([]);

  useEffect(() => {
    const fetchInstruments = async () => {
      try {
        const data = await referenceDataService.getInstruments();
        setInstruments(data);
      } catch (err) {
        console.error("Failed to fetch instruments:", err);
      }
    };
    fetchInstruments();
  }, []);

  const loadSubmissions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Use getMySubmissions instead of getSubmissionsByStatus to filter by user
      const res = await submissionService.getMySubmissions(user.id, page, pageSize);
      
      if (res?.isSuccess && Array.isArray(res.data)) {
        let filteredData = res.data;
        
        // If they have a specific status tab active (not "ALL"), filter client-side
        // if the backend doesn't support status filtering on /my endpoint yet
        if (activeStatusTab !== "ALL") {
          filteredData = res.data.filter(s => s.status === activeStatusTab);
        }

        setSubmissions(filteredData);
        setHasMore(res.data.length === pageSize);
      } else {
        setSubmissions([]);
        setHasMore(false);
      }
    } catch (err: unknown) {
      console.error("Failed to load submissions:", err);
      setError("Không thể tải danh sách đóng góp. Vui lòng thử lại.");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, page, activeStatusTab]);

  useEffect(() => {
    setPage(1);
  }, [activeStatusTab]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Redirect if user is Expert
  useEffect(() => {
    if (user?.role === UserRole.EXPERT) {
      navigate("/profile");
    }
  }, [user, navigate]);

  const detailModalOpen = detailSubmission !== null || detailLoading;
  useEffect(() => {
    if (!detailModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDetailSubmission(null);
        setDetailLoading(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailModalOpen]);

  useEffect(() => {
    if (!detailModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [detailModalOpen]);

  const focusContributorStatusTab = useCallback((orientation: "horizontal" | "vertical", index: number) => {
    const list = orientation === "horizontal" ? statusTabHorizRefs : statusTabSideRefs;
    queueMicrotask(() => list.current[index]?.focus());
  }, []);

  const onContributorStatusTabKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>, index: number, orientation: "horizontal" | "vertical") => {
      const len = CONTRIBUTOR_STATUS_TABS.length;
      const go = (next: number) => {
        setActiveStatusTab(CONTRIBUTOR_STATUS_TABS[next].value);
        focusContributorStatusTab(orientation, next);
      };
      if (orientation === "horizontal") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go((index + 1) % len);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          go((index - 1 + len) % len);
        } else if (e.key === "Home") {
          e.preventDefault();
          go(0);
        } else if (e.key === "End") {
          e.preventDefault();
          go(len - 1);
        }
      } else {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          go((index + 1) % len);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          go((index - 1 + len) % len);
        } else if (e.key === "Home") {
          e.preventDefault();
          go(0);
        } else if (e.key === "End") {
          e.preventDefault();
          go(len - 1);
        }
      }
    },
    [focusContributorStatusTab],
  );

  if (user?.role === UserRole.EXPERT) return null;

  const isNotContributor = !user || user.role !== UserRole.CONTRIBUTOR;

  const openDetail = async (submissionId: string) => {
    setDetailLoading(true);
    setDetailSubmission(null);
    try {
      const res = await submissionService.getSubmissionById(submissionId);
      if (res?.isSuccess && res.data) {
        setDetailSubmission(res.data);
      }
    } catch (err) {
      console.error("Failed to load submission detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleQuickEdit = async (sub: Submission) => {
    const rec = sub.recording;
    const effectiveMediaType = rec?.videoFileUrl ? "video" : "audio";

    // Create a mock LocalRecordingStorage object for UploadMusic.tsx
    const editingObj = {
      id: sub.id, // submissionId
      recordingId: sub.recordingId,
      mediaType: effectiveMediaType,
      youtubeUrl: rec?.videoFileUrl?.includes("youtube") ? rec.videoFileUrl : null,
      audioData: effectiveMediaType === "audio" ? rec?.audioFileUrl || (rec as SubmissionRecordingMedia).audioUrl : null,
      videoData: effectiveMediaType === "video" ? rec.videoFileUrl : null,
      basicInfo: {
        title: rec?.title || "",
        artist: rec?.performerName || "",
        composer: rec?.composer || "",
        language: rec?.language || "",
        genre: "",
        recordingLocation: rec?.recordingLocation || "",
        recordingDate: rec?.recordingDate || "",
      },
      culturalContext: {
        ethnicity: "",
        region: "",
        province: "",
        eventType: "",
        performanceType: rec?.performanceContext || "",
        instruments: rec?.instrumentIds || [],
        communeId: rec?.communeId,
        ethnicGroupId: rec?.ethnicGroupId,
        ceremonyId: rec?.ceremonyId,
        vocalStyleId: rec?.vocalStyleId,
        musicalScaleId: rec?.musicalScaleId,
      },
      additionalNotes: {
        description: rec?.description || "",
        transcription: rec?.lyricsOriginal || "",
      },
      file: {
        name: "File tải lên từ server",
        size: rec?.fileSizeBytes || 0,
        type: rec?.audioFormat || "",
        duration: rec?.durationSeconds || 0,
      }
    };

    await sessionSetItem("editingRecording", JSON.stringify(editingObj));
    navigate("/upload?edit=true");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    
    // 1. Capture info before potential removal from state
    const submissionToDelete = submissions.find(s => s.id === deleteId);
    
    // 2. Optimistic UI update: Remove from list immediately
    setSubmissions((prev) => prev.filter((s) => s.id !== deleteId));

    try {
      // 3. Perform deletion call
      await submissionService.deleteSubmission(deleteId);
      
      // 4. Cleanup files
      if (submissionToDelete?.recording) {
        const rec = submissionToDelete.recording as SubmissionRecordingMedia;
        const urls = [rec.audioUrl, rec.audioFileUrl, rec.audiofileurl, rec.videoFileUrl];
        const supabaseUrls = [...new Set(urls.filter((url): url is string => !!url && url.includes("supabase.co")))];

        for (const fileUrl of supabaseUrls) {
          deleteFileFromSupabase(fileUrl).catch(e => console.warn("Background file cleanup skip:", e));
        }
      }

      notify.success("Thành công", "Bản đóng góp đã được xóa.");
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const isActuallySuccess = status !== undefined && [200, 201, 204, 400, 404].includes(status);
      
      if (!isActuallySuccess) {
        console.error("Delete call background error:", err);
        // Rollback only if it's a genuine connection/server error (5xx)
        if (submissionToDelete) {
          setSubmissions(prev => [submissionToDelete, ...prev].sort((a, b) => 
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          ));
        }
        notify.error("Lỗi", "Không thể xóa bản đóng góp. Vui lòng thử lại sau.");
      } else {
        // Even if we got a 400/404, the deletion happened, so clean up files now
        if (submissionToDelete?.recording) {
          const rec = submissionToDelete.recording as SubmissionRecordingMedia;
          const urls = [rec.audioUrl, rec.audioFileUrl, rec.audiofileurl, rec.videoFileUrl];
          const supabaseUrls = [...new Set(urls.filter((url): url is string => !!url && url.includes("supabase.co")))];

          for (const fileUrl of supabaseUrls) {
            deleteFileFromSupabase(fileUrl).catch(e => console.warn("Background file cleanup catch-path skip:", e));
          }
        }
        notify.success("Thành công", "Bản đóng góp đã được xóa.");
      }
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const renderStatusBadge = (status: number) => {
    const info = STATUS_LABELS[status] || { label: `Trạng thái ${status}`, color: "bg-neutral-100 text-neutral-700 border-neutral-300" };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${info.color}`}>
        {info.label}
      </span>
    );
  };

  const renderStageBadge = (stage: number) => {
    const info = STAGE_INFO[stage] || { label: `Giai đoạn ${stage}`, color: "bg-neutral-100 text-neutral-600 border-neutral-300" };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${info.color}`}>
        {info.label}
      </span>
    );
  };

  const renderSubmissionCard = (sub: Submission) => {
    const title = sub.recording?.title || "Chưa có tiêu đề";
    const performer = sub.recording?.performerName || "Chưa rõ nghệ sĩ";
    const dateStr = formatDate(sub.submittedAt);

    return (
      <div
        key={sub.id}
        className={cn(
          "group cursor-pointer overflow-hidden rounded-2xl border border-secondary-200/70 bg-gradient-to-b from-[#FFFCF5] via-cream-50/80 to-secondary-50/45 shadow-md transition-all duration-300",
          "hover:border-secondary-300/80 hover:shadow-lg",
        )}
        onClick={() => openDetail(sub.id)}
      >
        <div className="p-5 sm:p-6">
          {/* Top row: title + status */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-neutral-900 truncate transition-colors group-hover:text-secondary-900">
                {title}
              </h3>
              <p className="text-sm text-neutral-600 font-medium mt-0.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 flex-shrink-0" />
                {performer}
              </p>
            </div>
            {renderStatusBadge(sub.status)}
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center justify-between gap-y-3 mt-4 text-sm text-neutral-600">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {dateStr}
              </span>
              {sub.status === 1 && (
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-neutral-400 text-xs">Giai đoạn:</span>
                  {renderStageBadge(sub.currentStage)}
                </div>
              )}
              {(sub.recording?.performanceContext || (sub.recording?.instrumentIds && sub.recording.instrumentIds.length > 0)) && (
                <div className="flex items-center gap-1.5 font-medium" title={
                  [
                    sub.recording?.performanceContext ? formatPerformanceType(sub.recording.performanceContext) : "",
                    (sub.recording?.instrumentIds && sub.recording.instrumentIds.length > 0) ? sub.recording.instrumentIds.map(id => instruments.find(i => i.id === id)?.name || `Nhạc cụ`).join(", ") : ""
                  ].filter(Boolean).join(" - ")
                }>
                  <Music className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="line-clamp-1">
                    {[
                      sub.recording?.performanceContext ? formatPerformanceType(sub.recording.performanceContext) : "",
                      (sub.recording?.instrumentIds && sub.recording.instrumentIds.length > 0) ? sub.recording.instrumentIds.map(id => instruments.find(i => i.id === id)?.name || `Nhạc cụ`).join(", ") : ""
                    ].filter(Boolean).join(" - ")}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-1.5 text-sm font-semibold text-red-800 shadow-sm transition-all hover:border-red-300 hover:bg-red-100/90 hover:shadow-md active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(sub.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="font-semibold text-xs">Xóa</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailField = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "" || (value === 0 && label.toLowerCase().includes("tempo"))) return null;
    return (
      <div className="py-2.5 flex flex-col border-b border-secondary-100 last:border-0">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{label}</span>
        <p className="text-sm text-neutral-900 font-medium mt-0.5 break-words">{String(value)}</p>
      </div>
    );
  };

  const contributionsListBody = (
    <>
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200/80 bg-red-50/90 p-4 shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" strokeWidth={2.5} />
          <p className="font-medium text-red-900">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <LoadingSpinner size="lg" />
          <p className="font-medium leading-relaxed text-neutral-600">Đang tải danh sách đóng góp...</p>
        </div>
      )}

      {!loading && !error && submissions.length === 0 && (
        <div className="py-10 text-center">
          <FileAudio className="mx-auto mb-4 h-12 w-12 text-neutral-400" strokeWidth={1.5} aria-hidden />
          <h3 className="mb-2 text-lg font-semibold text-neutral-800">Chưa có dữ liệu trong mục này</h3>
          <p className="mx-auto max-w-md font-medium leading-relaxed text-neutral-600">
            {activeStatusTab === 0 && "Chưa có bản ghi nháp."}
            {activeStatusTab === 1 && "Chưa có đóng góp đang chờ phê duyệt."}
            {activeStatusTab === 2 && "Chưa có đóng góp được duyệt."}
            {activeStatusTab === 3 && "Chưa có đóng góp bị từ chối."}
            {activeStatusTab === 4 && "Chưa có bản ghi đang yêu cầu cập nhật."}
            {activeStatusTab === "ALL" && "Bạn chưa có đóng góp nào. Hãy thử tải lên từ trang Đóng góp."}
          </p>
        </div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <div className="space-y-4">
          {submissions.map((sub) => renderSubmissionCard(sub))}
        </div>
      )}

      {!loading && !error && (submissions.length > 0 || page > 1) && (
        <div className="mt-8 flex items-center justify-center gap-4 border-t border-secondary-200/70 pt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-secondary-200/80 bg-white/80 px-4 py-2 font-medium text-neutral-800 shadow-sm transition-colors hover:border-secondary-300/80 hover:bg-secondary-50/90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </button>
          <span className="text-sm font-semibold text-neutral-800">Trang {page}</span>
          <button
            type="button"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-secondary-200/80 bg-white/80 px-4 py-2 font-medium text-neutral-800 shadow-sm transition-colors hover:border-secondary-300/80 hover:bg-secondary-50/90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );

  const mainListCardClassName = cn(
    "rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl min-w-0",
  );

  return (
    <div className="min-h-screen min-w-0 bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header — cùng rhythm ExplorePage / UploadPage */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">Đóng góp của bạn</h1>
          <div className="shrink-0">
            <BackButton />
          </div>
        </div>

        {/* Notice for non-Contributor users — skin cream/secondary như UploadPage */}
        {isNotContributor && (
          <div
            className={cn(
              "mb-6 lg:mb-8 rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/90 to-secondary-50/50 p-4 sm:p-6 lg:p-8 shadow-lg backdrop-blur-sm text-center transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl ring-1 ring-primary-100/40",
            )}
          >
            <h2 className="text-lg sm:text-2xl font-semibold mb-3 sm:mb-4 text-primary-800">
              Bạn cần có tài khoản Người đóng góp để xem trang đóng góp
            </h2>
            <div className="text-neutral-700 text-base mb-4 font-medium">
              Vui lòng đăng nhập bằng tài khoản Người đóng góp để xem và quản lý đóng góp của bạn.
            </div>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF5] mx-auto"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "auto" });
                navigate(buildLoginRedirectPath("/contributions"));
              }}
              type="button"
            >
              <LogIn className="h-5 w-5" strokeWidth={2.5} />
              Đăng nhập
            </button>
          </div>
        )}

        {isNotContributor ? (
          <div
            className={cn(mainListCardClassName, "opacity-50 pointer-events-none select-none")}
            id={CONTRIBUTIONS_SUBMISSIONS_PANEL_ID}
            role="region"
            aria-label="Danh sách đóng góp (cần đăng nhập người đóng góp)"
            aria-live="polite"
            aria-busy={loading}
          >
            {contributionsListBody}
          </div>
        ) : (
          <>
            {/* Mobile: tab cuộn ngang (không drawer), tinh thần ExploreSearchHeader */}
            <div
              className="mb-6 flex gap-2 overflow-x-auto overscroll-x-contain pb-2 -mx-1 px-1 scrollbar-hide lg:hidden"
              role="tablist"
              aria-label="Lọc theo trạng thái"
            >
              {CONTRIBUTOR_STATUS_TABS.map((tab, index) => {
                const selected = activeStatusTab === tab.value;
                return (
                  <button
                    key={String(tab.value)}
                    ref={(el) => {
                      statusTabHorizRefs.current[index] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`contrib-status-tab-h-${index}`}
                    aria-selected={selected}
                    aria-controls={CONTRIBUTIONS_SUBMISSIONS_PANEL_ID}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActiveStatusTab(tab.value)}
                    onKeyDown={(e) => onContributorStatusTabKeyDown(e, index, "horizontal")}
                    className={statusFilterTabClass(selected, "horizontal")}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="lg:grid lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:gap-8 xl:gap-10 lg:items-start">
              <aside
                className={cn(
                  "hidden lg:flex lg:flex-col lg:rounded-2xl lg:border lg:border-secondary-200/50 lg:bg-gradient-to-b lg:from-[#FFFCF5] lg:to-secondary-50/55 lg:p-6 lg:shadow-lg lg:backdrop-blur-sm lg:transition-all lg:duration-300 lg:hover:border-secondary-300/50 lg:hover:shadow-xl xl:p-8",
                  /* Khớp MainLayout: main có pt-32 lg:pt-40 — sidebar dính dưới header cố định */
                  "lg:sticky lg:top-32 lg:self-start lg:max-h-[min(100vh-10rem,56rem)] lg:overflow-y-auto xl:top-40 xl:max-h-[min(100vh-12rem,56rem)]",
                )}
                aria-label="Bảng điều khiển lọc đóng góp"
              >
                <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-neutral-900 sm:gap-3 sm:text-xl">
                  <span className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100/95 to-secondary-100/90 p-2 shadow-sm ring-1 ring-secondary-200/50">
                    <ListFilter className="h-5 w-5 text-primary-600" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span className="leading-tight">Theo dõi luồng kiểm duyệt</span>
                </h2>
                <p className="mt-2 text-sm font-medium text-neutral-700">
                  Các bước sàng lọc do đội ngũ duyệt thực hiện; dùng tab bên dưới để lọc đóng góp theo trạng thái.
                </p>
                <div className="mt-4">{renderModerationLegendPills(false)}</div>

                <div className="mt-8 border-t border-secondary-200/50 pt-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">Trạng thái</p>
                  <nav className="flex flex-col gap-2" role="tablist" aria-label="Lọc theo trạng thái (desktop)">
                    {CONTRIBUTOR_STATUS_TABS.map((tab, index) => {
                      const selected = activeStatusTab === tab.value;
                      return (
                        <button
                          key={String(tab.value)}
                          ref={(el) => {
                            statusTabSideRefs.current[index] = el;
                          }}
                          type="button"
                          role="tab"
                          id={`contrib-status-tab-v-${index}`}
                          aria-selected={selected}
                          aria-controls={CONTRIBUTIONS_SUBMISSIONS_PANEL_ID}
                          tabIndex={selected ? 0 : -1}
                          onClick={() => setActiveStatusTab(tab.value)}
                          onKeyDown={(e) => onContributorStatusTabKeyDown(e, index, "vertical")}
                          className={statusFilterTabClass(selected, "sidebar")}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              <main className="min-w-0">
                <details className="group mb-6 rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/85 to-secondary-50/45 p-4 shadow-md backdrop-blur-sm lg:hidden open:shadow-lg">
                  <summary className="cursor-pointer list-none font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      <span className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100/95 to-secondary-100/90 p-1.5 ring-1 ring-secondary-200/50">
                        <ListFilter className="h-4 w-4 text-primary-600" strokeWidth={2.5} aria-hidden />
                      </span>
                      Luồng kiểm duyệt (chú giải)
                      <span className="ml-auto text-sm font-medium text-primary-700 group-open:hidden">Mở</span>
                      <span className="ml-auto hidden text-sm font-medium text-primary-700 group-open:inline">Thu gọn</span>
                    </span>
                  </summary>
                  <div className="mt-4 border-t border-secondary-200/50 pt-4">{renderModerationLegendPills(true)}</div>
                </details>

                <div
                  className={mainListCardClassName}
                  id={CONTRIBUTIONS_SUBMISSIONS_PANEL_ID}
                  role="tabpanel"
                  aria-label="Danh sách đóng góp đã lọc"
                  aria-live="polite"
                  aria-busy={loading}
                >
                  {contributionsListBody}
                </div>
              </main>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal — cream shell, header mỏng (Phase 3) */}
      {(detailSubmission || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => {
            setDetailSubmission(null);
            setDetailLoading(false);
          }}
          style={{ animation: "fadeIn 0.3s ease-out" }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contributions-detail-title"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/95 to-secondary-50/45 shadow-2xl backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "slideUp 0.3s ease-out" }}
          >
            <div className="flex items-center justify-between border-b border-secondary-200/60 bg-gradient-to-r from-[#FFFCF5] to-secondary-50/35 p-4 sm:p-5">
              <h2 id="contributions-detail-title" className="text-lg font-semibold text-neutral-900 sm:text-xl">
                Chi tiết đóng góp
              </h2>
              <button
                type="button"
                onClick={() => {
                  setDetailSubmission(null);
                  setDetailLoading(false);
                }}
                className="shrink-0 rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Đóng chi tiết"
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              {detailLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                  <p className="text-neutral-600 font-medium">Đang tải chi tiết...</p>
                </div>
              )}

              {detailSubmission && (
                <div className="space-y-4">
                  {/* Status banner */}
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    {renderStatusBadge(detailSubmission.status)}
                    {detailSubmission.status === 1 && (
                      <div className="flex items-center gap-2">
                        {renderStageBadge(detailSubmission.currentStage)}
                      </div>
                    )}
                  </div>

                  {/* Submission info card */}
                  <div className="space-y-1 rounded-xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] to-cream-50/60 p-4">
                    <h3 className="mb-2 text-base font-semibold text-neutral-900">Thông tin đóng góp</h3>
                    {renderDetailField("Ngày gửi", formatDate(detailSubmission.submittedAt))}
                    {renderDetailField("Cập nhật lần cuối", formatDate(detailSubmission.updatedAt))}
                    {renderDetailField("Ghi chú", detailSubmission.notes)}
                  </div>

                  {/* Recording metadata card */}
                  <div className="space-y-1 rounded-xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] to-cream-50/60 p-4">
                    <h3 className="mb-2 text-base font-semibold text-neutral-900">Metadata bản thu</h3>
                    {renderDetailField("Tiêu đề", detailSubmission.recording?.title)}
                    {renderDetailField("Nghệ sĩ", detailSubmission.recording?.performerName)}
                    {renderDetailField("Mô tả", detailSubmission.recording?.description)}
                    {renderDetailField("Bối cảnh biểu diễn", formatPerformanceType(detailSubmission.recording?.performanceContext))}
                    {detailSubmission.recording?.instrumentIds && detailSubmission.recording.instrumentIds.length > 0 && (
                      <div className="flex flex-col border-b border-secondary-100 py-2.5 last:border-0">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Nhạc cụ</span>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {detailSubmission.recording.instrumentIds.map(id => {
                            const instrument = instruments.find(i => i.id === id);
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center rounded-md border border-secondary-200/80 bg-secondary-50/80 px-2.5 py-1 text-xs font-medium text-neutral-800"
                              >
                                {instrument ? instrument.name : `Nhạc cụ (ID: ${id})`}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {renderDetailField("Định dạng", detailSubmission.recording?.audioFormat)}
                    {renderDetailField("Thời lượng", formatDuration(detailSubmission.recording?.durationSeconds))}
                    {renderDetailField("Kích thước", formatSize(detailSubmission.recording?.fileSizeBytes))}
                    {renderDetailField("Ngày ghi âm", formatDate(detailSubmission.recording?.recordingDate || null))}
                    {renderDetailField("Lời gốc", detailSubmission.recording?.lyricsOriginal)}
                    {renderDetailField("Lời tiếng Việt", detailSubmission.recording?.lyricsVietnamese)}
                    {renderDetailField("Tempo", detailSubmission.recording?.tempo)}
                    {renderDetailField("Khóa nhạc", detailSubmission.recording?.keySignature)}
                    {(detailSubmission.recording?.gpsLatitude != null && detailSubmission.recording?.gpsLongitude != null && (detailSubmission.recording.gpsLatitude !== 0 || detailSubmission.recording.gpsLongitude !== 0)) && (
                      renderDetailField("Tọa độ GPS", `${detailSubmission.recording.gpsLatitude}, ${detailSubmission.recording.gpsLongitude}`)
                    )}
                  </div>

                  {/* Media Player */}
                  {detailSubmission.recording && (
                    <div className="mb-6">
                      {(() => {
                        const rec = detailSubmission.recording;
                        const title = rec.title || "Không có tiêu đề";
                        const performer = rec.performerName || "Đang cập nhật...";

                        // Try all possible media source fields from backend
                        const recMedia = rec as SubmissionRecordingMedia;
                        const audioSrc = recMedia.audioFileUrl || recMedia.audioUrl;
                        const videoSrc = rec.videoFileUrl;

                        if (videoSrc && (isYouTubeUrl(videoSrc) || videoSrc.match(/\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)$/i) || videoSrc.startsWith('data:video/') || videoSrc.includes('supabase.co'))) {
                          return (
                            <VideoPlayer
                              src={videoSrc}
                              title={title}
                              artist={performer}
                              showContainer={true}
                            />
                          );
                        }

                        if (audioSrc) {
                          return (
                            <AudioPlayer
                              src={audioSrc}
                              title={title}
                              artist={performer}
                            />
                          );
                        }

                        // Fallback: if videoURL exists but doesn't match video patterns, it might be an audio file in video field
                        if (videoSrc) {
                          return (
                            <AudioPlayer
                              src={videoSrc}
                              title={title}
                              artist={performer}
                            />
                          );
                        }

                        return null;
                      })()}
                    </div>
                  )}

                  {/* ID references - removed as per request */}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-secondary-200/60 bg-gradient-to-r from-[#FFFCF5]/95 to-secondary-50/40 p-4 sm:p-5">
              {detailSubmission && detailSubmission.status === 0 && (
                <button
                  type="button"
                  className="cursor-pointer rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-2.5 font-medium text-white shadow-md transition-all duration-200 hover:from-primary-500 hover:to-primary-600 hover:shadow-lg hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF5]"
                  onClick={() => {
                    handleQuickEdit(detailSubmission);
                  }}
                >
                  Sửa
                </button>
              )}

              {detailSubmission && detailSubmission.status === 1 && (
                <button
                  type="button"
                  disabled={isRequestingEdit}
                  className={cn(
                    "rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-2.5 font-medium text-white shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF5]",
                    isRequestingEdit ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:from-primary-500 hover:to-primary-600 hover:shadow-lg hover:scale-[1.02] active:scale-95",
                  )}
                  onClick={async () => {
                    setIsRequestingEdit(true);
                    try {
                      const res = await submissionService.requestEditSubmission(detailSubmission.id);
                      if (res?.isSuccess) {
                        notify.success("Thành công", "Yêu cầu chỉnh sửa đã được gửi đến ban quản trị.");
                        setDetailSubmission(null);
                        loadSubmissions();
                      } else {
                        notify.error("Lỗi", res?.message || "Không thể gửi yêu cầu chỉnh sửa.");
                      }
                    } catch (err: unknown) {
                      console.error("Failed to request edit:", err);
                      const apiMsg =
                        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object" && "message" in err.response.data
                          ? String((err.response.data as { message?: string }).message ?? "")
                          : "";
                      const fallback = err instanceof Error ? err.message : "";
                      notify.error("Lỗi", apiMsg || fallback || "Đã xảy ra lỗi khi gửi yêu cầu chỉnh sửa.");
                    } finally {
                      setIsRequestingEdit(false);
                    }
                  }}
                >
                  {isRequestingEdit ? "Đang gửi..." : "Yêu cầu chỉnh sửa"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setDetailSubmission(null);
                  setDetailLoading(false);
                }}
                className="cursor-pointer rounded-xl border border-secondary-200/80 bg-white/90 px-6 py-2.5 font-medium text-neutral-800 shadow-sm transition-all hover:border-secondary-300 hover:bg-secondary-50/90 hover:shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF5]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa đóng góp"
        message="Bạn có chắc chắn muốn xóa bản đóng góp này?"
        description="Hành động này sẽ xóa vĩnh viễn dữ liệu submission khỏi hệ thống và không thể khôi phục."
        confirmText={isDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
        cancelText="Hủy"
        confirmButtonStyle="bg-red-600 text-white hover:bg-red-500"
      />
    </div>
  );
}
