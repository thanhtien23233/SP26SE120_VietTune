import { LogIn } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';
import {
  ContributionsDesktopFilterAside,
  ContributionsMobileStatusTabs,
  ContributionsModerationLegendCollapsible,
} from '@/components/features/contributions/ContributionFilters';
import ContributionsDetailModal from '@/components/features/contributions/ContributionsDetailModal';
import ContributionsListSection from '@/components/features/contributions/ContributionsListSection';
import { useAuth } from '@/contexts/AuthContext';
import type { SubmissionRecordingMedia } from '@/features/contributions/contributionDisplayUtils';
import { CONTRIBUTIONS_SUBMISSIONS_PANEL_ID } from '@/features/contributions/contributionFilterConstants';
import { useContributionsData } from '@/features/contributions/hooks/useContributionsData';
import { useContributionsStatusTabA11y } from '@/features/contributions/hooks/useContributionsStatusTabA11y';
import { referenceDataService, type InstrumentItem } from '@/services/referenceDataService';
import { sessionSetItem } from '@/services/storageService';
import {
  submissionService,
  mapSubmissionListRowToSubmission,
  type Submission,
} from '@/services/submissionService';
import { deleteFileFromSupabase } from '@/services/uploadService';
import { useLoginModalStore } from '@/stores/loginModalStore';
import { UserRole } from '@/types';
import { uiToast, notifyLine } from '@/uiToast';
import { cn } from '@/utils/helpers';
import { getHttpStatus } from '@/utils/httpError';
import { SURFACE_PANEL_GRADIENT } from '@/utils/surfaceTokens';

export default function ContributionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const openLoginModal = useLoginModalStore((s) => s.openLoginModal);
  const {
    submissions,
    setSubmissions,
    loading,
    error,
    page,
    setPage,
    hasMore,
    activeStatusTab,
    setActiveStatusTab,
  } = useContributionsData(user?.id);

  const {
    statusTabHorizRefs,
    statusTabSideRefs,
    onContributorStatusTabKeyDown,
    statusFilterTabClass,
  } = useContributionsStatusTabA11y(setActiveStatusTab);

  const tabFilterProps = {
    activeStatusTab,
    onStatusChange: setActiveStatusTab,
    statusFilterTabClass,
    onContributorStatusTabKeyDown,
    statusTabHorizRefs,
    statusTabSideRefs,
  };

  // Detail modal
  const [detailSubmission, setDetailSubmission] = useState<Submission | null>(null);
  /** Id passed when opening the modal — fallback if GET /Submission/{id} payload omits `id` (camelCase). */
  const detailOpenedWithSubmissionIdRef = useRef<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [instruments, setInstruments] = useState<InstrumentItem[]>([]);
  const instrumentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const instrument of instruments) {
      map.set(instrument.id, instrument.name);
    }
    return map;
  }, [instruments]);

  useEffect(() => {
    const fetchInstruments = async () => {
      try {
        const data = await referenceDataService.getInstruments();
        setInstruments(data);
      } catch (err) {
        console.error('Failed to fetch instruments:', err);
      }
    };
    void fetchInstruments();
  }, []);

  // Redirect if user is Expert
  useEffect(() => {
    if (user?.role === UserRole.EXPERT) {
      navigate('/profile');
    }
  }, [user, navigate]);

  const detailModalOpen = detailSubmission !== null || detailLoading;

  const closeDetail = useCallback(() => {
    detailOpenedWithSubmissionIdRef.current = null;
    setDetailSubmission(null);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (!detailModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailModalOpen, closeDetail]);

  useEffect(() => {
    if (!detailModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [detailModalOpen]);

  if (user?.role === UserRole.EXPERT) return null;

  const isNotContributor = !user || user.role !== UserRole.CONTRIBUTOR;

  const openDetail = async (submissionId: string) => {
    detailOpenedWithSubmissionIdRef.current = submissionId.trim() || null;
    setDetailLoading(true);
    setDetailSubmission(null);
    try {
      const res = await submissionService.getSubmissionById(submissionId);
      if (res?.isSuccess && res.data) {
        let normalized = mapSubmissionListRowToSubmission(
          res.data as unknown as Record<string, unknown>,
        );
        const sid = submissionId.trim();
        if (!normalized.id && sid) {
          normalized = {
            ...normalized,
            id: sid,
            recordingId: normalized.recordingId || sid,
          };
        }
        setDetailSubmission(normalized.id ? normalized : null);
      }
    } catch (err) {
      console.error('Failed to load submission detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleQuickEdit = async (sub: Submission) => {
    const rec = sub.recording;
    const effectiveMediaType = rec?.videoFileUrl ? 'video' : 'audio';
    const audioUrl =
      effectiveMediaType === 'audio'
        ? rec?.audioFileUrl || (rec as SubmissionRecordingMedia)?.audioUrl || null
        : null;
    const videoUrl = effectiveMediaType === 'video' ? rec?.videoFileUrl || null : null;

    // Create a mock LocalRecordingStorage object for UploadMusic.tsx
    const editingObj = {
      id: sub.id, // submissionId
      recordingId: sub.recordingId,
      submissionId: sub.id,
      mediaType: effectiveMediaType,
      youtubeUrl: videoUrl && videoUrl.includes('youtube') ? videoUrl : null,
      audioData: audioUrl,
      videoData: videoUrl,
      audioUrl: audioUrl,
      audioFileUrl: rec?.audioFileUrl ?? null,
      videoFileUrl: rec?.videoFileUrl ?? null,
      basicInfo: {
        title: rec?.title || '',
        artist: rec?.performerName || '',
        composer: rec?.composer || '',
        language: rec?.language || '',
        genre: '',
        recordingLocation: rec?.recordingLocation || '',
        recordingDate: rec?.recordingDate || '',
        dateEstimated: false,
        dateNote: '',
      },
      culturalContext: {
        ethnicity: '',
        region: '',
        province: '',
        eventType: '',
        performanceType: rec?.performanceContext || '',
        instruments: rec?.instrumentIds || [],
        communeId: rec?.communeId,
        ethnicGroupId: rec?.ethnicGroupId,
        ceremonyId: rec?.ceremonyId,
        vocalStyleId: rec?.vocalStyleId,
        musicalScaleId: rec?.musicalScaleId,
      },
      additionalNotes: {
        description: rec?.description || '',
        fieldNotes: sub?.notes || '',
        transcription: rec?.lyricsVietnamese || rec?.lyricsOriginal || '',
      },
      adminInfo: {
        collector: '',
        copyright: '',
        archiveOrg: '',
        catalogId: '',
      },
      gpsLatitude: typeof rec?.gpsLatitude === 'number' ? rec.gpsLatitude : null,
      gpsLongitude: typeof rec?.gpsLongitude === 'number' ? rec.gpsLongitude : null,
      file: {
        name: rec?.audioFileUrl || rec?.videoFileUrl ? 'Tệp tin từ máy chủ' : 'Tệp tin bản thu',
        size: Number(rec?.fileSizeBytes || 0),
        type: rec?.audioFormat || '',
        duration: Number(rec?.durationSeconds || 0),
      },
    };

    await sessionSetItem('editingRecording', JSON.stringify(editingObj));
    navigate('/upload?edit=true');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);

    // 1. Capture info before potential removal from state
    const submissionToDelete = submissions.find((s) => s.id === deleteId);

    // 2. Optimistic UI update: Remove from list immediately
    setSubmissions((prev) => prev.filter((s) => s.id !== deleteId));

    try {
      // 3. Perform deletion call
      await submissionService.deleteSubmission(deleteId);

      // 4. Cleanup files
      if (submissionToDelete?.recording) {
        const rec = submissionToDelete.recording as SubmissionRecordingMedia;
        const urls = [rec.audioUrl, rec.audioFileUrl, rec.audiofileurl, rec.videoFileUrl];
        const supabaseUrls = [
          ...new Set(urls.filter((url): url is string => !!url && url.includes('supabase.co'))),
        ];

        for (const fileUrl of supabaseUrls) {
          deleteFileFromSupabase(fileUrl).catch((e) =>
            console.warn('Background file cleanup skip:', e),
          );
        }
      }

      uiToast.success(notifyLine('Thành công', 'Bản đóng góp đã được xóa.'));
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      const isActuallySuccess = status !== undefined && [200, 201, 204, 400, 404].includes(status);

      if (!isActuallySuccess) {
        console.error('Delete call background error:', err);
        // Rollback only if it's a genuine connection/server error (5xx)
        if (submissionToDelete) {
          setSubmissions((prev) =>
            [submissionToDelete, ...prev].sort(
              (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
            ),
          );
        }
        uiToast.error(notifyLine('Lỗi', 'Không thể xóa bản đóng góp. Vui lòng thử lại sau.'));
      } else {
        // Even if we got a 400/404, the deletion happened, so clean up files now
        if (submissionToDelete?.recording) {
          const rec = submissionToDelete.recording as SubmissionRecordingMedia;
          const urls = [rec.audioUrl, rec.audioFileUrl, rec.audiofileurl, rec.videoFileUrl];
          const supabaseUrls = [
            ...new Set(urls.filter((url): url is string => !!url && url.includes('supabase.co'))),
          ];

          for (const fileUrl of supabaseUrls) {
            deleteFileFromSupabase(fileUrl).catch((e) =>
              console.warn('Background file cleanup catch-path skip:', e),
            );
          }
        }
        uiToast.success(notifyLine('Thành công', 'Bản đóng góp đã được xóa.'));
      }
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const listSection = (
    <ContributionsListSection
      error={error}
      loading={loading}
      submissions={submissions}
      activeStatusTab={activeStatusTab}
      page={page}
      setPage={setPage}
      hasMore={hasMore}
      instrumentNameById={instrumentNameById}
      onOpenDetail={openDetail}
      onRequestDelete={setDeleteId}
    />
  );

  const mainListCardClassName = cn(
    SURFACE_PANEL_GRADIENT,
    'p-6 sm:p-8 min-w-0',
  );

  return (
    <div className="min-h-screen min-w-0 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header — cùng rhythm ExplorePage / UploadPage */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Đóng góp của bạn
          </h1>
          <div className="shrink-0">
            <BackButton />
          </div>
        </div>

        {/* Notice for non-Contributor users — skin cream/secondary như UploadPage */}
        {isNotContributor && (
          <div
            className={cn(
              'mb-6 lg:mb-8 rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/90 to-secondary-50/50 p-4 sm:p-6 lg:p-8 shadow-lg backdrop-blur-sm text-center transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl ring-1 ring-primary-100/40',
            )}
          >
            <h2 className="text-lg sm:text-2xl font-semibold mb-3 sm:mb-4 text-primary-800">
              Bạn cần có tài khoản Người đóng góp để xem trang đóng góp
            </h2>
            <div className="text-neutral-700 text-base mb-4 font-medium">
              Vui lòng đăng nhập bằng tài khoản Người đóng góp để xem và quản lý đóng góp của bạn.
            </div>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel mx-auto"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'auto' });
                openLoginModal({ redirect: '/contributions' });
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
            className={cn(mainListCardClassName, 'opacity-50 pointer-events-none select-none')}
            id={CONTRIBUTIONS_SUBMISSIONS_PANEL_ID}
            role="region"
            aria-label="Danh sách đóng góp (cần đăng nhập người đóng góp)"
            aria-live="polite"
            aria-busy={loading}
          >
            {listSection}
          </div>
        ) : (
          <>
            <ContributionsMobileStatusTabs {...tabFilterProps} />

            <div className="lg:grid lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:gap-8 xl:gap-10 lg:items-start">
              <ContributionsDesktopFilterAside {...tabFilterProps} />

              <main className="min-w-0">
                <ContributionsModerationLegendCollapsible />

                <div
                  className={mainListCardClassName}
                  id={CONTRIBUTIONS_SUBMISSIONS_PANEL_ID}
                  role="tabpanel"
                  aria-label="Danh sách đóng góp đã lọc"
                  aria-live="polite"
                  aria-busy={loading}
                >
                  {listSection}
                </div>
              </main>
            </div>
          </>
        )}
      </div>

      {(detailSubmission || detailLoading) && (
        <ContributionsDetailModal
          detailSubmission={detailSubmission}
          detailLoading={detailLoading}
          onClose={closeDetail}
          instruments={instruments}
          onQuickEdit={handleQuickEdit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa đóng góp"
        message="Bạn có chắc chắn muốn xóa bản đóng góp này?"
        description="Hành động này sẽ xóa vĩnh viễn dữ liệu submission khỏi hệ thống và không thể khôi phục."
        confirmText={isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
        cancelText="Hủy"
        confirmButtonStyle="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95"
      />
    </div>
  );
}
