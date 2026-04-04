import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Region, RecordingType, RecordingQuality, VerificationStatus, Recording, UserRole, RecordingMetadata, Instrument, LocalRecording } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { ModerationStatus } from "@/types";
import { isYouTubeUrl } from "@/utils/youtube";
import { migrateVideoDataToVideoData, formatDateTime } from "@/utils/helpers";
import { buildTagsFromLocal } from "@/utils/recordingTags";
import { createPortal } from "react-dom";
import { AlertCircle, X, FileText, MessageSquare, BookOpen, Music, User as UserIcon, Trash2, Flag } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import ForbiddenPage from "@/pages/ForbiddenPage";
import { getLocalRecordingFull, removeLocalRecording } from "@/services/recordingStorage";
import { expertWorkflowService } from "@/services/expertWorkflowService";
import type { ModerationVerificationData } from "@/services/expertWorkflowService";
import type { LocalRecordingMini } from "@/pages/moderation/localRecordingQueue.types";
import { projectModerationLists } from "@/pages/moderation/expertQueueProjection";
import { useExpertQueue } from "@/pages/moderation/useExpertQueue";
import { useSubmissionOverlay } from "@/pages/moderation/useSubmissionOverlay";
import { useModerationWizard } from "@/pages/moderation/useModerationWizard";
import { ModerationQueueSidebar } from "@/components/features/moderation/ModerationQueueSidebar";
import { ModerationClaimActions } from "@/components/features/moderation/ModerationClaimActions";
import { ModerationDetailMedia } from "@/components/features/moderation/ModerationDetailMedia";
import { ModerationSubmissionDetailPanels } from "@/components/features/moderation/ModerationSubmissionDetailPanels";
import { ModerationVerificationWizardDialog } from "@/components/features/moderation/ModerationVerificationWizardDialog";
import { ModerationRejectReasonFormPortal } from "@/components/features/moderation/ModerationRejectReasonForm";
import { recordingRequestService } from "@/services/recordingRequestService";
import { getItemAsync, setItem } from "@/services/storageService";
import { uiToast } from "@/uiToast";
export const AI_RESPONSES_REVIEW_KEY = "viettune_ai_responses_review";

export interface AiResponseForReview {
    id: string;
    question: string;
    answer: string;
    source?: string;
    citations?: Array<{ recordingId: string; label: string }>;
    createdAt: string;
    flagged?: boolean;
    flagNote?: string;
    flaggedAt?: string;
}

function cleanMetadataText(value?: string | null, fallback = "—"): string {
    const raw = String(value ?? "").trim();
    if (!raw) return fallback;
    if (raw.toUpperCase().startsWith("ID:")) return fallback;
    return raw;
}

function cleanInstrumentList(values?: string[]): string {
    const cleaned = (values ?? [])
        .map((v) => cleanMetadataText(v, ""))
        .filter(Boolean);
    return cleaned.length > 0 ? cleaned.join(", ") : "—";
}

function isPlaceholderField(value?: string | null): boolean {
    const raw = String(value ?? "").trim().toLowerCase();
    return raw === "" || raw === "—" || raw === "-" || raw === "không xác định" || raw === "không có tiêu đề" || raw === "untitled";
}

function pickNonEmptyText(...values: Array<string | null | undefined>): string | undefined {
    for (const value of values) {
        const raw = String(value ?? "").trim();
        if (!raw) continue;
        if (raw.toUpperCase().startsWith("ID:")) continue;
        const lowered = raw.toLowerCase();
        if (lowered === "không có tiêu đề" || lowered === "untitled") continue;
        return raw;
    }
    return undefined;
}

function mergeDisplayItem(
    base?: LocalRecordingMini | null,
    detail?: LocalRecordingMini | null,
): LocalRecordingMini | null {
    if (!base && !detail) return null;
    if (!base) return detail ?? null;
    if (!detail) return base;

    return {
        ...base,
        ...detail,
        basicInfo: {
            ...base.basicInfo,
            ...detail.basicInfo,
            title: pickNonEmptyText(detail.basicInfo?.title, base.basicInfo?.title, detail.title, base.title),
            artist: pickNonEmptyText(detail.basicInfo?.artist, base.basicInfo?.artist),
        },
        uploader: {
            ...(base.uploader ?? {}),
            ...(detail.uploader ?? {}),
            username: pickNonEmptyText(
                (detail.uploader as { username?: string } | undefined)?.username,
                (base.uploader as { username?: string } | undefined)?.username,
            ),
        },
        culturalContext: {
            ...(base.culturalContext ?? {}),
            ...(detail.culturalContext ?? {}),
            ethnicity: pickNonEmptyText(detail.culturalContext?.ethnicity, base.culturalContext?.ethnicity),
            region: pickNonEmptyText(detail.culturalContext?.region, base.culturalContext?.region),
            province: pickNonEmptyText(detail.culturalContext?.province, base.culturalContext?.province),
            eventType: pickNonEmptyText(detail.culturalContext?.eventType, base.culturalContext?.eventType),
            instruments: (() => {
                const detailList = (detail.culturalContext?.instruments ?? [])
                    .map((v) => String(v ?? "").trim())
                    .filter((v) => v && !v.toUpperCase().startsWith("ID:"));
                if (detailList.length > 0) return detailList;
                const baseList = (base.culturalContext?.instruments ?? [])
                    .map((v) => String(v ?? "").trim())
                    .filter((v) => v && !v.toUpperCase().startsWith("ID:"));
                return baseList;
            })(),
        },
        uploadedAt: pickNonEmptyText(detail.uploadedAt, base.uploadedAt),
    };
}

// Extended Recording type that may include original local data
type RecordingWithLocalData = Recording & {
    _originalLocalData?: LocalRecordingMini & {
        culturalContext?: {
            region?: string;
        };
    };
};

export default function ModerationPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [showVerificationDialog, setShowVerificationDialog] = useState<string | null>(null);
    /** Full recording (with media blobs) for the active dialog only — cleared on close to avoid OOM. */
    const [dialogCurrentRecording, setDialogCurrentRecording] = useState<LocalRecordingMini | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>(ModerationStatus.PENDING_REVIEW);
    const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
    const [queueSearchQuery, setQueueSearchQuery] = useState("");
    const { items, setItems, allItems, setAllItems, load, queueStatusMeta } = useExpertQueue({
        userId: user?.id,
        statusFilter,
        dateSort,
    });
    const { claimSubmission, unclaimSubmission, applyOverlayToRecording } = useSubmissionOverlay();
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
            setApproveExpertNotes("");
            setShowApproveConfirmDialog(submissionId);
        },
    });
    const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);
    const [rejectType, setRejectType] = useState<"direct" | "temporary">("direct");
    const [rejectNote, setRejectNote] = useState("");
    const [showUnclaimDialog, setShowUnclaimDialog] = useState<string | null>(null);
    const [showApproveConfirmDialog, setShowApproveConfirmDialog] = useState<string | null>(null);
    const [showRejectConfirmDialog, setShowRejectConfirmDialog] = useState<string | null>(null);
    const [showRejectNoteWarningDialog, setShowRejectNoteWarningDialog] = useState<boolean>(false);
    const [approveExpertNotes, setApproveExpertNotes] = useState("");
    const [rejectConfirmExpertNotes, setRejectConfirmExpertNotes] = useState("");
    const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);
    type ExpertTabId = "review" | "ai" | "knowledge";
    const [activeTab, setActiveTab] = useState<ExpertTabId>("review");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedItemFull, setSelectedItemFull] = useState<LocalRecordingMini | null>(null);
    const [aiResponses, setAiResponses] = useState<AiResponseForReview[]>([]);
    const [aiResponsesLoaded, setAiResponsesLoaded] = useState(false);
    const [flagNoteId, setFlagNoteId] = useState<string | null>(null);
    const [flagNoteValue, setFlagNoteValue] = useState("");
    /** T5: working expert notes per submission (draft); Phase 1 → localStorage; Phase 2 → same draft + audit on decision. */
    const [expertReviewNotesDraft, setExpertReviewNotesDraft] = useState<Record<string, string>>({});
    const expertNotesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Announces queue length changes (e.g. after approve/reject removes an item from the filtered list). */
    const [moderationA11yMessage, setModerationA11yMessage] = useState("");
    const prevItemsLengthRef = useRef<number | null>(null);
    const verificationDialogPanelRef = useRef<HTMLDivElement>(null);
    const filteredQueueItems = useMemo(() => {
        const q = queueSearchQuery.trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) => {
            const rowTitle = `${it.basicInfo?.title || it.title || ""}`.toLowerCase();
            const uploader = `${it.uploader?.username || ""}`.toLowerCase();
            const ethnicity = `${it.culturalContext?.ethnicity || ""}`.toLowerCase();
            const province = `${it.culturalContext?.province || ""}`.toLowerCase();
            const eventType = `${it.culturalContext?.eventType || ""}`.toLowerCase();
            const instruments = (it.culturalContext?.instruments || []).join(" ").toLowerCase();
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

    useEffect(() => {
        load();
        const interval = setInterval(load, 8000); // avoid excessive polling while keeping queue updated
        return () => clearInterval(interval);
    }, [load]);

    useEffect(() => {
        const sid = showVerificationDialog;
        if (!sid) return;
        let cancelled = false;
        (async () => {
            const stored = await expertWorkflowService.getExpertReviewNotes(sid);
            if (cancelled) return;
            setExpertReviewNotesDraft((prev) => ({
                ...prev,
                [sid]: prev[sid] !== undefined && prev[sid] !== "" ? prev[sid] : stored || "",
            }));
        })();
        return () => {
            cancelled = true;
        };
    }, [showVerificationDialog]);

    useEffect(() => {
        if (!selectedId) return;
        let cancelled = false;
        (async () => {
            const stored = await expertWorkflowService.getExpertReviewNotes(selectedId);
            if (cancelled) return;
            setExpertReviewNotesDraft((prev) => {
                if (prev[selectedId] !== undefined && prev[selectedId] !== "") return prev;
                return { ...prev, [selectedId]: stored || "" };
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

    // Load AI responses for review (tab "Giám sát phản hồi AI")
    useEffect(() => {
        if (activeTab !== "ai") return;
        let cancelled = false;
        (async () => {
            try {
                const raw = await getItemAsync(AI_RESPONSES_REVIEW_KEY);
                const list: AiResponseForReview[] = raw ? JSON.parse(raw) : [];
                if (!cancelled) {
                    setAiResponses(Array.isArray(list) ? list : []);
                    setAiResponsesLoaded(true);
                }
            } catch {
                if (!cancelled) {
                    setAiResponses([]);
                    setAiResponsesLoaded(true);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [activeTab]);

    const handleFlagAiResponse = useCallback((id: string, flagged: boolean, note?: string) => {
        setAiResponses((prev) => {
            const next = prev.map((r) =>
                r.id === id
                    ? { ...r, flagged, flagNote: note ?? r.flagNote, flaggedAt: flagged ? new Date().toISOString() : undefined }
                    : r
            );
            void setItem(AI_RESPONSES_REVIEW_KEY, JSON.stringify(next));
            return next;
        });
        setFlagNoteId(null);
        setFlagNoteValue("");
    }, []);

    // Clear dialog full recording when dialog closes to release media blobs and avoid OOM
    useEffect(() => {
        if (!showVerificationDialog) setDialogCurrentRecording(null);
    }, [showVerificationDialog]);

    // Load full recording for right-panel preview when selectedId changes
    useEffect(() => {
        if (!selectedId) {
            setSelectedItemFull(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const raw = await getLocalRecordingFull(selectedId);
                if (cancelled || !raw) return;
                const overlaid = await applyOverlayToRecording(raw as LocalRecording);
                if (cancelled || !overlaid) return;
                const migrated = migrateVideoDataToVideoData([overlaid as LocalRecordingMini])[0];
                if (migrated) setSelectedItemFull(migrated);
            } catch {
                setSelectedItemFull(null);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    // Load full recording when dialog opens (single-record read → no OOM)
    useEffect(() => {
        if (!showVerificationDialog) return;
        let cancelled = false;
        (async () => {
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
                    setAllItems(prev => {
                        const idx = prev.findIndex(it => it.id === showVerificationDialog);
                        if (idx >= 0) {
                            return prev.map(it =>
                                it.id === showVerificationDialog
                                    ? { ...metaOnly, moderation: migrated.moderation }
                                    : it
                            );
                        }
                        return [...prev, { ...metaOnly, moderation: migrated.moderation }];
                    });

                    // Only load verification data from item if not already in state (to avoid overwriting user input)
                    setVerificationForms(prev => {
                        const existing = prev[showVerificationDialog];
                        // If we already have data in state, don't overwrite it
                        if (existing) {
                            return prev;
                        }
                        // Otherwise, load from item if available
                        if (
                            migrated.moderation &&
                            "verificationData" in migrated.moderation &&
                            migrated.moderation.verificationData !== undefined
                        ) {
                            return {
                                ...prev,
                                [showVerificationDialog]: migrated.moderation.verificationData as ModerationVerificationData,
                            };
                        }
                        return prev;
                    });
                    // Always sync verification step state when dialog opens
                    const savedStep =
                        migrated.moderation && "verificationStep" in migrated.moderation && migrated.moderation.verificationStep !== undefined
                            ? migrated.moderation.verificationStep
                            : 1;
                    setVerificationStep(prev => {
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
                console.error("Error loading item for verification dialog:", err);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showVerificationDialog]);

    // Disable body scroll when any dialog is open
    useEffect(() => {
        const hasOpenDialog = !!(
            showVerificationDialog ||
            showRejectDialog ||
            showUnclaimDialog ||
            showApproveConfirmDialog ||
            showRejectConfirmDialog ||
            showRejectNoteWarningDialog ||
            showDeleteConfirmId
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
    }, [showVerificationDialog, showRejectDialog, showUnclaimDialog, showApproveConfirmDialog, showRejectConfirmDialog, showRejectNoteWarningDialog, showDeleteConfirmId]);

    // Handle ESC key to close dialogs
    useEffect(() => {
        const hasOpenDialog = !!(
            showVerificationDialog ||
            showRejectDialog ||
            showUnclaimDialog ||
            showApproveConfirmDialog ||
            showRejectConfirmDialog ||
            showRejectNoteWarningDialog ||
            showDeleteConfirmId
        );

        if (!hasOpenDialog) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            // Close only the topmost overlay (highest z-index) so nested flows stay predictable.
            if (showDeleteConfirmId) {
                setShowDeleteConfirmId(null);
                return;
            }
            if (showRejectNoteWarningDialog) {
                setShowRejectNoteWarningDialog(false);
                return;
            }
            if (showRejectConfirmDialog) {
                setShowRejectConfirmDialog(null);
                setRejectConfirmExpertNotes("");
                return;
            }
            if (showApproveConfirmDialog) {
                setShowApproveConfirmDialog(null);
                setApproveExpertNotes("");
                return;
            }
            if (showUnclaimDialog) {
                setShowUnclaimDialog(null);
                return;
            }
            if (showRejectDialog) {
                setShowRejectDialog(null);
                setRejectNote("");
                setRejectType("direct");
                return;
            }
            if (showVerificationDialog) {
                cancelVerification(showVerificationDialog);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [
        showVerificationDialog,
        showRejectDialog,
        showUnclaimDialog,
        showApproveConfirmDialog,
        showRejectConfirmDialog,
        showRejectNoteWarningDialog,
        showDeleteConfirmId,
        cancelVerification,
    ]);

    if (!user || user.role !== UserRole.EXPERT || !user.isEmailConfirmed || !user.isActive) {
        return (
            <ForbiddenPage message="Bạn cần tài khoản Chuyên gia để truy cập trang kiểm duyệt bản thu." />
        );
    }

    const claim = async (id?: string) => {
        if (!id || !user?.id) return;
        const it = allItems.find((x) => x.id === id);
        if (!it) return;
        if (
            it.moderation?.status === ModerationStatus.IN_REVIEW &&
            it.moderation?.claimedBy &&
            it.moderation.claimedBy !== user.id
        ) {
            return;
        }
        // Phase 1 Spike: persist claim via expertWorkflowService (local overlay), not PUT /Recording.
        const claimResult = await claimSubmission(id, user.id, user.username ?? "");
        if (!claimResult.success) return;
        primeClaimState(id, it.moderation?.verificationData as ModerationVerificationData | undefined);
        await load();
        setShowVerificationDialog(id);
    };

    const handleConfirmApprove = async () => {
        const id = showApproveConfirmDialog;
        if (!id || !user?.id) return;
        const it = allItems.find((x) => x.id === id);
        if (it?.moderation?.claimedBy !== user.id) return;
        const currentFormData = verificationForms[id] || {};
        const verificationData = {
            ...(it.moderation?.verificationData || {}),
            ...currentFormData,
        } as ModerationVerificationData;

        const trimmedApproveNotes = approveExpertNotes.trim();
        if (expertNotesDebounceRef.current) {
            clearTimeout(expertNotesDebounceRef.current);
            expertNotesDebounceRef.current = null;
        }
        await expertWorkflowService.setExpertReviewNotes(id, expertReviewNotesDraft[id] ?? "");
        const sessionDraft = (expertReviewNotesDraft[id] ?? "").trim();
        const combinedApproveNotes = [sessionDraft, trimmedApproveNotes].filter(Boolean).join("\n\n");

        const overlaySnapshot = await expertWorkflowService.snapshotSubmissionOverlay(id);
        const reviewedAt = new Date().toISOString();
        const moderationApproved = {
            ...it.moderation,
            status: ModerationStatus.APPROVED,
            reviewerId: user.id,
            reviewerName: user.username ?? "",
            reviewedAt,
            claimedBy: null,
            claimedByName: null,
            claimedAt: null,
            verificationStep: undefined,
            verificationData: verificationData as ModerationVerificationData,
            assignBlockedByRbac: undefined,
        } as NonNullable<LocalRecordingMini["moderation"]>;
        if (combinedApproveNotes) moderationApproved.notes = combinedApproveNotes;
        else delete moderationApproved.notes;

        const optimisticItem: LocalRecordingMini = {
            ...it,
            resubmittedForModeration: false,
            moderation: moderationApproved,
        };

        try {
            await expertWorkflowService.commitApproveLocal(
                id,
                user.id,
                user.username ?? "",
                verificationData,
                combinedApproveNotes,
            );
        } catch {
            uiToast.error("moderation.approve.local_failed");
            return;
        }

        uiToast.success("moderation.approve.success");

        const nextExpert = allItems.map((x) => (x.id === id ? optimisticItem : x));
        const { expertItems, visibleItems } = projectModerationLists(
            nextExpert,
            user.id,
            statusFilter,
            dateSort,
        );
        setAllItems(expertItems);
        setItems(visibleItems);

        setApproveExpertNotes("");
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
        setShowApproveConfirmDialog(null);
        if (selectedId === id) setSelectedId(null);

        void (async () => {
            const syncRes = await expertWorkflowService.syncApproveToServer(id);
            if (!syncRes.ok) {
                const isRbacError = syncRes.httpStatus === 401 || syncRes.httpStatus === 403;
                if (isRbacError) {
                    // Backend RBAC not ready for this endpoint — local approval is kept.
                    // Do not rollback; the expert's decision is preserved locally.
                    console.warn("[ModerationPage] syncApproveToServer returned", syncRes.httpStatus, "(RBAC) — keeping local approval.");
                } else {
                    console.warn("[ModerationPage] syncApproveToServer failed", syncRes.error);
                    await expertWorkflowService.restoreSubmissionOverlay(id, overlaySnapshot);
                    uiToast.error("moderation.approve.server_failed");
                    await load();
                    return;
                }
            }
            await expertWorkflowService.logExpertModerationDecision({
                submissionId: id,
                userId: user.id,
                action: "expert_approve",
                combinedNotes: combinedApproveNotes,
            });
            await expertWorkflowService.clearExpertReviewNotes(id);
            setExpertReviewNotesDraft((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            await load();
        })();
    };

    const handleConfirmReject = async () => {
        const id = showRejectConfirmDialog;
        if (!id) return;
        const ok = await reject(id, rejectType, rejectNote, rejectConfirmExpertNotes);
        if (!ok) return;
        if (showVerificationDialog === id) {
            setShowVerificationDialog(null);
        }
        setShowRejectDialog(null);
        setShowRejectConfirmDialog(null);
        setRejectNote("");
        setRejectConfirmExpertNotes("");
        setRejectType("direct");
    };

    const unclaim = (id?: string) => {
        if (!id) return;
        // Show confirmation dialog
        setShowUnclaimDialog(id);
    };

    const handleConfirmUnclaim = async () => {
        const id = showUnclaimDialog;
        if (!id) return;
        // Phase 1 Spike: unclaim → EXPERT_MODERATION_STATE only.
        const ok = await unclaimSubmission(id);
        if (!ok) return;
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
        setShowUnclaimDialog(null);
        await load();
    };

    const handleConfirmDelete = async () => {
        const id = showDeleteConfirmId;
        if (!id) return;
        const toDelete = allItems.find(it => it.id === id);
        const recordingTitle = toDelete?.basicInfo?.title || toDelete?.title || "Không có tiêu đề";
        try {
            await removeLocalRecording(id);
            // Phase 1 Spike: drop local expert overlay so stale moderation cannot reattach.
            await expertWorkflowService.removeSubmissionOverlay(id);
            await recordingRequestService.addNotification({
                type: "recording_deleted",
                title: "Bản thu đã được Chuyên gia xóa khỏi hệ thống",
                body: `Bản thu "${recordingTitle}" đã được xóa khỏi hệ thống bởi Chuyên gia.`,
                forRoles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.EXPERT, UserRole.RESEARCHER],
                recordingId: id,
            });
            await load();
            if (selectedId === id) setSelectedId(null);
            uiToast.success("moderation.delete.success");
        } catch {
            uiToast.error("moderation.delete.failed");
        } finally {
            setShowDeleteConfirmId(null);
        }
    };

    // Approve function is no longer needed - approval happens automatically after step 3

    const reject = async (
        id?: string,
        type: "direct" | "temporary" = "direct",
        note?: string,
        confirmExpertNotes?: string,
    ): Promise<boolean> => {
        if (!id || !user?.id) return false;
        const it = allItems.find((x) => x.id === id);
        if (!it) return false;
        if (it.moderation?.claimedBy !== user.id && it.moderation?.reviewerId !== user.id) {
            return false;
        }
        const expertNotesPayload = (confirmExpertNotes ?? "").trim() || (note ?? "").trim();
        if (!expertNotesPayload) {
            uiToast.warning("moderation.reject.notes_required");
            return false;
        }

        if (expertNotesDebounceRef.current) {
            clearTimeout(expertNotesDebounceRef.current);
            expertNotesDebounceRef.current = null;
        }
        await expertWorkflowService.setExpertReviewNotes(id, expertReviewNotesDraft[id] ?? "");
        const sessionRejectDraft = (expertReviewNotesDraft[id] ?? "").trim();
        const combinedRejectNotes = [sessionRejectDraft, expertNotesPayload].filter(Boolean).join("\n\n");

        const overlaySnapshot = await expertWorkflowService.snapshotSubmissionOverlay(id);
        const reviewedAt = new Date().toISOString();
        const nextStatus =
            type === "direct" ? ModerationStatus.REJECTED : ModerationStatus.TEMPORARILY_REJECTED;
        const lockFromReject = type === "direct" && it.resubmittedForModeration === true;
        const optimisticItem: LocalRecordingMini = {
            ...it,
            moderation: {
                ...it.moderation,
                status: nextStatus,
                reviewerId: user.id,
                reviewerName: user.username ?? "",
                reviewedAt,
                rejectionNote: note ?? "",
                contributorEditLocked: lockFromReject || it.moderation?.contributorEditLocked,
                claimedBy: null,
                claimedByName: null,
                notes: combinedRejectNotes,
                assignBlockedByRbac: undefined,
            },
        };

        try {
            await expertWorkflowService.commitRejectLocal(
                id,
                user.id,
                user.username ?? "",
                type,
                note ?? "",
                combinedRejectNotes,
                {
                    wasResubmitted: it.resubmittedForModeration === true,
                },
            );
        } catch {
            uiToast.error("moderation.reject.local_failed");
            return false;
        }

        const nextExpert = allItems.map((x) => (x.id === id ? optimisticItem : x));
        const { expertItems, visibleItems } = projectModerationLists(
            nextExpert,
            user.id,
            statusFilter,
            dateSort,
        );
        setAllItems(expertItems);
        setItems(visibleItems);

        setShowRejectDialog(null);
        setRejectNote("");
        setRejectType("direct");

        void (async () => {
            const syncRes = await expertWorkflowService.syncRejectToServer(id);
            if (!syncRes.ok) {
                const isRbacError = syncRes.httpStatus === 401 || syncRes.httpStatus === 403;
                if (isRbacError) {
                    // Backend RBAC not ready for this endpoint — local rejection is kept.
                    console.warn("[ModerationPage] syncRejectToServer returned", syncRes.httpStatus, "(RBAC) — keeping local rejection.");
                } else {
                    console.warn("[ModerationPage] syncRejectToServer failed", syncRes.error);
                    await expertWorkflowService.restoreSubmissionOverlay(id, overlaySnapshot);
                    uiToast.error("moderation.reject.server_failed");
                    await load();
                    return;
                }
            }
            await expertWorkflowService.logExpertModerationDecision({
                submissionId: id,
                userId: user.id,
                action: "expert_reject",
                combinedNotes: combinedRejectNotes,
            });
            await expertWorkflowService.clearExpertReviewNotes(id);
            setExpertReviewNotesDraft((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            await load();
        })();
        return true;
    };

    return (
        <div className="min-h-screen min-w-0 bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
                <div className="sr-only" aria-live="polite" aria-atomic="true">
                    {moderationA11yMessage}
                </div>
                {/* Header — responsive; wraps on small screens */}
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-5 sm:mb-6">
                    <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900 min-w-0">
                        Kiểm duyệt bản thu
                    </h1>
                    <BackButton />
                </div>

                {/* Tabs — VietTune UI */}
                <div
                    className="rounded-3xl overflow-hidden shadow-lg ring-1 ring-amber-200/70 backdrop-blur-sm mb-6 sm:mb-8 transition-all duration-300 min-w-0 overflow-x-hidden bg-white/80"
                >
                    <nav
                        className="flex flex-wrap gap-2 p-4 sm:p-5 lg:p-6 bg-gradient-to-b from-white to-amber-50/40"
                        aria-label="Cổng chuyên gia"
                        role="tablist"
                    >
                        {[
                            { id: "review" as const, label: "Xem duyệt bản thu", icon: FileText },
                            { id: "ai" as const, label: "Giám sát phản hồi của AI", icon: MessageSquare },
                            { id: "knowledge" as const, label: "Kho tri thức", icon: BookOpen },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                id={`moderation-tab-${tab.id}`}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                aria-controls={`moderation-panel-${tab.id}`}
                                tabIndex={activeTab === tab.id ? 0 : -1}
                                onClick={() => setActiveTab(tab.id)}
                                onKeyDown={(e) => {
                                    const order: ExpertTabId[] = ["review", "ai", "knowledge"];
                                    const i = order.indexOf(tab.id);
                                    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                                        e.preventDefault();
                                        const next = order[(i + 1) % order.length];
                                        setActiveTab(next);
                                        document.getElementById(`moderation-tab-${next}`)?.focus();
                                    }
                                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                                        e.preventDefault();
                                        const next = order[(i - 1 + order.length) % order.length];
                                        setActiveTab(next);
                                        document.getElementById(`moderation-tab-${next}`)?.focus();
                                    }
                                    if (e.key === "Home") {
                                        e.preventDefault();
                                        setActiveTab("review");
                                        document.getElementById("moderation-tab-review")?.focus();
                                    }
                                    if (e.key === "End") {
                                        e.preventDefault();
                                        setActiveTab("knowledge");
                                        document.getElementById("moderation-tab-knowledge")?.focus();
                                    }
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${activeTab === tab.id
                                    ? "bg-primary-600 text-white border-primary-600 shadow-md"
                                    : "text-neutral-700 bg-white border-neutral-200/80 hover:border-primary-300 hover:bg-primary-50/80"
                                    }`}
                            >
                                <tab.icon className="w-5 h-5 flex-shrink-0" aria-hidden strokeWidth={2.5} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Tab: Xem duyệt bản thu */}
                    {activeTab === "review" && (
                        <div
                            id="moderation-panel-review"
                            role="tabpanel"
                            aria-labelledby="moderation-tab-review"
                            className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:gap-8 xl:gap-10 lg:items-start p-4 pt-3"
                        >
                            <ModerationQueueSidebar
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
                            />

                            {/* Right: Chi tiết bản thu hoặc empty state */}
                            <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/80 to-secondary-50/50 overflow-y-auto p-4 sm:p-6 shadow-lg backdrop-blur-sm">
                                {selectedId && (() => {
                                    const listItem = allItems.find((i) => i.id === selectedId);
                                    const item = mergeDisplayItem(listItem, selectedItemFull);
                                    if (!item) return null;
                                    let mediaSrc: string | undefined;
                                    let isVideo = false;
                                    if (item.mediaType === "youtube" && item.youtubeUrl?.trim()) {
                                        mediaSrc = item.youtubeUrl.trim();
                                        isVideo = true;
                                    } else if (item.youtubeUrl && isYouTubeUrl(item.youtubeUrl)) {
                                        mediaSrc = item.youtubeUrl.trim();
                                        isVideo = true;
                                    } else if (item.mediaType === "video" && item.videoData?.trim()) {
                                        mediaSrc = item.videoData;
                                        isVideo = true;
                                    } else if (item.mediaType === "audio" && (item.audioData?.trim() || item.audioUrl?.trim())) {
                                        mediaSrc = item.audioData?.trim() || item.audioUrl?.trim();
                                    } else if (item.mediaType === "video" && item.audioUrl?.trim()) {
                                        // Some API rows classify as "video" but only expose URL.
                                        mediaSrc = item.audioUrl.trim();
                                        const src = mediaSrc;
                                        isVideo = isYouTubeUrl(src) || /\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)(\?|$)/i.test(src) || src.startsWith("data:video/");
                                    } else if (item.audioUrl?.trim()) {
                                        mediaSrc = item.audioUrl.trim();
                                        const src = mediaSrc;
                                        isVideo = isYouTubeUrl(src) || /\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)(\?|$)/i.test(src) || src.startsWith("data:video/");
                                    } else if (item.audioData?.trim()) {
                                        mediaSrc = item.audioData;
                                    } else if (item.videoData?.trim()) {
                                        mediaSrc = item.videoData;
                                        isVideo = true;
                                    }
                                    const convertedForPlayer = item && (selectedItemFull ?? item) ? (() => {
                                        const r = selectedItemFull ?? item;
                                        return {
                                            id: r.id ?? "",
                                            title: r.basicInfo?.title || r.title || "Không có tiêu đề",
                                            titleVietnamese: r.basicInfo?.title || r.title || "Không có tiêu đề",
                                            description: "",
                                            ethnicity: { id: "local", name: r.culturalContext?.ethnicity || "—", nameVietnamese: r.culturalContext?.ethnicity || "—", region: Region.RED_RIVER_DELTA, recordingCount: 0 },
                                            region: Region.RED_RIVER_DELTA,
                                            recordingType: RecordingType.OTHER,
                                            duration: 0,
                                            audioUrl: r.audioData ?? r.audioUrl ?? "",
                                            waveformUrl: "",
                                            coverImage: "",
                                            instruments: (r.culturalContext?.instruments || []).map((name, idx) => ({ id: `li-${idx}`, name, nameVietnamese: name, category: "STRING" as import("@/types").InstrumentCategory, images: [], recordingCount: 0 })) as Instrument[],
                                            performers: [],
                                            recordedDate: r.basicInfo?.recordingDate || "",
                                            uploadedDate: r.uploadedAt || "",
                                            uploader: (r.uploader ? { id: (r.uploader as { id?: string }).id ?? "", username: (r.uploader as { username?: string }).username ?? "", email: "", fullName: (r.uploader as { username?: string }).username ?? "", role: UserRole.USER, createdAt: "", updatedAt: "" } : { id: "", username: "", email: "", fullName: "", role: UserRole.USER, createdAt: "", updatedAt: "" }),
                                            tags: buildTagsFromLocal(r),
                                            metadata: { recordingQuality: RecordingQuality.FIELD_RECORDING, lyrics: "" } as RecordingMetadata,
                                            verificationStatus: r.moderation?.status === "APPROVED" ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
                                            verifiedBy: undefined,
                                            viewCount: 0,
                                            likeCount: 0,
                                            downloadCount: 0,
                                            _originalLocalData: r,
                                        } as RecordingWithLocalData;
                                    })() : null;
                                    const ethnicityLabel = cleanMetadataText(item.culturalContext?.ethnicity);
                                    const regionLabel = cleanMetadataText(
                                        item.culturalContext?.province || item.culturalContext?.region,
                                    );
                                    const eventTypeLabel = cleanMetadataText(item.culturalContext?.eventType);
                                    const instrumentsLabel = cleanInstrumentList(item.culturalContext?.instruments);
                                    const uploadedAtLabel = formatDateTime(
                                        (item as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || item.uploadedAt,
                                    );
                                    const headerMetaParts = [ethnicityLabel, regionLabel, uploadedAtLabel]
                                        .filter((x) => !isPlaceholderField(x));
                                    const infoRows = [
                                        {
                                            key: "uploader",
                                            icon: UserIcon,
                                            label: "Người đóng góp",
                                            value: item.uploader?.username || "Khách",
                                        },
                                        {
                                            key: "instruments",
                                            icon: Music,
                                            label: "Nhạc cụ",
                                            value: instrumentsLabel,
                                        },
                                        {
                                            key: "event-type",
                                            icon: null,
                                            label: "Loại sự kiện",
                                            value: eventTypeLabel,
                                        },
                                    ] as const;
                                    const missingInfoCount = infoRows.filter((row) => isPlaceholderField(row.value)).length;
                                    const headerMetadataSparse = headerMetaParts.length < 2;
                                    const metadataHealthLabel =
                                        missingInfoCount === 0 && !headerMetadataSparse
                                            ? "Metadata đầy đủ"
                                            : `Thiếu metadata (${missingInfoCount + (headerMetadataSparse ? 1 : 0)})`;


                                    return (
                                        <div className="space-y-6">
                                            <div className="rounded-2xl border border-neutral-200/80 shadow-md overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 text-white p-6">
                                                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                                    <div>
                                                        <h2 className="text-xl font-semibold mb-1">{item.basicInfo?.title || item.title || "Không có tiêu đề"}</h2>
                                                        <p className="text-sm text-white/80">
                                                            {headerMetaParts.length > 0 ? headerMetaParts.join(" • ") : "Chưa có metadata chính"}
                                                        </p>
                                                        <p className={`mt-1 text-xs ${missingInfoCount === 0 && !headerMetadataSparse ? "text-emerald-200/90" : "text-amber-200/95"}`}>
                                                            {metadataHealthLabel}
                                                        </p>
                                                    </div>
                                                    <ModerationClaimActions
                                                        item={item}
                                                        currentUserId={user?.id}
                                                        onClaim={claim}
                                                        onRequestDelete={(id) => setShowDeleteConfirmId(id)}
                                                    />
                                                </div>
                                                <ModerationDetailMedia
                                                    mediaSrc={mediaSrc}
                                                    isVideo={isVideo}
                                                    title={item.basicInfo?.title || item.title}
                                                    artist={item.basicInfo?.artist}
                                                    recording={convertedForPlayer}
                                                />
                                            </div>
                                            <ModerationSubmissionDetailPanels
                                                item={item}
                                                currentUserId={user?.id}
                                                expertReviewNotesDraft={item.id ? expertReviewNotesDraft[item.id] ?? "" : ""}
                                                onExpertReviewNotesChange={handleExpertReviewNotesChange}
                                                infoRows={infoRows}
                                            />
                                        </div>
                                    );
                                })()}
                                {!selectedId && (
                                    <div className="flex items-center justify-center min-h-[320px]">
                                        <div className="max-w-md w-full rounded-2xl border-2 border-dashed border-primary-200 bg-white/90 p-8 text-center shadow-sm">
                                            <FileText className="h-14 w-14 text-primary-300 mb-4 mx-auto" />
                                            <h3 className="text-lg font-semibold text-neutral-800 mb-1">Chọn một bản thu</h3>
                                            <p className="text-sm text-neutral-500">Chọn bản thu từ hàng đợi bên trái để xem chi tiết và kiểm duyệt.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: Giám sát AI — review câu trả lời AI và báo lỗi */}
                    {activeTab === "ai" && (
                        <div
                            id="moderation-panel-ai"
                            role="tabpanel"
                            aria-labelledby="moderation-tab-ai"
                            className="p-6 sm:p-8 min-h-[400px]"
                        >
                            <h2 className="text-xl font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                                <MessageSquare className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
                                Giám sát phản hồi AI
                            </h2>
                            <p className="text-neutral-600 text-sm mb-6 max-w-2xl">
                                Xem lại các phản hồi do AI tạo ra (ví dụ từ Hỏi đáp thông minh). Nếu phát hiện sai sót, hãy báo lỗi và ghi chú để điều chỉnh.
                            </p>
                            {!aiResponsesLoaded ? (
                                <div className="text-neutral-500 text-sm">Đang tải...</div>
                            ) : aiResponses.length === 0 ? (
                                <div className="rounded-2xl border-2 border-dashed border-neutral-200/80 p-8 text-center" style={{ backgroundColor: "#FFFCF5" }}>
                                    <MessageSquare className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                                    <p className="text-neutral-600 font-medium">Chưa có phản hồi AI nào cần duyệt</p>
                                    <p className="text-neutral-500 text-sm mt-1">Khi có câu trả lời AI từ Cổng nghiên cứu (Hỏi đáp thông minh) hoặc chatbot, chúng sẽ xuất hiện tại đây để chuyên gia xem và báo lỗi nếu cần.</p>
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {aiResponses.map((item) => (
                                        <li
                                            key={item.id}
                                            className={`rounded-2xl border-2 p-4 sm:p-6 transition-all ${item.flagged ? "border-amber-400/80 bg-amber-50/50" : "border-neutral-200/80 bg-white"}`}
                                            style={item.flagged ? undefined : { backgroundColor: "#FFFCF5" }}
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                                                <span className="text-xs text-neutral-500">
                                                    {item.createdAt ? formatDateTime(item.createdAt) : ""}
                                                    {item.source && ` · ${item.source}`}
                                                </span>
                                                {item.flagged && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-200/80 text-amber-900 text-xs font-medium">
                                                        <Flag className="w-3.5 h-3.5" />
                                                        Đã báo lỗi
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-neutral-800 font-medium mb-1">Câu hỏi:</p>
                                            <p className="text-neutral-700 text-sm mb-3 whitespace-pre-wrap">{item.question}</p>
                                            <p className="text-neutral-800 font-medium mb-1">Câu trả lời AI:</p>
                                            <p className="text-neutral-700 text-sm mb-4 whitespace-pre-wrap">{item.answer}</p>
                                            {item.citations && item.citations.length > 0 && (
                                                <div className="mb-4 rounded-xl border border-sky-200/80 bg-sky-50/60 p-3">
                                                    <p className="text-xs font-semibold text-sky-800 mb-1">Nguồn trích dẫn do Researcher gửi kèm</p>
                                                    <ul className="space-y-1 list-none pl-0">
                                                        {item.citations.map((citation, idx) => (
                                                            <li key={`${item.id}-citation-${idx}`}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/recordings/${citation.recordingId}`, { state: { from: "/moderation" } })}
                                                                    className="text-xs text-left text-sky-800 hover:text-sky-900 underline underline-offset-2 cursor-pointer"
                                                                >
                                                                    [{idx + 1}] {citation.label}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {flagNoteId === item.id ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={flagNoteValue}
                                                        onChange={(e) => setFlagNoteValue(e.target.value)}
                                                        placeholder="Mô tả lỗi (tùy chọn)..."
                                                        rows={2}
                                                        aria-label="Mô tả lỗi phản hồi AI"
                                                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFlagAiResponse(item.id, true, flagNoteValue)}
                                                            aria-label="Xác nhận báo lỗi cho phản hồi AI này"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
                                                        >
                                                            <Flag className="w-4 h-4 shrink-0" aria-hidden />
                                                            Xác nhận báo lỗi
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setFlagNoteId(null); setFlagNoteValue(""); }}
                                                            aria-label="Hủy nhập ghi chú báo lỗi"
                                                            className="px-3 py-1.5 rounded-xl border border-neutral-300 text-neutral-700 text-sm hover:bg-neutral-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                                        >
                                                            Hủy
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    {!item.flagged ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFlagNoteId(item.id)}
                                                            aria-label="Báo lỗi cho phản hồi AI này"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                                                        >
                                                            <Flag className="w-4 h-4 shrink-0" aria-hidden />
                                                            Báo lỗi
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFlagAiResponse(item.id, false)}
                                                            aria-label="Gỡ cờ báo lỗi cho phản hồi AI này"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 text-neutral-700 text-sm hover:bg-neutral-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                                        >
                                                            Gỡ báo lỗi
                                                        </button>
                                                    )}
                                                    {item.flagNote && (
                                                        <p className="text-sm text-amber-800/90">Ghi chú: {item.flagNote}</p>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Tab: Kho tri thức */}
                    {activeTab === "knowledge" && (
                        <div
                            id="moderation-panel-knowledge"
                            role="tabpanel"
                            aria-labelledby="moderation-tab-knowledge"
                            className="p-6 sm:p-8 min-h-[400px] flex flex-col items-center justify-center text-center"
                        >
                            <BookOpen className="h-16 w-16 text-primary-300 mb-4" />
                            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Kho tri thức</h2>
                            <p className="text-neutral-600 max-w-md">Bách khoa toàn thư cộng tác về âm nhạc truyền thống Việt Nam.</p>
                        </div>
                    )}
                </div>

                {/* Verification Dialog */}
                {showVerificationDialog && (() => {
                    const item = (dialogCurrentRecording?.id === showVerificationDialog)
                        ? dialogCurrentRecording
                        : allItems.find(it => it.id === showVerificationDialog);
                    if (!item) return null;
                    const currentStep = getCurrentVerificationStep(showVerificationDialog);
                    return (
                        <ModerationVerificationWizardDialog
                            submissionId={showVerificationDialog}
                            item={item}
                            panelRef={verificationDialogPanelRef}
                            expertReviewNotesDraft={expertReviewNotesDraft[showVerificationDialog] ?? ""}
                            onExpertReviewNotesChange={(text) =>
                                handleExpertReviewNotesChange(showVerificationDialog, text)}
                            formSlice={verificationForms[showVerificationDialog]}
                            currentStep={currentStep}
                            onClose={() => cancelVerification(showVerificationDialog)}
                            onUnclaim={() => unclaim(showVerificationDialog)}
                            onOpenReject={() => setShowRejectDialog(showVerificationDialog)}
                            onPrevStep={() => prevVerificationStep(showVerificationDialog)}
                            onNextStep={() => nextVerificationStep(showVerificationDialog)}
                            onCompleteFinalStep={() => nextVerificationStep(showVerificationDialog)}
                            isCurrentStepValid={validateStep(showVerificationDialog, currentStep)}
                            allStepsComplete={allVerificationStepsComplete(showVerificationDialog)}
                            onUpdateVerificationForm={(step, field, value) =>
                                updateVerificationForm(showVerificationDialog, step, field, value)}
                        />
                    );
                })()}

                <ModerationRejectReasonFormPortal
                    submissionId={showRejectDialog}
                    rejectType={rejectType}
                    onRejectTypeChange={setRejectType}
                    rejectNote={rejectNote}
                    onRejectNoteChange={setRejectNote}
                    onCancel={() => {
                        setShowRejectDialog(null);
                        setRejectNote("");
                        setRejectType("direct");
                    }}
                    onConfirm={() => {
                        if (!showRejectDialog) return;
                        if (!rejectNote.trim()) {
                            setShowRejectNoteWarningDialog(true);
                            return;
                        }
                        setRejectConfirmExpertNotes(rejectNote);
                        setShowRejectConfirmDialog(showRejectDialog);
                    }}
                />

                {/* Unclaim Confirmation Dialog */}
                {showUnclaimDialog && createPortal(
                    <div
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                        role="presentation"
                        onClick={() => setShowUnclaimDialog(null)}
                        style={{
                            animation: 'fadeIn 0.3s ease-out',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100vw',
                            height: '100vh',
                            position: 'fixed',
                        }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="moderation-unclaim-dialog-title"
                            className="rounded-2xl shadow-2xl border border-secondary-200/70 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform outline-none"
                            style={{
                                backgroundColor: '#FFFCF5',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-secondary-200/80 bg-gradient-to-b from-[#FFF8EA] to-cream-50/80">
                                <h2 id="moderation-unclaim-dialog-title" className="text-2xl font-bold text-neutral-900">Xác nhận hủy nhận kiểm duyệt</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowUnclaimDialog(null)}
                                    className="p-1.5 rounded-full hover:bg-secondary-100 transition-colors duration-200 text-neutral-700 hover:text-neutral-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
                                    aria-label="Đóng"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-6">
                                <div className="rounded-2xl shadow-md border border-secondary-200/70 bg-gradient-to-b from-[#FFFCF5] to-secondary-50/50 p-8">
                                    <div className="flex flex-col items-center gap-4 mb-2">
                                        <div className="p-3 bg-primary-100 rounded-full flex-shrink-0">
                                            <AlertCircle className="h-8 w-8 text-primary-600" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-neutral-800 text-center">
                                            Bạn có chắc chắn muốn hủy nhận kiểm duyệt bản thu này?
                                        </h3>
                                        <div className="text-neutral-700 text-center space-y-1">
                                            <p>Bản thu sẽ được trả lại danh sách để các chuyên gia khác có thể nhận kiểm duyệt.</p>
                                            <p>Tiến trình kiểm duyệt hiện tại sẽ bị hủy.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-center gap-4 p-6 border-t border-secondary-200/80 bg-gradient-to-b from-white to-secondary-50/30">
                                <button
                                    type="button"
                                    onClick={() => setShowUnclaimDialog(null)}
                                    className="px-6 py-2.5 border border-secondary-200/80 bg-white text-neutral-800 rounded-full font-medium transition-colors duration-200 hover:bg-secondary-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmUnclaim}
                                    className="px-6 py-2.5 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full font-medium transition-colors duration-200 shadow-md hover:shadow-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                >
                                    Xác nhận hủy
                                </button>
                            </div>
                        </div>
                    </div>
                    , document.body
                )}

                {/* Approve Confirmation Dialog */}
                {showApproveConfirmDialog && createPortal(
                    <div
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                        role="presentation"
                        onClick={() => { setShowApproveConfirmDialog(null); setApproveExpertNotes(""); }}
                        style={{
                            animation: 'fadeIn 0.3s ease-out',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100vw',
                            height: '100vh',
                            position: 'fixed',
                        }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="moderation-approve-dialog-title"
                            aria-describedby="moderation-approve-dialog-desc moderation-approve-notes-hint moderation-approve-shortcuts"
                            className="rounded-2xl shadow-2xl border border-secondary-200/70 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform"
                            style={{
                                backgroundColor: '#FFFCF5',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-secondary-200/80 bg-gradient-to-b from-[#FFF8EA] to-cream-50/80">
                                <h2 id="moderation-approve-dialog-title" className="text-2xl font-bold text-neutral-900">Xác nhận phê duyệt</h2>
                                <button
                                    type="button"
                                    onClick={() => { setShowApproveConfirmDialog(null); setApproveExpertNotes(""); }}
                                    className="p-1.5 rounded-full hover:bg-secondary-100 transition-colors duration-200 text-neutral-700 hover:text-neutral-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
                                    aria-label="Đóng hộp thoại phê duyệt"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-6">
                                <div className="rounded-2xl shadow-md border border-secondary-200/70 bg-gradient-to-b from-[#FFFCF5] to-secondary-50/50 p-8">
                                    <div className="flex flex-col items-center gap-4 mb-4">
                                        <div className="p-3 bg-primary-100 rounded-full flex-shrink-0" aria-hidden>
                                            <AlertCircle className="h-8 w-8 text-primary-600" />
                                        </div>
                                        <h3 id="moderation-approve-dialog-desc" className="text-xl font-semibold text-neutral-900 text-center">
                                            Bạn có chắc chắn muốn phê duyệt bản thu này?
                                        </h3>
                                        <div className="text-neutral-800 text-center text-sm space-y-1 max-w-lg">
                                            <p>Hành động này sẽ đưa bản thu vào danh sách đã được kiểm duyệt.</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-left max-w-xl mx-auto w-full">
                                        <label htmlFor="moderation-approve-expert-notes" className="block text-sm font-medium text-neutral-800 mb-2">
                                            Ghi chú chuyên gia <span className="font-normal text-neutral-600">(không bắt buộc)</span>
                                        </label>
                                        <textarea
                                            id="moderation-approve-expert-notes"
                                            value={approveExpertNotes}
                                            onChange={(e) => setApproveExpertNotes(e.target.value)}
                                            onKeyDown={(e) => {
                                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                                    e.preventDefault();
                                                    void handleConfirmApprove();
                                                }
                                            }}
                                            rows={4}
                                            className="w-full px-4 py-2 border border-neutral-400 rounded-lg text-neutral-900 placeholder:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                            style={{ backgroundColor: "#FFFCF5" }}
                                            placeholder="Ghi chú nội bộ về quyết định phê duyệt (lưu cục bộ, Phase 1)…"
                                            aria-describedby="moderation-approve-notes-hint moderation-approve-shortcuts"
                                        />
                                        <p id="moderation-approve-notes-hint" className="mt-2 text-xs text-neutral-700">
                                            Ghi chú được lưu cùng trạng thái kiểm duyệt (Phase 1 Spike) và hiển thị trong chi tiết bản thu.
                                        </p>
                                        <p id="moderation-approve-shortcuts" className="mt-1 text-xs text-neutral-600">
                                            Phím tắt: Ctrl+Enter hoặc ⌘+Enter để xác nhận phê duyệt.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-center gap-4 p-6 border-t border-secondary-200/80 bg-gradient-to-b from-white to-secondary-50/30">
                                <button
                                    type="button"
                                    onClick={() => { setShowApproveConfirmDialog(null); setApproveExpertNotes(""); }}
                                    className="px-6 py-2.5 border border-secondary-200/80 bg-white text-neutral-900 rounded-full font-medium hover:bg-secondary-50 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleConfirmApprove()}
                                    className="px-6 py-2.5 bg-green-700 text-white rounded-full font-medium hover:bg-green-600 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                                >
                                    Xác nhận phê duyệt
                                </button>
                            </div>
                        </div>
                    </div>
                    , document.body
                )}

                {/* Reject Confirmation Dialog */}
                {showRejectConfirmDialog && createPortal(
                    <div
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                        role="presentation"
                        onClick={() => { setShowRejectConfirmDialog(null); setRejectConfirmExpertNotes(""); }}
                        style={{
                            animation: 'fadeIn 0.3s ease-out',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100vw',
                            height: '100vh',
                            position: 'fixed',
                        }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="moderation-reject-confirm-title"
                            aria-describedby="moderation-reject-confirm-desc moderation-reject-confirm-notes-hint moderation-reject-confirm-shortcuts"
                            className="rounded-2xl shadow-2xl border border-secondary-200/70 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform"
                            style={{
                                backgroundColor: '#FFFCF5',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-secondary-200/80 bg-gradient-to-b from-[#FFF8EA] to-cream-50/80">
                                <h2 id="moderation-reject-confirm-title" className="text-2xl font-bold text-neutral-900">Xác nhận từ chối</h2>
                                <button
                                    type="button"
                                    onClick={() => { setShowRejectConfirmDialog(null); setRejectConfirmExpertNotes(""); }}
                                    className="p-1.5 rounded-full hover:bg-secondary-100 transition-colors duration-200 text-neutral-700 hover:text-neutral-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
                                    aria-label="Đóng hộp thoại xác nhận từ chối"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-6">
                                <div className="rounded-2xl shadow-md border border-secondary-200/70 bg-gradient-to-b from-[#FFFCF5] to-secondary-50/50 p-8">
                                    <div className="flex flex-col items-center gap-4 mb-4">
                                        <div className="p-3 bg-primary-100 rounded-full flex-shrink-0" aria-hidden>
                                            <AlertCircle className="h-8 w-8 text-primary-600" />
                                        </div>
                                        <h3 id="moderation-reject-confirm-desc" className="text-xl font-semibold text-neutral-900 text-center">
                                            Bạn có chắc chắn muốn {rejectType === "direct" ? "từ chối vĩnh viễn" : "từ chối tạm thời"} bản thu này?
                                        </h3>
                                        <div className="text-neutral-800 text-center text-sm space-y-1 max-w-lg">
                                            <p>{rejectType === "direct" ? "Bản thu sẽ bị từ chối vĩnh viễn. Người đóng góp sẽ không thể chỉnh sửa bản thu." : "Bản thu sẽ bị từ chối tạm thời. Người đóng góp sẽ có thể chỉnh sửa bản thu."}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-left max-w-xl mx-auto w-full">
                                        <label htmlFor="moderation-reject-confirm-expert-notes" className="block text-sm font-medium text-neutral-800 mb-2">
                                            Ghi chú chuyên gia <span className="text-red-800 font-semibold">(nên điền)</span>
                                        </label>
                                        <textarea
                                            id="moderation-reject-confirm-expert-notes"
                                            value={rejectConfirmExpertNotes}
                                            onChange={(e) => setRejectConfirmExpertNotes(e.target.value)}
                                            onKeyDown={(e) => {
                                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                                    e.preventDefault();
                                                    void handleConfirmReject();
                                                }
                                            }}
                                            rows={4}
                                            className="w-full px-4 py-2 border border-neutral-400 rounded-lg text-neutral-900 placeholder:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                            style={{ backgroundColor: "#FFFCF5" }}
                                            placeholder="Tóm tắt hoặc bổ sung ghi chú cho hồ sơ kiểm duyệt…"
                                            aria-describedby="moderation-reject-confirm-notes-hint moderation-reject-confirm-shortcuts"
                                        />
                                        <p id="moderation-reject-confirm-notes-hint" className="mt-2 text-xs text-neutral-800">
                                            Nội dung được lưu cục bộ (Phase 1 Spike). Đã sao chép từ lý do từ chối — bạn có thể chỉnh sửa.
                                        </p>
                                        <p id="moderation-reject-confirm-shortcuts" className="mt-1 text-xs text-neutral-600">
                                            Phím tắt: Ctrl+Enter hoặc ⌘+Enter để xác nhận từ chối.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-center gap-4 p-6 border-t border-secondary-200/80 bg-gradient-to-b from-white to-secondary-50/30">
                                <button
                                    type="button"
                                    onClick={() => { setShowRejectConfirmDialog(null); setRejectConfirmExpertNotes(""); }}
                                    className="px-6 py-2.5 border border-secondary-200/80 bg-white text-neutral-900 rounded-full font-medium hover:bg-secondary-50 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleConfirmReject()}
                                    className="px-6 py-2.5 bg-red-700 text-white rounded-full font-medium hover:bg-red-600 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                                >
                                    Xác nhận {rejectType === "direct" ? "từ chối vĩnh viễn" : "từ chối tạm thời"}
                                </button>
                            </div>
                        </div>
                    </div>
                    , document.body
                )}

                {/* Reject Note Warning Dialog */}
                {showRejectNoteWarningDialog && createPortal(
                    <div
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                        role="presentation"
                        onClick={() => setShowRejectNoteWarningDialog(false)}
                        style={{
                            animation: 'fadeIn 0.3s ease-out',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100vw',
                            height: '100vh',
                            position: 'fixed',
                        }}
                    >
                        <div
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="moderation-reject-warning-title"
                            className="rounded-2xl shadow-2xl border border-secondary-200/70 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform outline-none"
                            style={{
                                backgroundColor: '#FFFCF5',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-secondary-200/80 bg-gradient-to-b from-[#FFF8EA] to-cream-50/80">
                                <h2 id="moderation-reject-warning-title" className="text-2xl font-bold text-neutral-900">Cảnh báo</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowRejectNoteWarningDialog(false)}
                                    className="p-1.5 rounded-full hover:bg-secondary-100 transition-colors duration-200 text-neutral-700 hover:text-neutral-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
                                    aria-label="Đóng"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-6">
                                <div className="rounded-2xl shadow-md border border-secondary-200/70 bg-gradient-to-b from-[#FFFCF5] to-secondary-50/50 p-8">
                                    <div className="flex flex-col items-center gap-4 mb-2">
                                        <div className="p-3 bg-primary-100 rounded-full flex-shrink-0">
                                            <AlertCircle className="h-8 w-8 text-primary-600" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-neutral-800 text-center">
                                            Vui lòng nhập lý do từ chối
                                        </h3>
                                        <div className="text-neutral-700 text-center space-y-1">
                                            <p>Cho dù từ chối tạm thời hay từ chối vĩnh viễn, bạn đều cần phải nhập lý do từ chối.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200 bg-neutral-50/50">
                                <button
                                    type="button"
                                    onClick={() => setShowRejectNoteWarningDialog(false)}
                                    className="px-6 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
                                >
                                    Đã hiểu
                                </button>
                            </div>
                        </div>
                    </div>
                    , document.body
                )}

                {/* Delete recording confirmation */}
                {showDeleteConfirmId && (() => {
                    const toDelete = allItems.find(it => it.id === showDeleteConfirmId);
                    const title = toDelete?.basicInfo?.title || toDelete?.title || "Không có tiêu đề";
                    return createPortal(
                        <div
                            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                            role="presentation"
                            onClick={() => setShowDeleteConfirmId(null)}
                            style={{
                                animation: "fadeIn 0.3s ease-out",
                                top: 0, left: 0, right: 0, bottom: 0,
                                width: "100vw", height: "100vh", position: "fixed",
                            }}
                        >
                            <div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="moderation-delete-dialog-title"
                                className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-md w-full overflow-hidden flex flex-col pointer-events-auto transform outline-none"
                                style={{ backgroundColor: "#FFF2D6", animation: "slideUp 0.3s ease-out" }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-neutral-700 to-neutral-800">
                                    <h2 id="moderation-delete-dialog-title" className="text-xl font-bold text-white">Xóa bản thu khỏi hệ thống</h2>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirmId(null)}
                                        className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800"
                                        aria-label="Đóng"
                                    >
                                        <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                                    </button>
                                </div>
                                <div className="overflow-y-auto p-6">
                                    <div className="rounded-2xl shadow-md border border-neutral-200 p-6" style={{ backgroundColor: "#FFFCF5" }}>
                                        <div className="flex flex-col items-center gap-4 mb-2">
                                            <div className="p-3 bg-red-100 rounded-full flex-shrink-0">
                                                <Trash2 className="h-8 w-8 text-red-600" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-neutral-800 text-center">
                                                Bạn có chắc muốn xóa bản thu &quot;{title}&quot; khỏi hệ thống?
                                            </h3>
                                            <p className="text-neutral-600 text-center text-sm">
                                                Bản thu sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200 bg-neutral-50/50">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirmId(null)}
                                        className="px-6 py-2.5 bg-neutral-200 text-neutral-800 rounded-full font-medium hover:bg-neutral-300 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmDelete}
                                        aria-label="Xác nhận xóa bản thu vĩnh viễn"
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-full font-medium hover:bg-red-500 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                                    >
                                        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                                        Xóa bản thu
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    );
                })()}
            </div>
        </div>
    );
}