import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { ModerationStatus, UserRole } from "@/types";
import type { LocalRecording } from "@/types";
import { getLocalRecordingFull } from "@/services/recordingStorage";
import UploadMusic from "@/components/features/UploadMusic";
import BackButton from "@/components/common/BackButton";
import ForbiddenPage from "@/pages/ForbiddenPage";

export default function EditRecordingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [recording, setRecording] = useState<LocalRecording | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!id) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const full = await getLocalRecordingFull(id);
        if (cancelled) return;
        if (!full) {
          setForbidden(true);
          setRecording(null);
          setLoading(false);
          return;
        }
        const r = full as LocalRecording;
        const isContributor = user?.role === UserRole.CONTRIBUTOR;
        const isExpert = user?.role === UserRole.EXPERT;
        const isAdmin = user?.role === UserRole.ADMIN;
        const isOwner = r.uploader && (r.uploader as { id?: string }).id === user?.id;
        const status = r.moderation && typeof r.moderation === "object" && "status" in r.moderation
          ? (r.moderation as { status?: string }).status
          : undefined;
        const mod = r.moderation as { status?: string; contributorEditLocked?: boolean } | undefined;
        const contributorEditLocked = mod?.contributorEditLocked === true;
        const isApproved = status === ModerationStatus.APPROVED;
        const isTemporarilyRejected = status === ModerationStatus.TEMPORARILY_REJECTED;
        const isRejected = status === ModerationStatus.REJECTED;
        // Permanently rejected: no one can edit. Temporarily rejected: only contributor (owner) can edit until resubmit.
        const canEdit =
          !isRejected &&
          ((isContributor && isOwner && (isApproved || isTemporarilyRejected) && !contributorEditLocked) ||
            (isExpert && isApproved) ||
            (isAdmin && (isApproved || isTemporarilyRejected)));
        if (!canEdit) {
          setForbidden(true);
          setRecording(null);
        } else {
          setRecording(r);
        }
      } catch (err) {
        console.error("EditRecordingPage load error:", err);
        if (!cancelled) setForbidden(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id, user?.role]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
              Chỉnh sửa chi tiết bản thu
            </h1>
            <BackButton />
          </div>
          <div className="rounded-2xl border border-neutral-200/80 shadow-lg p-8 text-center" style={{ backgroundColor: "#FFFCF5" }}>
            <p className="text-neutral-600 font-medium">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (forbidden || !recording) {
    return (
      <ForbiddenPage message="Bạn không có quyền chỉnh sửa bản thu này." />
    );
  }

  return (
    <div className="min-h-screen min-w-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Chỉnh sửa bản thu
          </h1>
          <BackButton />
        </div>

        {/* Main form — same wrapper and padding as UploadPage */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 transition-all duration-300 hover:shadow-xl min-w-0 overflow-x-hidden"
          style={{ backgroundColor: "#FFFCF5" }}
        >
          <UploadMusic recordingId={id!} isApprovedEdit />
        </div>

        {/* Guidelines — same UI/UX as UploadPage */}
        <div className="border border-neutral-200/80 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: "#FFFCF5" }}>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-neutral-900 flex items-center gap-3">
            <div className="p-2 bg-secondary-100/90 rounded-lg shadow-sm">
              <BookOpen className="h-5 w-5 text-secondary-600" strokeWidth={2.5} />
            </div>
            Hướng dẫn đóng góp
          </h2>
          <ul className="space-y-3 text-neutral-700 font-medium leading-relaxed">
            <li className="flex items-start gap-3">
              <span className="text-primary-600 flex-shrink-0">•</span>
              <span>Đảm bảo bản ghi âm có chất lượng tốt, rõ ràng, ít tiếng ồn</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary-600 flex-shrink-0">•</span>
              <span>Cung cấp thông tin chính xác về nguồn gốc, người biểu diễn</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary-600 flex-shrink-0">•</span>
              <span>Tôn trọng bản quyền và quyền sở hữu trí tuệ của nghệ sĩ</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary-600 flex-shrink-0">•</span>
              <span>Các bản thu được kiểm duyệt trước khi công bố công khai</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
