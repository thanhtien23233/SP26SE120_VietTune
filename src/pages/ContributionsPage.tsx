import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import BackButton from "@/components/common/BackButton";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { notify } from "@/stores/notificationStore";
import { LogIn, ChevronLeft, ChevronRight, Clock, FileAudio, AlertCircle, X, Music, User, Loader2, Trash2 } from "lucide-react";
import axios from "axios";
import { submissionService, type Submission, type SubmissionRecording } from "@/services/submissionService";
import AudioPlayer from "@/components/features/AudioPlayer";
import VideoPlayer from "@/components/features/VideoPlayer";
import { isYouTubeUrl } from "@/utils/youtube";
import { deleteFileFromSupabase } from "@/services/uploadService";
import { sessionSetItem } from "@/services/storageService";
import { referenceDataService, type InstrumentItem } from "@/services/referenceDataService";

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

// Status labels
const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Bản nháp", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  1: { label: "Chờ phê duyệt", color: "bg-blue-100 text-blue-800 border-blue-300" },
  2: { label: "Đã duyệt", color: "bg-green-100 text-green-800 border-green-300" },
  3: { label: "Từ chối", color: "bg-red-100 text-red-800 border-red-300" },
  4: { label: "Yêu cầu cập nhật", color: "bg-orange-100 text-orange-800 border-orange-300" },
};

const STAGE_INFO: Record<number, { label: string; color: string }> = {
  0: { label: "Khởi tạo", color: "bg-neutral-100 text-neutral-600 border-neutral-300" },
  1: { label: "Sơ bộ", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  2: { label: "Chuyên sâu", color: "bg-purple-50 text-purple-700 border-purple-200" },
  3: { label: "Hoàn thành", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
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

  const TABS: Array<{ label: string, value: number | "ALL" }> = [
    { label: "Tất cả", value: "ALL" },
    { label: "Bản nháp", value: 0 },
    { label: "Chờ phê duyệt", value: 1 },
    { label: "Yêu cầu cập nhật", value: 4 },
    { label: "Đã duyệt", value: 2 },
    { label: "Từ chối", value: 3 },
  ];

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
        className="group rounded-2xl border border-neutral-200/80 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
        style={{ backgroundColor: "#FFFCF5" }}
        onClick={() => openDetail(sub.id)}
      >
        <div className="p-5 sm:p-6">
          {/* Top row: title + status */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
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
      <div className="py-2.5 flex flex-col border-b border-neutral-100 last:border-0">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{label}</span>
        <p className="text-sm text-neutral-900 font-medium mt-0.5 break-words">{String(value)}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">Đóng góp của bạn</h1>
          <BackButton />
        </div>

        {/* Notice for non-Contributor users */}
        {isNotContributor && (
          <div className="mb-8 border border-primary-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm text-center transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFF1F3' }}>
            <h2 className="text-2xl font-semibold mb-4 text-primary-700">Bạn cần có tài khoản Người đóng góp để xem trang đóng góp</h2>
            <div className="text-primary-700 text-base mb-4 font-medium">Vui lòng đăng nhập bằng tài khoản Người đóng góp để xem và quản lý đóng góp của bạn.</div>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none mx-auto"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "auto" });
                navigate("/login?redirect=/contributions");
              }}
              type="button"
            >
              <LogIn className="h-5 w-5" strokeWidth={2.5} />
              Đăng nhập
            </button>
          </div>
        )}

        {/* Tabs */}
        {!isNotContributor && (
          <div className="mb-6 space-y-3">
            <div className="rounded-2xl border border-primary-200/80 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-primary-800 mb-2">Theo dõi luồng kiểm duyệt 3 bước</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  "Khởi tạo bản nháp",
                  "Bước 1: Sàng lọc ban đầu",
                  "Bước 2: Xác minh chi tiết",
                  "Bước 3: Phê duyệt xuất bản",
                ].map((step) => (
                  <span key={step} className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-primary-700">
                    {step}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveStatusTab(tab.value)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${activeStatusTab === tab.value
                    ? "bg-primary-600 text-white shadow-md border-primary-600"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div
          className={`rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-xl ${isNotContributor ? "opacity-50 pointer-events-none select-none" : ""}`}
          style={{ backgroundColor: '#FFFCF5' }}
        >
          {/* Error state */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50/90 border border-red-300/80 rounded-2xl shadow-sm mb-6">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" strokeWidth={2.5} />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              <p className="text-neutral-600 font-medium">Đang tải danh sách đóng góp...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && submissions.length === 0 && (
            <div className="text-center py-12">
              <FileAudio className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-neutral-900">Không có dữ liệu</h2>
              <p className="text-neutral-700 font-medium">
                {activeStatusTab === 0 && "Chưa có bản ghi nháp"}
                {activeStatusTab === 1 && "Chưa có đóng góp đang chờ phê duyệt"}
                {activeStatusTab === 2 && "Chưa có đóng góp được duyệt"}
                {activeStatusTab === 3 && "Chưa có đóng góp bị từ chối"}
                {activeStatusTab === 4 && "Chưa có bản ghi đang yêu cầu cập nhật"}
                {activeStatusTab === "ALL" && "Bạn chưa có đóng góp nào"}
              </p>
            </div>
          )}

          {/* Submission list */}
          {!loading && !error && submissions.length > 0 && (
            <div className="space-y-4">
              {submissions.map((sub) => renderSubmissionCard(sub))}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && (submissions.length > 0 || page > 1) && (
            <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-neutral-200/80">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Trước
              </button>
              <span className="text-sm font-semibold text-neutral-700">Trang {page}</span>
              <button
                type="button"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Sau
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {(detailSubmission || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => { setDetailSubmission(null); setDetailLoading(false); }}
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          <div
            className="rounded-2xl border border-neutral-300/80 shadow-2xl backdrop-blur-sm max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: '#FFF2D6', animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
              <h2 className="text-xl font-bold text-white">Chi tiết đóng góp</h2>
              <button
                onClick={() => { setDetailSubmission(null); setDetailLoading(false); }}
                className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white cursor-pointer"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
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
                  <div className="rounded-xl border border-neutral-200/80 p-4 space-y-1" style={{ backgroundColor: '#FFFCF5' }}>
                    <h3 className="text-base font-semibold text-neutral-800 mb-2">Thông tin đóng góp</h3>
                    {renderDetailField("Ngày gửi", formatDate(detailSubmission.submittedAt))}
                    {renderDetailField("Cập nhật lần cuối", formatDate(detailSubmission.updatedAt))}
                    {renderDetailField("Ghi chú", detailSubmission.notes)}
                  </div>

                  {/* Recording metadata card */}
                  <div className="rounded-xl border border-neutral-200/80 p-4 space-y-1" style={{ backgroundColor: '#FFFCF5' }}>
                    <h3 className="text-base font-semibold text-neutral-800 mb-2">Metadata bản thu</h3>
                    {renderDetailField("Tiêu đề", detailSubmission.recording?.title)}
                    {renderDetailField("Nghệ sĩ", detailSubmission.recording?.performerName)}
                    {renderDetailField("Mô tả", detailSubmission.recording?.description)}
                    {renderDetailField("Bối cảnh biểu diễn", formatPerformanceType(detailSubmission.recording?.performanceContext))}
                    {detailSubmission.recording?.instrumentIds && detailSubmission.recording.instrumentIds.length > 0 && (
                      <div className="py-2.5 flex flex-col border-b border-neutral-100 last:border-0">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Nhạc cụ</span>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {detailSubmission.recording.instrumentIds.map(id => {
                            const instrument = instruments.find(i => i.id === id);
                            return (
                              <span key={id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
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

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-center gap-4 p-5 border-t border-neutral-200/80 bg-neutral-50/50">
              {detailSubmission && detailSubmission.status === 0 && (
                <button
                  type="button"
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                  onClick={() => {
                    handleQuickEdit(detailSubmission);
                  }}
                >
                  Sửa
                </button>
              )}

              {detailSubmission && [1, 2, 3].includes(detailSubmission.status) && (
                <button
                  type="button"
                  disabled={isRequestingEdit}
                  className={`px-6 py-2.5 bg-primary-600 text-white rounded-full font-medium transition-all duration-200 shadow-md ${
                    isRequestingEdit ? "opacity-70 cursor-not-allowed" : "hover:bg-primary-700 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                  }`}
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
                onClick={() => { setDetailSubmission(null); setDetailLoading(false); }}
                className="px-6 py-2.5 bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
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
