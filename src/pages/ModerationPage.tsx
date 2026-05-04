import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import AnnotationPanel from '@/components/features/annotation/AnnotationPanel';
import KnowledgeBasePanel from '@/components/features/kb/KnowledgeBasePanel';
import ModerationAITab from '@/components/features/moderation/ModerationAITab';
import ModerationAnnotationTab from '@/components/features/moderation/ModerationAnnotationTab';
import ModerationDetailView from '@/components/features/moderation/ModerationDetailView';
import {
  ModerationExpertTabNav,
  type ExpertTabId,
} from '@/components/features/moderation/ModerationExpertTabNav';
import type { ModerationPortalModal } from '@/components/features/moderation/ModerationModals';
import ModerationPageDialogs from '@/components/features/moderation/ModerationPageDialogs';
import { ModerationPageHeader } from '@/components/features/moderation/ModerationPageHeader';
import ModerationReviewTab from '@/components/features/moderation/ModerationReviewTab';
import { useExpertQueue } from '@/features/moderation/hooks/useExpertQueue';
import { useModerationWizard } from '@/features/moderation/hooks/useModerationWizard';
import { useSubmissionOverlay } from '@/features/moderation/hooks/useSubmissionOverlay';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { isLockedToAnotherExpert } from '@/features/moderation/utils/expertSubmissionLock';
import {
  confirmModerationApprove,
  executeModerationReject,
} from '@/features/moderation/utils/moderationApproveReject';
import { mergeDisplayItem } from '@/features/moderation/utils/moderationDisplayMerge';
import { usePollWhileVisible } from '@/hooks/usePollWhileVisible';
import ForbiddenPage from '@/pages/ForbiddenPage';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';
import { expertWorkflowService } from '@/services/expertWorkflowService';
import { recordingRequestService } from '@/services/recordingRequestService';
import { getLocalRecordingFull, removeLocalRecording } from '@/services/recordingStorage';
import { useAuthStore } from '@/stores/authStore';
import { ModerationStatus } from '@/types';
import { LocalRecording, UserRole } from '@/types';
import { toModerationUiStatus } from '@/types/moderation';
import { uiToast } from '@/uiToast';
import { migrateVideoDataToVideoData } from '@/utils/helpers';

export default function ModerationPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [showVerificationDialog, setShowVerificationDialog] = useState<string | null>(null);
  /** Full recording (with media blobs) for the active dialog only — cleared on close to avoid OOM. */
  const [dialogCurrentRecording, setDialogCurrentRecording] = useState<LocalRecordingMini | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<string>(ModerationStatus.PENDING_REVIEW);
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const { items, setItems, allItems, setAllItems, load, queueStatusMeta } = useExpertQueue({
    userId: user?.id,
    statusFilter,
    dateSort,
  });
  const { claimSubmission, unclaimSubmission, applyOverlayToRecording } = useSubmissionOverlay();
  const [portalModal, setPortalModal] = useState<ModerationPortalModal>(null);
  const [approveExpertNotes, setApproveExpertNotes] = useState('');
  const [rejectConfirmExpertNotes, setRejectConfirmExpertNotes] = useState('');
  const {
    setVerificationStep,
    verificationForms,
    setVerificationForms,
    primeClaimState,
    validateStep,
    allVerificationStepsComplete,
    getCurrentVerificationStep,
    prevVerificationStep,
    nextVerificationStep,
    updateVerificationForm,
  } = useModerationWizard({
    allItems,
    userId: user?.id,
    load,
    onRequireApproveConfirm: (submissionId: string) => {
      setApproveExpertNotes('');
      setPortalModal({ kind: 'approveConfirm', submissionId });
    },
  });
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);
  const [rejectType, setRejectType] = useState<'direct' | 'temporary'>('direct');
  const [rejectNote, setRejectNote] = useState('');
  const [activeTab, setActiveTab] = useState<ExpertTabId>('review');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItemFull, setSelectedItemFull] = useState<LocalRecordingMini | null>(null);
  const [selectedItemLoading, setSelectedItemLoading] = useState(false);
  /** T5: working expert notes per submission (draft); Phase 1 → localStorage; Phase 2 → same draft + audit on decision. */
  const [expertReviewNotesDraft, setExpertReviewNotesDraft] = useState<Record<string, string>>({});
  const expertNotesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Announces queue length changes (e.g. after approve/reject removes an item from the filtered list). */
  const [moderationA11yMessage, setModerationA11yMessage] = useState('');
  const prevItemsLengthRef = useRef<number | null>(null);
  const verificationDialogPanelRef = useRef<HTMLDivElement>(null);
  const filteredQueueItems = useMemo(() => {
    const q = queueSearchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const rowTitle = `${it.basicInfo?.title || it.title || ''}`.toLowerCase();
      const uploader = `${it.uploader?.username || ''}`.toLowerCase();
      const ethnicity = `${it.culturalContext?.ethnicity || ''}`.toLowerCase();
      const province = `${it.culturalContext?.province || ''}`.toLowerCase();
      const eventType = `${it.culturalContext?.eventType || ''}`.toLowerCase();
      const instruments = (it.culturalContext?.instruments || []).join(' ').toLowerCase();
      const haystack = `${rowTitle} ${uploader} ${ethnicity} ${province} ${eventType} ${instruments}`;
      return haystack.includes(q);
    });
  }, [items, queueSearchQuery]);

  const handleExpertReviewNotesChange = useCallback((submissionId: string, text: string) => {
    setExpertReviewNotesDraft((prev) => ({ ...prev, [submissionId]: text }));
    if (expertNotesDebounceRef.current) clearTimeout(expertNotesDebounceRef.current);
    expertNotesDebounceRef.current = setTimeout(() => {
      void expertWorkflowService.setExpertReviewNotes(submissionId, text);
    }, 450);
  }, []);

  const cancelVerification = useCallback((id?: string) => {
    if (!id) return;
    setShowVerificationDialog(null);
  }, []);

  const closePortalModal = useCallback((previous: NonNullable<ModerationPortalModal>) => {
    setPortalModal(null);
    if (previous.kind === 'approveConfirm') setApproveExpertNotes('');
    if (previous.kind === 'rejectConfirm') setRejectConfirmExpertNotes('');
  }, []);

  useEffect(() => {
    const n = items.length;
    if (prevItemsLengthRef.current === null) {
      prevItemsLengthRef.current = n;
      return;
    }
    if (prevItemsLengthRef.current === n) return;
    const prev = prevItemsLengthRef.current;
    prevItemsLengthRef.current = n;
    setModerationA11yMessage(
      n < prev
        ? `Hàng đợi đã cập nhật sau khi xử lý bản thu. Còn ${n} bản thu trong danh sách hiện tại.`
        : `Hàng đợi đã cập nhật. Có ${n} bản thu trong danh sách hiện tại.`,
    );
  }, [items.length]);

  useEffect(() => {
    if (!showVerificationDialog) return;
    const id = requestAnimationFrame(() => {
      verificationDialogPanelRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [showVerificationDialog]);

  usePollWhileVisible(() => void load(), 8000, [load]);

  useEffect(() => {
    const sid = showVerificationDialog;
    if (!sid) return;
    let cancelled = false;
    void (async () => {
      const stored = await expertWorkflowService.getExpertReviewNotes(sid);
      if (cancelled) return;
      setExpertReviewNotesDraft((prev) => ({
        ...prev,
        [sid]: prev[sid] !== undefined && prev[sid] !== '' ? prev[sid] : stored || '',
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [showVerificationDialog]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void (async () => {
      const stored = await expertWorkflowService.getExpertReviewNotes(selectedId);
      if (cancelled) return;
      setExpertReviewNotesDraft((prev) => {
        if (prev[selectedId] !== undefined && prev[selectedId] !== '') return prev;
        return { ...prev, [selectedId]: stored || '' };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const stillVisible = filteredQueueItems.some((it) => it.id === selectedId);
    if (stillVisible) return;
    setSelectedId(filteredQueueItems[0]?.id ?? null);
  }, [selectedId, filteredQueueItems]);


  // Clear dialog full recording when dialog closes to release media blobs and avoid OOM
  useEffect(() => {
    if (!showVerificationDialog) setDialogCurrentRecording(null);
  }, [showVerificationDialog]);

  // Load full recording for right-panel preview when selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setSelectedItemFull(null);
      setSelectedItemLoading(false);
      return;
    }
    setSelectedItemLoading(true);
    let cancelled = false;
    void (async () => {
      try {
        const raw = await getLocalRecordingFull(selectedId);
        if (cancelled || !raw) return;
        const overlaid = await applyOverlayToRecording(raw as LocalRecording);
        if (cancelled || !overlaid) return;
        const migrated = migrateVideoDataToVideoData([overlaid as LocalRecordingMini])[0];
        if (migrated) setSelectedItemFull(migrated);
        else setSelectedItemFull(null);
      } catch {
        if (!cancelled) setSelectedItemFull(null);
      } finally {
        if (!cancelled) setSelectedItemLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, applyOverlayToRecording]);

  // Load full recording when dialog opens (single-record read → no OOM)
  useEffect(() => {
    if (!showVerificationDialog) return;
    let cancelled = false;
    void (async () => {
      try {
        const raw = await getLocalRecordingFull(showVerificationDialog);
        if (cancelled || !raw) return;
        const overlaid = await applyOverlayToRecording(raw as LocalRecording);
        if (cancelled || !overlaid) return;
        const migrated = migrateVideoDataToVideoData([overlaid as LocalRecordingMini])[0];

        if (migrated) {
          // Keep full recording (with blobs) only in dialog state for playback; never put blobs in allItems
          setDialogCurrentRecording(migrated);
          // Update allItems with metadata only (no audioData/videoData) so list stays light.
          // Phase 1 Spike: moderation (claim / verification) comes from expertWorkflowService overlay + API base.
          const metaOnly = { ...(migrated as LocalRecordingMini) };
          delete (metaOnly as { audioData?: unknown }).audioData;
          delete (metaOnly as { videoData?: unknown }).videoData;
          setAllItems((prev) => {
            const idx = prev.findIndex((it) => it.id === showVerificationDialog);
            if (idx >= 0) {
              return prev.map((it) =>
                it.id === showVerificationDialog
                  ? { ...metaOnly, moderation: migrated.moderation }
                  : it,
              );
            }
            return [...prev, { ...metaOnly, moderation: migrated.moderation }];
          });

          // Only load verification data from item if not already in state (to avoid overwriting user input)
          setVerificationForms((prev) => {
            const existing = prev[showVerificationDialog];
            // If we already have data in state, don't overwrite it
            if (existing) {
              return prev;
            }
            // Otherwise, load from item if available
            if (
              migrated.moderation &&
              'verificationData' in migrated.moderation &&
              migrated.moderation.verificationData !== undefined
            ) {
              return {
                ...prev,
                [showVerificationDialog]: migrated.moderation
                  .verificationData as ModerationVerificationData,
              };
            }
            return prev;
          });
          // Always sync verification step state when dialog opens
          const savedStep =
            migrated.moderation &&
              'verificationStep' in migrated.moderation &&
              migrated.moderation.verificationStep !== undefined
              ? migrated.moderation.verificationStep
              : 1;
          setVerificationStep((prev) => {
            if (prev[showVerificationDialog] !== savedStep) {
              return {
                ...prev,
                [showVerificationDialog]: savedStep as number,
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Error loading item for verification dialog:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    showVerificationDialog,
    applyOverlayToRecording,
    setAllItems,
    setVerificationForms,
    setVerificationStep,
  ]);

  // Disable body scroll when any dialog is open
  useEffect(() => {
    const hasOpenDialog = !!(
      showVerificationDialog ||
      showRejectDialog ||
      portalModal
    );

    if (hasOpenDialog) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      // Cleanup
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [showVerificationDialog, showRejectDialog, portalModal]);

  // Handle ESC key to close dialogs
  useEffect(() => {
    const hasOpenDialog = !!(
      showVerificationDialog ||
      showRejectDialog ||
      portalModal
    );

    if (!hasOpenDialog) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      // Close only the topmost overlay (highest z-index) so nested flows stay predictable.
      if (portalModal) {
        closePortalModal(portalModal);
        return;
      }
      if (showRejectDialog) {
        setShowRejectDialog(null);
        setRejectNote('');
        setRejectType('direct');
        return;
      }
      if (showVerificationDialog) {
        cancelVerification(showVerificationDialog);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showVerificationDialog, showRejectDialog, portalModal, closePortalModal, cancelVerification]);

  /** Phase 1 PLAN-expert-review-redesign: assign only — PUT assign-reviewer-submission, không mở wizard. */
  const assignOnly = useCallback(
    async (id?: string) => {
      if (!id || !user?.id) return;
      if (user.role !== UserRole.EXPERT || !user.isEmailConfirmed || !user.isActive) return;
      const it = allItems.find((x) => x.id === id);
      if (!it) return;
      if (isLockedToAnotherExpert(it.moderation, user.id)) {
        uiToast.warning(
          'Bản thu này đã được chuyên gia khác nhận hoặc đã được gán trên máy chủ. Vui lòng tải lại hàng đợi.',
        );
        void load();
        return;
      }
      const claimResult = await claimSubmission(id, user.id, user.username ?? '');
      if (!claimResult.success) {
        if (claimResult.httpStatus === 409) {
          uiToast.warning('Bản thu này đã được chuyên gia khác nhận. Vui lòng tải lại hàng đợi.');
        } else {
          const detail = claimResult.errorMessage ? `: ${claimResult.errorMessage}` : '';
          uiToast.error(`Không thể nhận bản thu lúc này${detail}. Vui lòng thử lại.`);
        }
        await load();
        return;
      }
      uiToast.success('Đã nhận bài thành công. Bạn có thể bắt đầu kiểm duyệt khi sẵn sàng.');
      await load();
    },
    [user, allItems, claimSubmission, load],
  );

  const openWizard = useCallback(
    (id?: string) => {
      if (!id || !user?.id) return;
      if (user.role !== UserRole.EXPERT || !user.isEmailConfirmed || !user.isActive) return;
      const it = allItems.find((x) => x.id === id);
      if (!it) return;
      const claimedByMe =
        toModerationUiStatus(it.moderation?.status) === ModerationStatus.IN_REVIEW &&
        (it.moderation?.claimedBy === user.id || it.moderation?.reviewerId === user.id);
      if (!claimedByMe) {
        uiToast.warning('Bạn cần nhận bài trước khi mở kiểm duyệt.');
        return;
      }
      primeClaimState(id, it.moderation?.verificationData as ModerationVerificationData | undefined);
      setShowVerificationDialog(id);
    },
    [user, allItems, primeClaimState],
  );

  /** Luôn mở modal xác nhận trước khi unassign. */
  const unclaim = useCallback((id?: string) => {
    if (!id) return;
    setPortalModal({ kind: 'unclaim', submissionId: id });
  }, []);

  const openDeleteRecordingModal = useCallback((id: string) => {
    setPortalModal({ kind: 'delete', submissionId: id });
  }, []);

  const unclaimFromWizard = useCallback(() => {
    if (!showVerificationDialog) return;
    unclaim(showVerificationDialog);
  }, [showVerificationDialog, unclaim]);

  if (!user || user.role !== UserRole.EXPERT || !user.isEmailConfirmed || !user.isActive) {
    return (
      <ForbiddenPage message="Bạn cần tài khoản Chuyên gia để truy cập trang kiểm duyệt bản thu." />
    );
  }

  const handleConfirmApprove = async () => {
    if (portalModal?.kind !== 'approveConfirm') return;
    if (!user?.id) return;
    await confirmModerationApprove({
      submissionId: portalModal.submissionId,
      user: { id: user.id, username: user.username },
      allItems,
      verificationForms,
      approveExpertNotes,
      expertReviewNotesDraft,
      expertNotesDebounceRef,
      statusFilter,
      dateSort,
      setAllItems,
      setItems,
      setVerificationStep,
      setVerificationForms,
      setShowVerificationDialog,
      setPortalModal,
      setApproveExpertNotes,
      setExpertReviewNotesDraft,
      selectedId,
      setSelectedId,
      load,
    });
  };

  const handleConfirmReject = async () => {
    if (portalModal?.kind !== 'rejectConfirm') return;
    const id = portalModal.submissionId;
    if (!user?.id) return;
    const ok = await executeModerationReject({
      id,
      user: { id: user.id, username: user.username },
      type: rejectType,
      note: rejectNote,
      confirmExpertNotes: rejectConfirmExpertNotes,
      allItems,
      expertReviewNotesDraft,
      expertNotesDebounceRef,
      statusFilter,
      dateSort,
      setAllItems,
      setItems,
      setShowRejectDialog,
      setRejectNote,
      setRejectType,
      setExpertReviewNotesDraft,
      load,
    });
    if (!ok) return;
    if (showVerificationDialog === id) setShowVerificationDialog(null);
    setShowRejectDialog(null);
    setPortalModal(null);
    setRejectNote('');
    setRejectConfirmExpertNotes('');
    setRejectType('direct');
  };

  const handleConfirmUnclaim = async () => {
    if (portalModal?.kind !== 'unclaim') return;
    const id = portalModal.submissionId;
    const ok = await unclaimSubmission(id);
    if (!ok) {
      uiToast.error('Không thể hủy nhận bài lúc này. Vui lòng thử lại.');
      return;
    }
    // Cancel verification - return to PENDING_REVIEW and unclaim
    setVerificationStep((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    setVerificationForms((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    setShowVerificationDialog(null);
    setPortalModal(null);
    uiToast.success('Đã hủy nhận bài. Bản thu đã trở về hàng đợi chờ kiểm duyệt.');
    await load();
  };

  const handleConfirmDelete = async () => {
    if (portalModal?.kind !== 'delete') return;
    const id = portalModal.submissionId;
    const toDelete = allItems.find((it) => it.id === id);
    if (toModerationUiStatus(toDelete?.moderation?.status) === ModerationStatus.APPROVED) {
      uiToast.error('Không thể xóa bản thu đã được duyệt.');
      setPortalModal(null);
      return;
    }
    const recordingTitle = toDelete?.basicInfo?.title || toDelete?.title || 'Không có tiêu đề';
    try {
      await removeLocalRecording(id);
      // Phase 1 Spike: drop local expert overlay so stale moderation cannot reattach.
      await expertWorkflowService.removeSubmissionOverlay(id);
      await recordingRequestService.addNotification({
        type: 'recording_deleted',
        title: 'Bản thu đã được Chuyên gia xóa khỏi hệ thống',
        body: `Bản thu "${recordingTitle}" đã được xóa khỏi hệ thống bởi Chuyên gia.`,
        forRoles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.EXPERT, UserRole.RESEARCHER],
        recordingId: id,
      });
      await load();
      if (selectedId === id) setSelectedId(null);
      uiToast.success('moderation.delete.success');
    } catch {
      uiToast.error('moderation.delete.failed');
    } finally {
      setPortalModal(null);
    }
  };

  return (
    <div className="min-h-screen min-w-0 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {moderationA11yMessage}
        </div>
        <ModerationPageHeader />

        {/* Tabs — VietTune UI */}
        <div className="rounded-3xl overflow-hidden shadow-lg ring-1 ring-amber-200/70 backdrop-blur-sm mb-6 sm:mb-8 transition-all duration-300 min-w-0 overflow-x-hidden bg-white/80">
          <ModerationExpertTabNav activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab: Xem duyệt bản thu */}
          {activeTab === 'review' && (
            <ModerationReviewTab
              queueStatusMeta={queueStatusMeta}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              dateSort={dateSort}
              onDateSortChange={setDateSort}
              searchQuery={queueSearchQuery}
              onSearchQueryChange={setQueueSearchQuery}
              items={filteredQueueItems}
              selectedId={selectedId}
              currentUserId={user.id}
              onSelect={setSelectedId}
              isDetailLoading={selectedItemLoading}
              detailContent={(() => {
                const listItem = allItems.find((i) => i.id === selectedId);
                const item = mergeDisplayItem(listItem, selectedItemFull);
                if (!item) return null;
                return (
                  <ModerationDetailView
                    item={item}
                    selectedItemFull={selectedItemFull}
                    currentUserId={user?.id}
                    userRole={user.role}
                    expertReviewNotesDraft={item.id ? (expertReviewNotesDraft[item.id] ?? '') : ''}
                    onExpertReviewNotesChange={handleExpertReviewNotesChange}
                    onAssign={assignOnly}
                    onUnclaim={unclaim}
                    onOpenWizard={openWizard}
                    onRequestDelete={openDeleteRecordingModal}
                  />
                );
              })()}
            />
          )}

          {/* Tab: Giám sát AI — review câu trả lời AI và báo lỗi */}
          {activeTab === 'ai' && (
            <ModerationAITab
              onOpenRecording={(recordingId) =>
                navigate(`/recordings/${recordingId}`, { state: { from: '/moderation' } })
              }
              currentUserId={user?.id}
            />
          )}

          {/* Tab: Kho tri thức */}
          {activeTab === 'knowledge' && (
            <div
              id="moderation-panel-knowledge"
              role="tabpanel"
              aria-labelledby="moderation-tab-knowledge"
              className="p-4 sm:p-6"
            >
              <KnowledgeBasePanel embedded />
            </div>
          )}

          {/* Tab: Chú thích học thuật */}
          {activeTab === 'annotation' && (
            <ModerationAnnotationTab
              queueStatusMeta={queueStatusMeta}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              dateSort={dateSort}
              onDateSortChange={setDateSort}
              searchQuery={queueSearchQuery}
              onSearchQueryChange={setQueueSearchQuery}
              items={filteredQueueItems}
              selectedId={selectedId}
              onSelect={setSelectedId}
              isDetailLoading={selectedItemLoading}
              detailContent={(() => {
                const listItem = allItems.find((i) => i.id === selectedId);
                const item = mergeDisplayItem(listItem, selectedItemFull);
                const recordingId = item?.id ?? selectedId;
                if (!item || !recordingId) return null;
                return (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
                      <h2 className="text-lg font-semibold text-neutral-900">
                        {item.basicInfo?.title || item.title || 'Không có tiêu đề'}
                      </h2>
                      <p className="mt-1 text-xs text-neutral-600">
                        Chọn loại chú thích, bổ sung giải thích học thuật và mốc thời gian nếu cần.
                      </p>
                    </div>
                    <AnnotationPanel
                      recordingId={recordingId}
                      expertId={user.id}
                      canEdit={user.role === UserRole.EXPERT || user.role === UserRole.ADMIN}
                    />
                  </div>
                );
              })()}
            />
          )}
        </div>

        <ModerationPageDialogs
          showVerificationDialog={showVerificationDialog}
          dialogCurrentRecording={dialogCurrentRecording}
          allItems={allItems}
          verificationDialogPanelRef={verificationDialogPanelRef}
          expertReviewNotesDraft={expertReviewNotesDraft}
          verificationForms={verificationForms}
          onExpertReviewNotesChange={handleExpertReviewNotesChange}
          onCancelVerification={cancelVerification}
          onUnclaimFromWizard={unclaimFromWizard}
          onOpenRejectFromWizard={() => {
            if (showVerificationDialog) setShowRejectDialog(showVerificationDialog);
          }}
          getCurrentVerificationStep={getCurrentVerificationStep}
          prevVerificationStep={prevVerificationStep}
          nextVerificationStep={nextVerificationStep}
          validateStep={validateStep}
          allVerificationStepsComplete={allVerificationStepsComplete}
          updateVerificationForm={updateVerificationForm}
          showRejectDialog={showRejectDialog}
          rejectType={rejectType}
          onRejectTypeChange={setRejectType}
          rejectNote={rejectNote}
          onRejectNoteChange={setRejectNote}
          onRejectCancel={() => {
            setShowRejectDialog(null);
            setRejectNote('');
            setRejectType('direct');
          }}
          onRejectFormConfirm={() => {
            if (!showRejectDialog) return;
            if (!rejectNote.trim()) return;
            setRejectConfirmExpertNotes(rejectNote);
            setPortalModal({ kind: 'rejectConfirm', submissionId: showRejectDialog });
          }}
          portalModal={portalModal}
          onDismissPortalModal={closePortalModal}
          approveExpertNotes={approveExpertNotes}
          onApproveExpertNotesChange={setApproveExpertNotes}
          rejectConfirmExpertNotes={rejectConfirmExpertNotes}
          onRejectConfirmExpertNotesChange={setRejectConfirmExpertNotes}
          deleteRecordingTitle={
            portalModal?.kind === 'delete'
              ? (() => {
                  const t = allItems.find((it) => it.id === portalModal.submissionId);
                  return t?.basicInfo?.title || t?.title || 'Không có tiêu đề';
                })()
              : ''
          }
          onConfirmUnclaim={handleConfirmUnclaim}
          onConfirmApprove={handleConfirmApprove}
          onConfirmReject={handleConfirmReject}
          onConfirmDelete={handleConfirmDelete}
        />
      </div>
    </div>
  );
}
