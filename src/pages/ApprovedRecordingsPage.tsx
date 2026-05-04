import { Edit, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';
import AudioPlayer from '@/components/features/AudioPlayer';
import VideoPlayer from '@/components/features/VideoPlayer';
import { useApprovedRecordings } from '@/hooks/useApprovedRecordings';
import ForbiddenPage from '@/pages/ForbiddenPage';
import { recordingRequestService } from '@/services/recordingRequestService';
import { removeLocalRecording } from '@/services/recordingStorage';
import { useAuthStore } from '@/stores/authStore';
import {
  Recording,
  Region,
  RecordingType,
  User,
  UserRole,
  RecordingMetadata,
  RecordingQuality,
  VerificationStatus,
} from '@/types';
import type { DeleteRecordingRequest, EditSubmissionForReview } from '@/types';
import type { LocalRecording } from '@/types';
import {
  formatDateTime,
  getModerationStatusBadgeClassNames,
  getModerationStatusLabel,
} from '@/utils/helpers';
import { buildTagsFromLocal } from '@/utils/recordingTags';
import { isYouTubeUrl } from '@/utils/youtube';

// Extended Recording type that may include original local data
type RecordingWithLocalData = Recording & {
  _originalLocalData?: LocalRecording & {
    culturalContext?: {
      region?: string;
    };
  };
};

export default function ApprovedRecordingsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { items, load, forwardedDeletes, editSubmissions, refreshRequestQueues } =
    useApprovedRecordings(user?.id);

  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'request'; req: DeleteRecordingRequest }
    | null
  >(null);
  const [rejectTarget, setRejectTarget] = useState<DeleteRecordingRequest | null>(null);
  const [approveEditTarget, setApproveEditTarget] = useState<EditSubmissionForReview | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await recordingRequestService.completeDeleteRecording(
        deleteTarget.req.id,
        removeLocalRecording,
      );
      await recordingRequestService.addNotification({
        type: 'recording_deleted',
        title: 'Bản thu đã bị xóa',
        body: `"${deleteTarget.req.recordingTitle}" đã bị xóa theo yêu cầu.`,
        forRoles: [UserRole.CONTRIBUTOR],
        recordingId: deleteTarget.req.recordingId,
      });
      setDeleteTarget(null);
      void load();
      await refreshRequestQueues();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget || !user) return;
    try {
      await recordingRequestService.removeDeleteRequest(rejectTarget.id);
      await recordingRequestService.addNotification({
        type: 'delete_request_rejected',
        title: 'Yêu cầu xóa bản thu đã bị từ chối',
        body: `Chuyên gia đã từ chối yêu cầu xóa bản thu "${rejectTarget.recordingTitle}".`,
        forRoles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.EXPERT],
        recordingId: rejectTarget.recordingId,
      });
      setRejectTarget(null);
      await refreshRequestQueues();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveEditConfirm = async () => {
    if (!approveEditTarget) return;
    try {
      await recordingRequestService.approveEditSubmission(approveEditTarget.id);
      await recordingRequestService.addNotification({
        type: 'edit_submission_approved',
        title: 'Yêu cầu chỉnh sửa được duyệt',
        body: `Bạn đã được phép chỉnh sửa "${approveEditTarget.recordingTitle}".`,
        forRoles: [UserRole.CONTRIBUTOR],
        recordingId: approveEditTarget.recordingId,
      });
      setApproveEditTarget(null);
      await refreshRequestQueues();
      void load();
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || user.role !== UserRole.EXPERT) {
    return <ForbiddenPage message="Bạn cần tài khoản Chuyên gia để truy cập trang này." />;
  }

  // Phân chia bản thu thành 2 nhóm: do expert hiện tại duyệt và do expert khác duyệt
  const myApproved = items.filter((it) => it.moderation?.reviewerId === user?.id);
  const othersApproved = items.filter(
    (it) => it.moderation?.reviewerId !== user?.id && it.moderation?.reviewerId,
  );

  const renderRecordingItem = (it: LocalRecording) => {
    // VideoPlayer CHỈ nhận videoData hoặc YouTubeURL, AudioPlayer CHỈ nhận audioData
    let mediaSrc: string | undefined;
    let isVideo = false;

    // Kiểm tra YouTube URL trước (cho VideoPlayer)
    if (it.mediaType === 'youtube' && it.youtubeUrl && it.youtubeUrl.trim()) {
      mediaSrc = it.youtubeUrl.trim();
      isVideo = true;
    } else if (
      it.youtubeUrl &&
      typeof it.youtubeUrl === 'string' &&
      it.youtubeUrl.trim() &&
      isYouTubeUrl(it.youtubeUrl)
    ) {
      mediaSrc = it.youtubeUrl.trim();
      isVideo = true;
    }
    // Nếu là video, CHỈ dùng videoData (không fallback về audioData)
    else if (it.mediaType === 'video') {
      if (it.videoData && typeof it.videoData === 'string' && it.videoData.trim().length > 0) {
        mediaSrc = it.videoData;
        isVideo = true;
      }
    }
    // Nếu là audio, CHỈ dùng audioData
    else if (it.mediaType === 'audio') {
      if (it.audioData && typeof it.audioData === 'string' && it.audioData.trim().length > 0) {
        mediaSrc = it.audioData;
        isVideo = false;
      }
    }
    // Nếu mediaType chưa được set, thử phát hiện từ dữ liệu có sẵn
    else {
      // Ưu tiên videoData nếu có
      if (it.videoData && typeof it.videoData === 'string' && it.videoData.trim().length > 0) {
        mediaSrc = it.videoData;
        isVideo = true;
      }
      // Sau đó thử audioData
      else if (it.audioData && typeof it.audioData === 'string' && it.audioData.trim().length > 0) {
        mediaSrc = it.audioData;
        // Kiểm tra xem có phải video không bằng cách xem data URL
        if (mediaSrc.startsWith('data:video/')) {
          isVideo = true;
        } else {
          isVideo = false;
        }
      }
    }

    const isMyReview = it.moderation?.reviewerId === user?.id;
    const hasPendingDeleteRequest = forwardedDeletes.some(
      (req) => req.recordingId === (it.id ?? ''),
    );

    return (
      <div
        key={it.id}
        className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-neutral-800 font-semibold text-lg">
                {it.basicInfo?.title || it.title || 'Không có tiêu đề'}
              </div>
              {isMyReview && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100/90 text-primary-800 rounded-full text-xs font-medium shadow-sm hover:shadow-md transition-shadow duration-200">
                  Đã được tôi kiểm duyệt
                </span>
              )}
            </div>
            <div className="text-sm text-neutral-600 mb-1">
              Nghệ sĩ: {it.basicInfo?.artist || 'Không rõ'}
            </div>
            <div className="text-sm text-neutral-600 mb-1">
              Người đóng góp: {it.uploader?.username || 'Khách'}
            </div>
            <div className="text-sm text-neutral-500 mb-1">
              Thời điểm tải lên: {formatDateTime(it.uploadedDate)}
            </div>
            {it.moderation?.reviewedAt && (
              <div className="text-sm text-neutral-500 mb-1">
                Ngày kiểm duyệt: {formatDateTime(it.moderation.reviewedAt)}
              </div>
            )}
            {it.moderation?.reviewerName && (
              <div className="text-sm text-neutral-500 mb-1">
                Người kiểm duyệt: {it.moderation.reviewerName}
              </div>
            )}
            <div className="text-sm mt-2">
              Trạng thái:{' '}
              <span className={getModerationStatusBadgeClassNames(it.moderation?.status)}>
                {getModerationStatusLabel(it.moderation?.status)}
              </span>
            </div>
          </div>

          <div className="ml-4 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => !hasPendingDeleteRequest && navigate(`/recordings/${it.id}/edit`)}
              disabled={hasPendingDeleteRequest}
              className={
                hasPendingDeleteRequest
                  ? 'px-4 py-2 rounded-full bg-neutral-100 text-neutral-400 text-sm whitespace-nowrap flex items-center gap-2 cursor-not-allowed'
                  : 'px-4 py-2 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white text-sm whitespace-nowrap flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer'
              }
            >
              <Edit className="h-4 w-4" strokeWidth={2.5} />
              Chỉnh sửa bản thu
            </button>
          </div>
        </div>

        {/* Media Player */}
        {mediaSrc && (
          <div className="mt-4">
            {isVideo ? (
              <VideoPlayer
                src={mediaSrc}
                title={it.basicInfo?.title || it.title}
                artist={it.basicInfo?.artist}
                recording={
                  {
                    id: it.id ?? '',
                    title: it.title ?? it.basicInfo?.title ?? 'Không có tiêu đề',
                    titleVietnamese: it.titleVietnamese ?? '',
                    description: it.description ?? '',
                    ethnicity: it.ethnicity ?? {
                      id: '',
                      name: '',
                      nameVietnamese: '',
                      region: Region.RED_RIVER_DELTA,
                      recordingCount: 0,
                    },
                    region: it.region ?? Region.RED_RIVER_DELTA,
                    recordingType: it.recordingType ?? RecordingType.OTHER,
                    duration: it.duration ?? 0,
                    audioUrl: it.audioUrl ?? it.audioData ?? '',
                    waveformUrl: it.waveformUrl ?? '',
                    coverImage: it.coverImage ?? '',
                    instruments: it.instruments ?? [],
                    performers: it.performers ?? [],
                    recordedDate: it.recordedDate ?? '',
                    uploadedDate: it.uploadedDate ?? '',
                    uploader: ((): User => {
                      if (typeof it.uploader === 'object' && it.uploader !== null) {
                        const u = it.uploader as Partial<User>;
                        return {
                          id: u.id ?? '',
                          username: u.username ?? '',
                          email: u.email ?? '',
                          fullName: u.fullName ?? u.username ?? '',
                          role: u.role ?? UserRole.USER,
                          createdAt: u.createdAt ?? '',
                          updatedAt: u.updatedAt ?? '',
                        };
                      }
                      return {
                        id: '',
                        username: '',
                        email: '',
                        fullName: '',
                        role: UserRole.USER,
                        createdAt: '',
                        updatedAt: '',
                      };
                    })(),
                    tags: buildTagsFromLocal(it),
                    metadata: {
                      ...((it.metadata ?? {}) as Partial<RecordingMetadata>),
                      recordingQuality:
                        it.metadata?.recordingQuality ?? RecordingQuality.FIELD_RECORDING,
                    },
                    verificationStatus: it.verificationStatus ?? VerificationStatus.PENDING,
                    verifiedBy: it.verifiedBy ?? undefined,
                    viewCount: it.viewCount ?? 0,
                    likeCount: it.likeCount ?? 0,
                    downloadCount: it.downloadCount ?? 0,
                    _originalLocalData: it,
                  } as RecordingWithLocalData
                }
                showContainer={true}
              />
            ) : (
              <AudioPlayer
                src={mediaSrc}
                title={it.basicInfo?.title || it.title}
                artist={it.basicInfo?.artist}
                recording={
                  {
                    id: it.id ?? '',
                    title: it.title ?? it.basicInfo?.title ?? 'Không có tiêu đề',
                    titleVietnamese: it.titleVietnamese ?? '',
                    description: it.description ?? '',
                    ethnicity: it.ethnicity ?? {
                      id: '',
                      name: '',
                      nameVietnamese: '',
                      region: Region.RED_RIVER_DELTA,
                      recordingCount: 0,
                    },
                    region: it.region ?? Region.RED_RIVER_DELTA,
                    recordingType: it.recordingType ?? RecordingType.OTHER,
                    duration: it.duration ?? 0,
                    audioUrl: it.audioUrl ?? it.audioData ?? '',
                    waveformUrl: it.waveformUrl ?? '',
                    coverImage: it.coverImage ?? '',
                    instruments: it.instruments ?? [],
                    performers: it.performers ?? [],
                    recordedDate: it.recordedDate ?? '',
                    uploadedDate: it.uploadedDate ?? '',
                    uploader: ((): User => {
                      if (typeof it.uploader === 'object' && it.uploader !== null) {
                        const u = it.uploader as Partial<User>;
                        return {
                          id: u.id ?? '',
                          username: u.username ?? '',
                          email: u.email ?? '',
                          fullName: u.fullName ?? u.username ?? '',
                          role: u.role ?? UserRole.USER,
                          createdAt: u.createdAt ?? '',
                          updatedAt: u.updatedAt ?? '',
                        };
                      }
                      return {
                        id: '',
                        username: '',
                        email: '',
                        fullName: '',
                        role: UserRole.USER,
                        createdAt: '',
                        updatedAt: '',
                      };
                    })(),
                    tags: buildTagsFromLocal(it),
                    metadata: {
                      ...((it.metadata ?? {}) as Partial<RecordingMetadata>),
                      recordingQuality:
                        it.metadata?.recordingQuality ?? RecordingQuality.FIELD_RECORDING,
                    },
                    verificationStatus: it.verificationStatus ?? VerificationStatus.PENDING,
                    verifiedBy: it.verifiedBy ?? undefined,
                    viewCount: it.viewCount ?? 0,
                    likeCount: it.likeCount ?? 0,
                    downloadCount: it.downloadCount ?? 0,
                    _originalLocalData: it,
                  } as RecordingWithLocalData
                }
                showContainer={true}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa bản thu"
        message={
          deleteTarget
            ? `Bạn có chắc muốn xóa bản thu "${deleteTarget.req.recordingTitle}" khỏi hệ thống?`
            : ''
        }
        description="Bản thu sẽ bị xóa hoàn toàn. Người đóng góp, Chuyên gia và Quản trị viên sẽ nhận thông báo. Hành động không thể hoàn tác."
        confirmText="Chấp nhận xóa bản thu"
        cancelText="Hủy"
        confirmButtonStyle="bg-red-600 text-white hover:bg-red-500"
      />
      <ConfirmationDialog
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        title="Từ chối yêu cầu xóa bản thu"
        message={
          rejectTarget
            ? `Bạn có chắc muốn từ chối yêu cầu xóa bản thu "${rejectTarget.recordingTitle}"? Người đóng góp sẽ được thông báo.`
            : ''
        }
        description="Yêu cầu xóa sẽ bị hủy và bản thu vẫn giữ nguyên trong hệ thống."
        confirmText="Từ chối xóa bản thu"
        cancelText="Hủy"
        confirmButtonStyle="bg-neutral-600 text-white hover:bg-neutral-500"
      />
      <ConfirmationDialog
        isOpen={!!approveEditTarget}
        onClose={() => setApproveEditTarget(null)}
        onConfirm={handleApproveEditConfirm}
        title="Duyệt chỉnh sửa bản thu"
        message={
          approveEditTarget
            ? `Bạn có chắc muốn duyệt chỉnh sửa bản thu "${approveEditTarget.recordingTitle}"? Người đóng góp sẽ được thông báo và coi là đã hoàn tất chỉnh sửa.`
            : ''
        }
        description="Sau khi duyệt, quyền chỉnh sửa của người đóng góp sẽ được thu hồi cho đến khi họ gửi yêu cầu chỉnh sửa mới."
        confirmText="Duyệt chỉnh sửa"
        cancelText="Hủy"
        confirmButtonStyle="bg-primary-600 text-white hover:bg-primary-500"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Quản lý bản thu đã được kiểm duyệt
          </h1>
          <BackButton />
        </div>

        {editSubmissions.length > 0 && (
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 bg-surface-panel"
          >
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">
              Chỉnh sửa bản thu chờ duyệt
            </h2>
            <p className="text-neutral-700 font-medium mb-4 text-sm">
              Người đóng góp đã gửi chỉnh sửa và chờ bạn duyệt. Sau khi duyệt, họ mới được coi là
              hoàn tất chỉnh sửa.
            </p>
            <div className="space-y-4">
              {editSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200/80 p-4 bg-surface-panel"
                >
                  <div>
                    <p className="font-medium text-neutral-900">{sub.recordingTitle}</p>
                    <p className="text-sm text-neutral-600">
                      Người đóng góp: {sub.contributorName} · Gửi lúc:{' '}
                      {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/recordings/${sub.recordingId}/edit`)}
                      className="px-4 py-2 rounded-full bg-secondary-100/90 hover:bg-secondary-200/90 text-secondary-800 text-sm font-medium transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" strokeWidth={2.5} />
                      Xem / Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setApproveEditTarget(sub)}
                      className="px-4 py-2 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                      Duyệt chỉnh sửa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {forwardedDeletes.length > 0 && (
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 bg-surface-panel"
          >
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">
              Yêu cầu xóa bản thu đã chuyển đến bạn
            </h2>
            <p className="text-neutral-700 font-medium mb-4 text-sm">
              Quản trị viên đã chuyển các yêu cầu xóa từ Người đóng góp. Bạn có thể chấp nhận (xóa
              bản thu) hoặc từ chối yêu cầu.
            </p>
            <div className="space-y-4">
              {forwardedDeletes.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200/80 p-4 bg-surface-panel"
                >
                  <div>
                    <p className="font-medium text-neutral-900">{req.recordingTitle}</p>
                    <p className="text-sm text-neutral-600">
                      Người đóng góp: {req.contributorName} · Yêu cầu lúc:{' '}
                      {new Date(req.requestedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: 'request', req })}
                      className="px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                      Chấp nhận xóa bản thu
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectTarget(req)}
                      className="px-4 py-2 rounded-full bg-neutral-500 hover:bg-neutral-600 text-white text-sm font-medium transition-all cursor-pointer flex items-center gap-2"
                    >
                      <X className="w-4 h-4" strokeWidth={2.5} />
                      Từ chối xóa bản thu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && forwardedDeletes.length === 0 && editSubmissions.length === 0 ? (
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-xl font-semibold mb-2 text-neutral-900">Không có bản thu</h2>
            <p className="text-neutral-700 font-medium">Không có bản thu nào đã được kiểm duyệt.</p>
          </div>
        ) : (
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <div className="space-y-8">
              {/* Bản thu do tôi kiểm duyệt */}
              {myApproved.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100/90 text-primary-800 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-shadow duration-200">
                      Bản thu do tôi kiểm duyệt
                    </span>
                    <span className="text-sm font-normal text-neutral-600">
                      ({myApproved.length})
                    </span>
                  </h2>
                  <div className="space-y-6">{myApproved.map((it) => renderRecordingItem(it))}</div>
                </div>
              )}

              {/* Bản thu do chuyên gia khác kiểm duyệt */}
              {othersApproved.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100/90 text-neutral-700 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-shadow duration-200">
                      Bản thu do chuyên gia khác kiểm duyệt
                    </span>
                    <span className="text-sm font-normal text-neutral-600">
                      ({othersApproved.length})
                    </span>
                  </h2>
                  <div className="space-y-6">
                    {othersApproved.map((it) => renderRecordingItem(it))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
