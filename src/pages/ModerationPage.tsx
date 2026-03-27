import { useEffect, useState, useCallback, useRef, useMemo, useId } from "react";
import { useNavigate } from "react-router-dom";
import { Region, RecordingType, RecordingQuality, VerificationStatus, Recording, UserRole, RecordingMetadata, Instrument, LocalRecording } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { ModerationStatus } from "@/types";
import AudioPlayer from "@/components/features/AudioPlayer";
import VideoPlayer from "@/components/features/VideoPlayer";
import { isYouTubeUrl } from "@/utils/youtube";
import { migrateVideoDataToVideoData, formatDateTime, getModerationStatusLabel } from "@/utils/helpers";
import { buildTagsFromLocal } from "@/utils/recordingTags";
import { createPortal } from "react-dom";
import { ChevronDown, Search, AlertCircle, X, FileText, MessageSquare, BookOpen, MapPin, Music, User as UserIcon, CheckCircle, Trash2, Flag } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import ForbiddenPage from "@/pages/ForbiddenPage";
import { getLocalRecordingFull, removeLocalRecording } from "@/services/recordingStorage";
import { expertWorkflowService } from "@/services/expertWorkflowService";
import type { ModerationVerificationData } from "@/services/expertWorkflowService";
import { recordingRequestService } from "@/services/recordingRequestService";
import { getItemAsync, setItem } from "@/services/storageService";
import toast from "react-hot-toast";
import { EXPERT_API_PHASE2 } from "@/config/expertWorkflowPhase";

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

// ===== UTILITY FUNCTIONS =====
// Check if click is on scrollbar
const isClickOnScrollbar = (event: MouseEvent): boolean => {
    const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
    if (
        scrollbarWidth > 0 &&
        event.clientX >= document.documentElement.clientWidth
    ) {
        return true;
    }
    return false;
};

// ===== REUSABLE COMPONENTS =====
function SearchableDropdown({
    value,
    onChange,
    options,
    placeholder = "-- Chọn --",
    searchable = true,
    disabled = false,
    ariaLabel,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
    /** Accessible name for the trigger + listbox (e.g. field label). */
    ariaLabel?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
    const listboxId = useId();

    const filteredOptions = useMemo(() => {
        if (!search) return options;
        return options.filter((opt) =>
            opt.toLowerCase().includes(search.toLowerCase()),
        );
    }, [options, search]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isClickOnScrollbar(event)) return;
            const target = event.target as Node;
            const clickedOutsideDropdown =
                dropdownRef.current && !dropdownRef.current.contains(target);
            const clickedOutsideMenu =
                menuRef.current && !menuRef.current.contains(target);
            if (
                clickedOutsideDropdown &&
                (menuRef.current ? clickedOutsideMenu : true)
            ) {
                setIsOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const updateRect = () => {
            if (buttonRef.current)
                setMenuRect(buttonRef.current.getBoundingClientRect());
        };
        if (isOpen) updateRect();
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect, true);
        return () => {
            window.removeEventListener("resize", updateRect);
            window.removeEventListener("scroll", updateRect, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                setIsOpen(false);
                setSearch("");
                buttonRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen]);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                        e.preventDefault();
                        if (!isOpen) setIsOpen(true);
                    }
                }}
                disabled={disabled}
                className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500 transition-colors text-left flex items-center justify-between ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={isOpen ? listboxId : undefined}
                aria-label={ariaLabel}
                style={{ backgroundColor: "#FFFCF5" }}
            >
                <span className={value ? "text-neutral-900" : "text-neutral-400"}>
                    {value || placeholder}
                </span>
                <ChevronDown
                    className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            {isOpen &&
                menuRect &&
                createPortal(
                    <div
                        ref={(el) => (menuRef.current = el)}
                        id={listboxId}
                        role="listbox"
                        aria-label={ariaLabel ? `${ariaLabel}, chọn một mục` : "Danh sách lựa chọn"}
                        className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300"
                        style={{
                            backgroundColor: "#FFFCF5",
                            position: "absolute",
                            left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
                            top: menuRect.bottom + (window.scrollY ?? 0) + 8,
                            width: menuRect.width,
                            zIndex: 40,
                        }}
                    >
                        {searchable && (
                            <div className="p-3 border-b border-neutral-200">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Tìm kiếm..."
                                        aria-label="Lọc danh sách tùy chọn"
                                        className="w-full pl-9 pr-3 py-2 text-neutral-900 placeholder:text-neutral-600 border border-neutral-400 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500 text-sm"
                                        style={{ backgroundColor: "#FFFCF5" }}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}
                        <div
                            className="max-h-60 overflow-y-auto"
                            style={{
                                scrollbarWidth: "thin",
                                scrollbarColor: "#9B2C2C rgba(255, 255, 255, 0.3)",
                            }}
                        >
                            {filteredOptions.length === 0 ? (
                                <div className="px-5 py-3 text-neutral-400 text-sm text-center" role="status">
                                    Không tìm thấy kết quả
                                </div>
                            ) : (
                                filteredOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        role="option"
                                        aria-selected={value === option}
                                        onClick={() => {
                                            onChange(option);
                                            setIsOpen(false);
                                            setSearch("");
                                            buttonRef.current?.focus();
                                        }}
                                        className={`w-full px-5 py-3 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${value === option
                                            ? "bg-primary-600 text-white font-medium"
                                            : "text-neutral-900 hover:bg-primary-100 hover:text-primary-700"
                                            }`}
                                    >
                                        {option}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}

interface VerificationData {
    step1?: {
        infoComplete: boolean;
        infoAccurate: boolean;
        formatCorrect: boolean;
        notes?: string;
        completedAt?: string;
    };
    step2?: {
        culturalValue: boolean;
        authenticity: boolean;
        accuracy: boolean;
        expertNotes?: string;
        completedAt?: string;
    };
    step3?: {
        crossChecked: boolean;
        sourcesVerified: boolean;
        finalApproval: boolean;
        finalNotes?: string;
        completedAt?: string;
    };
}

interface LocalRecordingMini {
    id?: string;
    title?: string; // Fallback for old format
    mediaType?: "audio" | "video" | "youtube";
    audioData?: string | null;
    audioUrl?: string;
    videoData?: string | null;
    youtubeUrl?: string | null;
    basicInfo?: {
        title?: string;
        artist?: string;
        composer?: string;
        language?: string;
        genre?: string;
        recordingDate?: string;
        dateEstimated?: boolean;
        dateNote?: string;
        recordingLocation?: string;
    };
    culturalContext?: {
        ethnicity?: string;
        region?: string;
        province?: string;
        eventType?: string;
        performanceType?: string;
        instruments?: string[];
    };
    additionalNotes?: {
        description?: string;
        fieldNotes?: string;
        transcription?: string;
        hasLyricsFile?: boolean;
    };
    adminInfo?: {
        collector?: string;
        copyright?: string;
        archiveOrg?: string;
        catalogId?: string;
    };
    uploadedAt?: string;
    uploader?: { id?: string; username?: string };
    moderation?: {
        status?: ModerationStatus | string;
        claimedBy?: string | null;
        claimedByName?: string | null;
        claimedAt?: string | null;
        reviewerId?: string | null;
        reviewerName?: string | null;
        reviewedAt?: string | null;
        verificationStep?: number;
        verificationData?: VerificationData;
        rejectionNote?: string;
        /** Ghi chú chuyên gia (Phase 1: expertWorkflowService overlay). */
        notes?: string;
        contributorEditLocked?: boolean;
        /** Phase 2: server 403 on assign — claim chỉ trên overlay local. */
        assignBlockedByRbac?: boolean;
    };
    /** True khi bản thu đang PENDING_REVIEW do Người đóng góp bấm "Hoàn tất chỉnh sửa" (đang chờ Chuyên gia kiểm duyệt lại). */
    resubmittedForModeration?: boolean;
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

function pickNonEmptyText(...values: Array<string | null | undefined>): string | undefined {
    for (const value of values) {
        const raw = String(value ?? "").trim();
        if (!raw) continue;
        if (raw.toUpperCase().startsWith("ID:")) continue;
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

function normalizeQueueStatus(status?: ModerationStatus | string): ModerationStatus | string {
    const raw = String(status ?? "").trim();
    if (!raw) return ModerationStatus.PENDING_REVIEW;
    if (/^\d+$/.test(raw)) {
        const n = Number(raw);
        if (n === 0) return ModerationStatus.PENDING_REVIEW;
        if (n === 1) return ModerationStatus.IN_REVIEW;
        if (n === 2) return ModerationStatus.APPROVED;
        if (n === 3) return ModerationStatus.REJECTED;
        if (n === 4) return ModerationStatus.TEMPORARILY_REJECTED;
        return ModerationStatus.PENDING_REVIEW;
    }
    const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");
    if (normalized === "pending" || normalized === "pending_review") return ModerationStatus.PENDING_REVIEW;
    if (normalized === "in_review" || normalized === "reviewing") return ModerationStatus.IN_REVIEW;
    if (normalized === "approved" || normalized === "accept") return ModerationStatus.APPROVED;
    if (normalized === "rejected" || normalized === "reject" || normalized === "permanently_rejected") {
        return ModerationStatus.REJECTED;
    }
    if (normalized === "temporarily_rejected" || normalized === "temp_rejected" || normalized === "revision_required") {
        return ModerationStatus.TEMPORARILY_REJECTED;
    }
    return raw;
}

/** Same expert + filter + sort rules as `load()` — for optimistic list updates without refetch. */
function projectModerationLists(
    migrated: LocalRecordingMini[],
    userId: string | undefined,
    statusFilter: string,
    dateSort: "newest" | "oldest",
): { expertItems: LocalRecordingMini[]; visibleItems: LocalRecordingMini[] } {
    const expertItems = migrated.filter((r) => {
        const status = normalizeQueueStatus(r.moderation?.status);
        if (r.moderation?.claimedBy === userId) return true;
        if (!r.moderation?.claimedBy && status === ModerationStatus.PENDING_REVIEW) return true;
        if (r.moderation?.reviewerId === userId) return true;
        return false;
    });
    let filtered = expertItems;
    if (statusFilter !== "ALL") {
        filtered = filtered.filter((r) => normalizeQueueStatus(r.moderation?.status) === statusFilter);
    }
    filtered = [...filtered].sort((a, b) => {
        const aDate = (a as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || a.uploadedAt || a.moderation?.reviewedAt || "";
        const bDate = (b as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || b.uploadedAt || b.moderation?.reviewedAt || "";
        const dateA = new Date(aDate || 0).getTime();
        const dateB = new Date(bDate || 0).getTime();
        return dateSort === "newest" ? dateB - dateA : dateA - dateB;
    });
    return { expertItems, visibleItems: filtered };
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
    const [items, setItems] = useState<LocalRecordingMini[]>([]);
    const [allItems, setAllItems] = useState<LocalRecordingMini[]>([]);
    const [verificationStep, setVerificationStep] = useState<Record<string, number>>({});
    const [showVerificationDialog, setShowVerificationDialog] = useState<string | null>(null);
    /** Full recording (with media blobs) for the active dialog only — cleared on close to avoid OOM. */
    const [dialogCurrentRecording, setDialogCurrentRecording] = useState<LocalRecordingMini | null>(null);
    const [verificationForms, setVerificationForms] = useState<Record<string, VerificationData>>({});
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
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
    const queueLoadInFlightRef = useRef(false);
    /** Announces queue length changes (e.g. after approve/reject removes an item from the filtered list). */
    const [moderationA11yMessage, setModerationA11yMessage] = useState("");
    const prevItemsLengthRef = useRef<number | null>(null);
    const verificationDialogPanelRef = useRef<HTMLDivElement>(null);
    const queueStatusMeta = useMemo(() => {
        const counts = allItems.reduce<Record<string, number>>((acc, item) => {
            const key = item.moderation?.status ?? "UNKNOWN";
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});
        return {
            counts,
            groups: [
                {
                    title: "Đang xử lý",
                    items: [
                        { key: "ALL", label: "Tất cả", count: allItems.length },
                        { key: ModerationStatus.PENDING_REVIEW, label: "Chờ được kiểm duyệt", count: counts[ModerationStatus.PENDING_REVIEW] ?? 0 },
                        { key: ModerationStatus.IN_REVIEW, label: "Đang được kiểm duyệt", count: counts[ModerationStatus.IN_REVIEW] ?? 0 },
                    ],
                },
                {
                    title: "Đã xử lý",
                    items: [
                        { key: ModerationStatus.APPROVED, label: "Đã được kiểm duyệt", count: counts[ModerationStatus.APPROVED] ?? 0 },
                        { key: ModerationStatus.REJECTED, label: "Đã bị từ chối vĩnh viễn", count: counts[ModerationStatus.REJECTED] ?? 0 },
                        { key: ModerationStatus.TEMPORARILY_REJECTED, label: "Đã bị từ chối tạm thời", count: counts[ModerationStatus.TEMPORARILY_REJECTED] ?? 0 },
                    ],
                },
            ],
        };
    }, [allItems]);

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

    const load = useCallback(async () => {
        if (queueLoadInFlightRef.current) return;
        queueLoadInFlightRef.current = true;
        try {
            const all = (await expertWorkflowService.getQueue()) as LocalRecordingMini[];
            const migrated = migrateVideoDataToVideoData(all);
            const { expertItems, visibleItems } = projectModerationLists(
                migrated,
                user?.id,
                statusFilter,
                dateSort,
            );
            setAllItems(expertItems);
            setItems(visibleItems);
        } catch (err) {
            console.error(err);
            setItems([]);
            setAllItems([]);
        } finally {
            queueLoadInFlightRef.current = false;
        }
    }, [user?.id, statusFilter, dateSort]);

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
                const overlaid = await expertWorkflowService.applyOverlayToRecording(raw as LocalRecording);
                if (cancelled || !overlaid) return;
                const migrated = migrateVideoDataToVideoData([overlaid as LocalRecordingMini])[0];
                if (migrated) setSelectedItemFull(migrated);
            } catch {
                setSelectedItemFull(null);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedId]);

    // Load full recording when dialog opens (single-record read → no OOM)
    useEffect(() => {
        if (!showVerificationDialog) return;
        let cancelled = false;
        (async () => {
            try {
                const raw = await getLocalRecordingFull(showVerificationDialog);
                if (cancelled || !raw) return;
                const overlaid = await expertWorkflowService.applyOverlayToRecording(raw as LocalRecording);
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
                                [showVerificationDialog]: migrated.moderation.verificationData as VerificationData,
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
        const claimResult = await expertWorkflowService.claimSubmission(id, user.id, user.username ?? "");
        if (!claimResult.success) return;
        setVerificationStep((prev) => ({ ...prev, [id]: 1 }));
        const moderation = it.moderation;
        if (moderation?.verificationData) {
            setVerificationForms((prev) => ({
                ...prev,
                [id]: moderation.verificationData as VerificationData,
            }));
        }
        await load();
        setShowVerificationDialog(id);
    };

    const validateStep = (id: string | null, step: number): boolean => {
        if (!id) return false;
        const formData = verificationForms[id];
        if (!formData) return false;

        if (step === 1) {
            const step1 = formData.step1;
            return !!(step1?.infoComplete && step1?.infoAccurate && step1?.formatCorrect);
        }
        if (step === 2) {
            const step2 = formData.step2;
            return !!(step2?.culturalValue && step2?.authenticity && step2?.accuracy);
        }
        if (step === 3) {
            const step3 = formData.step3;
            return !!(step3?.crossChecked && step3?.sourcesVerified && step3?.finalApproval);
        }
        return false;
    };

    /** True only when all checkboxes in step 1, 2 and 3 are ticked. */
    const allVerificationStepsComplete = (id: string | null): boolean => {
        if (!id) return false;
        return validateStep(id, 1) && validateStep(id, 2) && validateStep(id, 3);
    };

    const getCurrentVerificationStep = (id: string | null): number => {
        if (!id) return 1;
        const item = allItems.find(it => it.id === id);
        return verificationStep[id] || item?.moderation?.verificationStep || 1;
    };

    const prevVerificationStep = async (id?: string) => {
        if (!id || !user?.id) return;
        const currentStep = getCurrentVerificationStep(id);

        // Can't go back if already at step 1
        if (currentStep <= 1) return;

        const prevStep = currentStep - 1;
        setVerificationStep((prev) => ({ ...prev, [id]: prevStep }));

        const it = allItems.find((x) => x.id === id);
        if (it?.moderation?.claimedBy !== user.id) return;
        const currentFormData = verificationForms[id] || {};
        const verificationData = {
            ...(it.moderation?.verificationData || {}),
            ...currentFormData,
        } as ModerationVerificationData;
        // Phase 1 Spike: verification progress → EXPERT_MODERATION_STATE only.
        const ok = await expertWorkflowService.updateVerificationStep(id, { verificationStep: prevStep, verificationData });
        if (ok) await load();
    };

    const nextVerificationStep = async (id?: string) => {
        if (!id || !user?.id) return;
        const currentStep = getCurrentVerificationStep(id);

        if (currentStep < 3) {
            // Bước 1 và 2: Không cần validate, cho phép tiếp tục luôn
            const nextStep = currentStep + 1;
            setVerificationStep((prev) => ({ ...prev, [id]: nextStep }));

            const it = allItems.find((x) => x.id === id);
            if (it?.moderation?.claimedBy !== user.id) return;
            const currentFormData = verificationForms[id] || {};
            const verificationData = {
                ...(it.moderation?.verificationData || {}),
                ...currentFormData,
            } as ModerationVerificationData;
            // Phase 1 Spike: verification progress → EXPERT_MODERATION_STATE only.
            const ok = await expertWorkflowService.updateVerificationStep(id, { verificationStep: nextStep, verificationData });
            if (ok) await load();
        } else {
            // Step 3: Phải validate trước khi hoàn thành
            if (!validateStep(id, currentStep)) {
                alert(`Vui lòng hoàn thành tất cả các yêu cầu bắt buộc ở Bước ${currentStep} trước khi hoàn thành kiểm duyệt bản thu!`);
                return;
            }
            // Step 3 completed - show confirmation dialog before approving
            setApproveExpertNotes("");
            setShowApproveConfirmDialog(id);
            return;
        }
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
        const moderationApproved: LocalRecordingMini["moderation"] = {
            ...it.moderation,
            status: ModerationStatus.APPROVED,
            reviewerId: user.id,
            reviewerName: user.username ?? "",
            reviewedAt,
            claimedBy: null,
            claimedByName: null,
            claimedAt: null,
            verificationStep: undefined,
            verificationData: verificationData as VerificationData,
            assignBlockedByRbac: undefined,
        };
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
            toast.error("Không thể lưu trạng thái phê duyệt cục bộ. Thử lại.");
            return;
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
            const ok = await expertWorkflowService.syncApproveToServer(id);
            if (!ok) {
                await expertWorkflowService.restoreSubmissionOverlay(id, overlaySnapshot);
                toast.error("Máy chủ không ghi nhận phê duyệt. Đã hoàn tác trên giao diện — vui lòng thử lại.");
                await load();
                return;
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

    const updateVerificationForm = (id: string | null, step: number, field: string, value: boolean | string) => {
        if (!id) return;
        setVerificationForms(prev => {
            const current = prev[id] || {};
            const stepData = current[`step${step}` as keyof VerificationData] || {};
            return {
                ...prev,
                [id]: {
                    ...current,
                    [`step${step}`]: {
                        ...stepData,
                        [field]: value,
                        completedAt: new Date().toISOString(),
                    },
                },
            };
        });
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
        const ok = await expertWorkflowService.unclaimSubmission(id);
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
            alert("Vui lòng nhập ghi chú chuyên gia (mục xác nhận) trước khi từ chối.");
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
            toast.error("Không thể lưu trạng thái từ chối cục bộ. Thử lại.");
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
            const ok = await expertWorkflowService.syncRejectToServer(id);
            if (!ok) {
                await expertWorkflowService.restoreSubmissionOverlay(id, overlaySnapshot);
                toast.error("Máy chủ không ghi nhận từ chối. Đã hoàn tác trên giao diện — vui lòng thử lại.");
                await load();
                return;
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
        <div className="min-h-screen bg-gradient-to-b from-[#FFF7E8] to-[#FFFDF8]">
            <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
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
                            className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 p-4 pt-3 rounded-b-3xl lg:h-[calc(100dvh-220px)]"
                        >
                            {/* Left: Hàng đợi */}
                            <div className="rounded-2xl bg-white/95 shadow-sm ring-1 ring-amber-200/70 flex flex-col overflow-hidden">
                                <div className="p-4 flex-shrink-0 bg-gradient-to-b from-amber-50/40 to-white">
                                    <h2 className="text-lg font-semibold text-neutral-900 mb-1">Hàng đợi kiểm duyệt</h2>
                                    <p className="text-xs text-neutral-600 mb-3">Theo dõi bản thu theo trạng thái và ưu tiên xử lý bản mới.</p>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                            <input
                                                type="search"
                                                placeholder="Tìm bản thu..."
                                                aria-label="Tìm kiếm trong hàng đợi kiểm duyệt"
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-200 bg-white text-neutral-900 placeholder:text-neutral-500 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            {queueStatusMeta.groups.map((group) => (
                                                <div key={group.title}>
                                                    <div className="mb-1 flex items-center justify-between">
                                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                                                            {group.title}
                                                        </span>
                                                        <span className="text-[11px] text-neutral-500">
                                                            {group.items
                                                                .filter((f) => f.key !== "ALL")
                                                                .reduce((sum, f) => sum + f.count, 0)} bản thu
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {group.items.map((f) => (
                                                            <button
                                                                key={f.key}
                                                                type="button"
                                                                onClick={() => setStatusFilter(f.key)}
                                                                aria-pressed={statusFilter === f.key}
                                                                aria-label={`Lọc hàng đợi: ${f.label} (${f.count})`}
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${statusFilter === f.key
                                                                    ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                                                    : "bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700"
                                                                    }`}
                                                            >
                                                                <span>{f.label}</span>
                                                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${statusFilter === f.key ? "bg-white/20 text-white" : "bg-white text-neutral-600 border border-neutral-200"}`}>
                                                                    {f.count}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-neutral-600">Sắp xếp theo ngày</label>
                                            <SearchableDropdown
                                                value={dateSort === "newest" ? "Mới nhất" : "Cũ nhất"}
                                                onChange={(val) => setDateSort(val === "Mới nhất" ? "newest" : "oldest")}
                                                options={["Mới nhất", "Cũ nhất"]}
                                                placeholder="Chọn thứ tự"
                                                searchable={false}
                                                ariaLabel="Sắp xếp theo ngày"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="flex-1 overflow-y-auto min-h-0"
                                    role="region"
                                    aria-label="Danh sách bản thu trong hàng đợi kiểm duyệt"
                                >
                                    {items.length === 0 ? (
                                        <div className="m-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-6 text-center text-neutral-600 text-sm" role="status">
                                            Không có bản thu nào trong hàng đợi.
                                        </div>
                                    ) : (
                                        items.filter((it) => it.id).map((it) => {
                                            const status = it.moderation?.status;
                                            const borderColor =
                                                status === ModerationStatus.PENDING_REVIEW
                                                    ? "border-l-neutral-400"
                                                    : status === ModerationStatus.IN_REVIEW
                                                        ? "border-l-primary-500"
                                                        : status === ModerationStatus.APPROVED
                                                            ? "border-l-green-500"
                                                            : "border-l-red-400";
                                            const rowTitle = it.basicInfo?.title || it.title || "Không có tiêu đề";
                                            return (
                                                <div
                                                    key={it.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={
                                                        selectedId === it.id
                                                            ? `${rowTitle}, trạng thái ${getModerationStatusLabel(status)}, đang chọn`
                                                            : `${rowTitle}, trạng thái ${getModerationStatusLabel(status)}`
                                                    }
                                                    data-selected={selectedId === it.id ? "true" : undefined}
                                                    onClick={() => setSelectedId(it.id ?? null)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            setSelectedId(it.id ?? null);
                                                        }
                                                    }}
                                                    className={`m-2 p-4 rounded-xl border border-neutral-200 cursor-pointer transition-all duration-200 border-l-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 focus-visible:ring-offset-0 ${borderColor} ${selectedId === it.id ? "bg-primary-50 shadow-sm border-primary-200" : "hover:bg-amber-50/40 hover:shadow-sm"
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start gap-2 mb-1">
                                                        <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2">
                                                            {rowTitle}
                                                        </h3>
                                                        <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-neutral-200 text-neutral-900 border border-neutral-400/50">
                                                            {getModerationStatusLabel(status)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                                                        <UserIcon className="h-3.5 w-3.5 shrink-0" />
                                                        <span>{it.uploader?.username || "Khách"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-0.5">
                                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                        <span>
                                                            {it.culturalContext?.ethnicity || "—"}
                                                            {it.culturalContext?.province && ` • ${it.culturalContext.province}`}
                                                        </span>
                                                    </div>
                                                    {(it.culturalContext?.instruments?.length ?? 0) > 0 && (
                                                        <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-0.5">
                                                            <Music className="h-3.5 w-3.5 shrink-0" />
                                                            <span>{(it.culturalContext?.instruments ?? []).slice(0, 2).join(", ")}</span>
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-100">
                                                        {formatDateTime((it as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || it.uploadedAt)}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Right: Chi tiết bản thu hoặc empty state */}
                            <div className="rounded-2xl bg-gradient-to-b from-white to-neutral-50 overflow-y-auto p-4 sm:p-6 shadow-sm ring-1 ring-amber-200/70">
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
                                    } else if (item.audioData?.trim()) {
                                        mediaSrc = item.audioData;
                                        if (mediaSrc.startsWith("data:video/")) isVideo = true;
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
                                    return (
                                        <div className="space-y-6">
                                            <div className="rounded-2xl border border-neutral-200/80 shadow-md overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 text-white p-6">
                                                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                                    <div>
                                                        <h2 className="text-xl font-semibold mb-1">{item.basicInfo?.title || item.title || "Không có tiêu đề"}</h2>
                                                        <p className="text-sm text-white/80">
                                                            {ethnicityLabel} • {regionLabel} • {formatDateTime((item as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || item.uploadedAt)}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {item.moderation?.assignBlockedByRbac && (
                                                            <p className="text-xs text-amber-100 bg-amber-900/50 rounded-lg px-3 py-2 border border-amber-500/40 max-w-sm">
                                                                Claim chỉ lưu trên trình duyệt — API gán (403).
                                                            </p>
                                                        )}
                                                        {(item.moderation?.status === ModerationStatus.PENDING_REVIEW || (item.moderation?.status === ModerationStatus.IN_REVIEW && item.moderation?.claimedBy === user?.id)) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => item.id && claim(item.id)}
                                                                aria-label={
                                                                    item.moderation?.status === ModerationStatus.IN_REVIEW
                                                                        ? "Tiếp tục kiểm duyệt bản thu đã nhận"
                                                                        : "Nhận kiểm duyệt bản thu này"
                                                                }
                                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800"
                                                            >
                                                                <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                                                                {item.moderation?.status === ModerationStatus.IN_REVIEW ? "Tiếp tục kiểm duyệt" : "Bắt đầu kiểm duyệt"}
                                                            </button>
                                                        )}
                                                        {item.moderation?.status === ModerationStatus.TEMPORARILY_REJECTED && (
                                                            <p className="text-sm text-amber-200/95 bg-amber-900/40 rounded-xl px-4 py-2 border border-amber-600/50">
                                                                Bạn cần phải chờ Người đóng góp hoàn tất chỉnh sửa bản thu thì bạn mới có thể tái kiểm duyệt bản thu.
                                                            </p>
                                                        )}
                                                        {item.moderation?.status === ModerationStatus.REJECTED && (
                                                            <p className="text-sm text-red-200/95 bg-red-900/40 rounded-xl px-4 py-2 border border-red-600/50">
                                                                Bản thu đã bị từ chối vĩnh viễn và không thể chỉnh sửa bởi bất kỳ ai.
                                                            </p>
                                                        )}
                                                        {item.id && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowDeleteConfirmId(item.id!)}
                                                                aria-label="Xóa bản thu khỏi hệ thống vĩnh viễn"
                                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-medium cursor-pointer border border-red-600/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800"
                                                            >
                                                                <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                                                                Xóa bản thu khỏi hệ thống
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {mediaSrc && convertedForPlayer && (
                                                    <div
                                                        className="rounded-xl overflow-hidden bg-black/20"
                                                        role="region"
                                                        aria-label={
                                                            isVideo
                                                                ? `Trình phát video: ${item.basicInfo?.title || item.title || "Bản thu"}`
                                                                : `Trình phát âm thanh: ${item.basicInfo?.title || item.title || "Bản thu"}`
                                                        }
                                                    >
                                                        {isVideo ? (
                                                            <VideoPlayer
                                                                src={mediaSrc}
                                                                title={item.basicInfo?.title || item.title}
                                                                artist={item.basicInfo?.artist}
                                                                recording={convertedForPlayer}
                                                                showContainer={true}
                                                                showMetadataTags={false}
                                                            />
                                                        ) : (
                                                            <AudioPlayer
                                                                src={mediaSrc}
                                                                title={item.basicInfo?.title || item.title}
                                                                artist={item.basicInfo?.artist}
                                                                recording={convertedForPlayer}
                                                                showContainer={true}
                                                                showMetadataTags={false}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                                {!mediaSrc && (
                                                    <p className="text-sm text-white/70 py-2">Không có bản thu để phát.</p>
                                                )}
                                            </div>
                                            {item.id &&
                                                user?.id &&
                                                item.moderation?.claimedBy === user.id &&
                                                item.moderation?.status === ModerationStatus.IN_REVIEW && (
                                                    <div className="rounded-2xl border border-neutral-200/80 p-4 sm:p-5 bg-white shadow-sm">
                                                        <label
                                                            htmlFor={`expert-review-notes-detail-${item.id}`}
                                                            className="block text-sm font-semibold text-neutral-900 mb-1"
                                                        >
                                                            Ghi chú chuyên gia
                                                        </label>
                                                        <p
                                                            id={`expert-review-notes-detail-hint-${item.id}`}
                                                            className="text-xs text-neutral-600 mb-3 leading-relaxed"
                                                        >
                                                            {EXPERT_API_PHASE2
                                                                ? "Đồng bộ với hộp thoại kiểm duyệt; gửi nhật ký khi hoàn tất trên máy chủ."
                                                                : "Lưu cục bộ trên trình duyệt theo mã bản thu."}
                                                        </p>
                                                        <textarea
                                                            id={`expert-review-notes-detail-${item.id}`}
                                                            value={expertReviewNotesDraft[item.id] ?? ""}
                                                            onChange={(e) =>
                                                                item.id &&
                                                                handleExpertReviewNotesChange(item.id, e.target.value)
                                                            }
                                                            rows={4}
                                                            placeholder="Theo dõi ngữ cảnh, nguồn tham chiếu…"
                                                            aria-describedby={`expert-review-notes-detail-hint-${item.id}`}
                                                            className="w-full rounded-xl border border-neutral-200/90 bg-[#FFFCF5] px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-400/60 resize-y min-h-[96px]"
                                                        />
                                                    </div>
                                                )}
                                            <div className="rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-sm">
                                                <h3 className="text-base font-semibold text-neutral-900 mb-3">Thông tin bản thu</h3>
                                                <ul className="space-y-2 text-sm">
                                                    <li className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-neutral-500" /> <span>Người đóng góp: {item.uploader?.username || "Khách"}</span></li>
                                                    <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-neutral-500" /> <span>Dân tộc / Vùng: {ethnicityLabel} / {regionLabel}</span></li>
                                                    <li className="flex items-center gap-2"><Music className="h-4 w-4 text-neutral-500" /> <span>Nhạc cụ: {instrumentsLabel}</span></li>
                                                    <li>Loại sự kiện: {eventTypeLabel}</li>
                                                </ul>
                                            </div>
                                            {(item.moderation?.rejectionNote || item.moderation?.notes) && (() => {
                                                const rej = item.moderation?.rejectionNote?.trim();
                                                const n = item.moderation?.notes?.trim();
                                                const same = !!(rej && n && rej === n);
                                                return (
                                                    <div
                                                        className="rounded-2xl border border-amber-200/90 p-4 bg-amber-50 shadow-sm"
                                                        role="region"
                                                        aria-label="Ghi chú kiểm duyệt"
                                                    >
                                                        <h3 className="text-base font-semibold text-neutral-900 mb-2">Ghi chú kiểm duyệt</h3>
                                                        {same ? (
                                                            <div>
                                                                <p className="text-xs font-semibold text-neutral-800 uppercase tracking-wide mb-1">Lý do &amp; ghi chú chuyên gia</p>
                                                                <p className="text-sm text-neutral-900 whitespace-pre-wrap">{n}</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {rej && (
                                                                    <div className="mb-3 last:mb-0">
                                                                        <p className="text-xs font-semibold text-neutral-800 uppercase tracking-wide mb-1">Lý do từ chối</p>
                                                                        <p className="text-sm text-neutral-900 whitespace-pre-wrap">{rej}</p>
                                                                    </div>
                                                                )}
                                                                {n && (
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-neutral-800 uppercase tracking-wide mb-1">Ghi chú chuyên gia</p>
                                                                        <p className="text-sm text-neutral-900 whitespace-pre-wrap">{n}</p>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })()}
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
                    // Use full recording (with media) from dialog state when available; otherwise meta from list (media may still be loading)
                    const item = (dialogCurrentRecording?.id === showVerificationDialog)
                        ? dialogCurrentRecording
                        : allItems.find(it => it.id === showVerificationDialog);
                    if (!item) return null;

                    const currentStep = getCurrentVerificationStep(showVerificationDialog);
                    const stepNames = [
                        "Bước 1: Kiểm tra sơ bộ",
                        "Bước 2: Xác minh chuyên môn",
                        "Bước 3: Đối chiếu và phê duyệt"
                    ];
                    const stepDescriptions = [
                        "Đánh giá tính đầy đủ và phù hợp của thông tin",
                        "Đánh giá bởi chuyên gia về tính chính xác và giá trị văn hóa",
                        "Đối chiếu với các nguồn tài liệu và quyết định phê duyệt"
                    ];
                    return createPortal(
                        <div
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                            onClick={() => cancelVerification(showVerificationDialog)}
                            role="presentation"
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
                                ref={verificationDialogPanelRef}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="verification-dialog-title"
                                tabIndex={-1}
                                className="rounded-2xl border border-neutral-300/80 shadow-2xl backdrop-blur-sm max-w-5xl w-full overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform mt-8 outline-none focus:outline-none"
                                style={{
                                    backgroundColor: '#FFF2D6',
                                    animation: 'slideUp 0.3s ease-out',
                                    maxHeight: 'calc(100vh - 4rem)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                                    <h2 id="verification-dialog-title" className="text-2xl font-bold text-white">{stepNames[currentStep - 1]}</h2>
                                    <button
                                        type="button"
                                        onClick={() => cancelVerification(showVerificationDialog)}
                                        className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
                                        aria-label="Đóng hộp thoại kiểm duyệt"
                                    >
                                        <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="overflow-y-auto p-6 max-h-[80vh]">
                                    <div className="space-y-6">
                                        {item.moderation?.assignBlockedByRbac && (
                                            <div
                                                className="rounded-xl border border-amber-500/70 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
                                                role="status"
                                            >
                                                <p className="font-semibold text-amber-900">Chế độ chỉ trên trình duyệt (local)</p>
                                                <p className="mt-1 text-amber-900/90">
                                                    Máy chủ từ chối gán chuyên gia (403 — quyền Admin API có thể chưa bật). Bạn vẫn có thể làm việc trên máy này; trạng thái claim có thể không khớp với máy chủ hoặc phiên khác.
                                                </p>
                                            </div>
                                        )}
                                        <div
                                            className="rounded-2xl border border-neutral-200/80 shadow-md p-4 sm:p-5"
                                            style={{ backgroundColor: "#FFFCF5" }}
                                        >
                                            <label
                                                htmlFor={`expert-review-notes-dialog-${showVerificationDialog}`}
                                                className="block text-sm font-semibold text-neutral-900 mb-1"
                                            >
                                                Ghi chú chuyên gia
                                            </label>
                                            <p
                                                id={`expert-review-notes-dialog-hint-${showVerificationDialog}`}
                                                className="text-xs text-neutral-600 mb-3 leading-relaxed"
                                            >
                                                {EXPERT_API_PHASE2
                                                    ? "Nháp lưu trên trình duyệt; sau khi máy chủ ghi nhận phê duyệt/từ chối, nội dung được gửi kèm nhật ký kiểm tra (AuditLog)."
                                                    : "Lưu cục bộ theo từng bản thu (localStorage). Sẽ gộp với ghi chú ở bước xác nhận khi bạn phê duyệt hoặc từ chối."}
                                            </p>
                                            <textarea
                                                id={`expert-review-notes-dialog-${showVerificationDialog}`}
                                                value={expertReviewNotesDraft[showVerificationDialog] ?? ""}
                                                onChange={(e) =>
                                                    handleExpertReviewNotesChange(showVerificationDialog, e.target.value)
                                                }
                                                rows={4}
                                                placeholder="Theo dõi ngữ cảnh, nguồn tham chiếu, cảnh báo cho admin…"
                                                aria-describedby={`expert-review-notes-dialog-hint-${showVerificationDialog}`}
                                                className="w-full rounded-xl border border-neutral-200/90 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-400/60 resize-y min-h-[96px]"
                                            />
                                        </div>
                                        {/* Media Player Section */}
                                        <div
                                            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl"
                                            style={{ backgroundColor: '#FFFCF5' }}
                                            role="region"
                                            aria-labelledby={`verification-media-heading-${showVerificationDialog}`}
                                        >
                                            <h3 className="text-lg font-semibold text-neutral-900 mb-4" id={`verification-media-heading-${showVerificationDialog}`}>
                                                Bản thu
                                            </h3>
                                            {(() => {
                                                // Tìm nguồn media - VideoPlayer CHỈ nhận videoData hoặc YouTubeURL, AudioPlayer CHỈ nhận audioData
                                                let mediaSrc: string | undefined;
                                                let isVideo = false;

                                                // Kiểm tra YouTube URL trước (cho VideoPlayer)
                                                if (item.mediaType === "youtube" && item.youtubeUrl && item.youtubeUrl.trim()) {
                                                    mediaSrc = item.youtubeUrl.trim();
                                                    isVideo = true;
                                                } else if (item.youtubeUrl && typeof item.youtubeUrl === 'string' && item.youtubeUrl.trim() && isYouTubeUrl(item.youtubeUrl)) {
                                                    // Fallback: nếu có YouTube URL nhưng mediaType chưa được set đúng
                                                    mediaSrc = item.youtubeUrl.trim();
                                                    isVideo = true;
                                                }
                                                // Nếu là video, CHỈ dùng videoData (không fallback về audioData)
                                                else if (item.mediaType === "video") {
                                                    if (item.videoData && typeof item.videoData === 'string' && item.videoData.trim().length > 0) {
                                                        mediaSrc = item.videoData;
                                                        isVideo = true;
                                                    }
                                                    // Không fallback về audioData - VideoPlayer chỉ phát videoData
                                                }
                                                // Nếu là audio, CHỈ dùng audioData
                                                else if (item.mediaType === "audio") {
                                                    if (item.audioData && typeof item.audioData === 'string' && item.audioData.trim().length > 0) {
                                                        mediaSrc = item.audioData;
                                                        isVideo = false;
                                                    }
                                                }
                                                // Nếu mediaType chưa được set, thử phát hiện từ dữ liệu có sẵn
                                                else {
                                                    // Ưu tiên videoData nếu có
                                                    if (item.videoData && typeof item.videoData === 'string' && item.videoData.trim().length > 0) {
                                                        mediaSrc = item.videoData;
                                                        isVideo = true;
                                                    }
                                                    // Sau đó thử audioData
                                                    else if (item.audioData && typeof item.audioData === 'string' && item.audioData.trim().length > 0) {
                                                        mediaSrc = item.audioData;
                                                        // Kiểm tra xem có phải video không bằng cách xem data URL
                                                        if (mediaSrc.startsWith('data:video/')) {
                                                            isVideo = true;
                                                        } else {
                                                            isVideo = false;
                                                        }
                                                    }
                                                }

                                                // Nếu không có mediaSrc, hiển thị thông báo chi tiết
                                                if (!mediaSrc || mediaSrc.trim().length === 0) {
                                                    return (
                                                        <div className="space-y-2">
                                                            <p className="text-neutral-500">Không có bản thu nào để phát</p>
                                                            <p className="text-xs text-neutral-400">
                                                                MediaType: {item.mediaType || 'Không xác định'} |
                                                                YouTube URL: {item.youtubeUrl ? 'Có' : 'Không'} |
                                                                VideoData: {item.videoData ? `Có (${item.videoData.length} ký tự)` : 'Không'} |
                                                                AudioData: {item.audioData ? `Có (${item.audioData.length} ký tự)` : 'Không'}
                                                            </p>
                                                            {item.mediaType === "video" && !item.videoData && (
                                                                <p className="text-xs text-red-400 mt-2">
                                                                    ⚠️ Video cần có videoData để phát. Vui lòng đợi migration hoàn tất hoặc liên hệ admin.
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                // Hiển thị VideoPlayer cho video/YouTube
                                                // Convert LocalRecordingMini to Recording for type safety
                                                const convertedRecording = {
                                                    id: item.id ?? "",
                                                    title: item.basicInfo?.title || item.title || "Không có tiêu đề",
                                                    titleVietnamese: item.basicInfo?.title || item.title || "Không có tiêu đề",
                                                    description: "Bản thu đang chờ kiểm duyệt",
                                                    ethnicity: {
                                                        id: "local",
                                                        name: item.culturalContext?.ethnicity || "Không xác định",
                                                        nameVietnamese: item.culturalContext?.ethnicity || "Không xác định",
                                                        region: (() => {
                                                            const regionKey = item.culturalContext?.region as keyof typeof Region;
                                                            return Region[regionKey] ?? Region.RED_RIVER_DELTA;
                                                        })(),
                                                        recordingCount: 0,
                                                    },
                                                    region: (() => {
                                                        const regionKey = item.culturalContext?.region as keyof typeof Region;
                                                        return Region[regionKey] ?? Region.RED_RIVER_DELTA;
                                                    })(),
                                                    recordingType: RecordingType.OTHER,
                                                    duration: 0,
                                                    audioUrl: item.audioData ?? "",
                                                    instruments: [],
                                                    performers: [],
                                                    uploadedDate: item.uploadedAt || new Date().toISOString(),
                                                    uploader: {
                                                        id: item.uploader?.id || "local-user",
                                                        username: item.uploader?.username || "Khách",
                                                        email: "",
                                                        fullName: item.uploader?.username || "Khách",
                                                        role: "USER" as import("@/types").UserRole,
                                                        createdAt: new Date().toISOString(),
                                                        updatedAt: new Date().toISOString(),
                                                    },
                                                    tags: buildTagsFromLocal(item),
                                                    metadata: { recordingQuality: RecordingQuality.FIELD_RECORDING, lyrics: "" },
                                                    verificationStatus: item.moderation?.status === "APPROVED" ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
                                                    viewCount: 0,
                                                    likeCount: 0,
                                                    downloadCount: 0,
                                                    _originalLocalData: item,
                                                } as RecordingWithLocalData;
                                                if (isVideo) {
                                                    return (
                                                        <VideoPlayer
                                                            src={mediaSrc}
                                                            title={item.basicInfo?.title || item.title}
                                                            artist={item.basicInfo?.artist}
                                                            recording={convertedRecording}
                                                            showContainer={true}
                                                        />
                                                    );
                                                }

                                                // Hiển thị AudioPlayer cho audio
                                                return (
                                                    <AudioPlayer
                                                        src={mediaSrc}
                                                        title={item.basicInfo?.title || item.title}
                                                        artist={item.basicInfo?.artist}
                                                        recording={convertedRecording}
                                                        showContainer={true}
                                                    />
                                                );
                                            })()}
                                        </div>

                                        {/* Basic Information */}
                                        <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFFCF5' }}>
                                            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Thông tin cơ bản</h3>
                                            <div className="space-y-2 text-sm">
                                                <div><strong>Tiêu đề:</strong> {item.basicInfo?.title || item.title || 'Không có'}</div>
                                                {item.basicInfo?.artist && <div><strong>Nghệ sĩ:</strong> {item.basicInfo.artist}</div>}
                                                {item.basicInfo?.composer && <div><strong>Tác giả/Nhạc sĩ:</strong> {item.basicInfo.composer}</div>}
                                                {item.basicInfo?.language && <div><strong>Ngôn ngữ:</strong> {item.basicInfo.language}</div>}
                                                {item.basicInfo?.genre && <div><strong>Thể loại:</strong> {item.basicInfo.genre}</div>}
                                                {item.basicInfo?.recordingDate && (
                                                    <div>
                                                        <strong>Ngày thu:</strong> {item.basicInfo.recordingDate}
                                                        {item.basicInfo.dateEstimated && <span className="text-neutral-500"> (Ước tính)</span>}
                                                    </div>
                                                )}
                                                {item.basicInfo?.dateNote && <div><strong>Ghi chú ngày:</strong> {item.basicInfo.dateNote}</div>}
                                                {item.basicInfo?.recordingLocation && <div><strong>Địa điểm thu:</strong> {item.basicInfo.recordingLocation}</div>}
                                            </div>
                                        </div>

                                        {/* Cultural Context */}
                                        {item.culturalContext && (
                                            <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFFCF5' }}>
                                                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Bối cảnh văn hóa</h3>
                                                <div className="space-y-2 text-sm">
                                                    {item.culturalContext.ethnicity && <div><strong>Dân tộc:</strong> {item.culturalContext.ethnicity}</div>}
                                                    {item.culturalContext.region && <div><strong>Vùng:</strong> {item.culturalContext.region}</div>}
                                                    {item.culturalContext.province && <div><strong>Tỉnh/Thành phố:</strong> {item.culturalContext.province}</div>}
                                                    {item.culturalContext.eventType && <div><strong>Loại sự kiện:</strong> {item.culturalContext.eventType}</div>}
                                                    {item.culturalContext.performanceType && <div><strong>Loại biểu diễn:</strong> {item.culturalContext.performanceType}</div>}
                                                    {item.culturalContext.instruments && item.culturalContext.instruments.length > 0 && (
                                                        <div><strong>Nhạc cụ:</strong> {item.culturalContext.instruments.join(", ")}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Additional Notes */}
                                        {item.additionalNotes && (
                                            <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFFCF5' }}>
                                                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Ghi chú bổ sung</h3>
                                                <div className="space-y-2 text-sm">
                                                    {item.additionalNotes.description && (
                                                        <div>
                                                            <strong>Mô tả:</strong>
                                                            <p className="text-neutral-700 mt-1 whitespace-pre-wrap">{item.additionalNotes.description}</p>
                                                        </div>
                                                    )}
                                                    {item.additionalNotes.fieldNotes && (
                                                        <div>
                                                            <strong>Ghi chú thực địa:</strong>
                                                            <p className="text-neutral-700 mt-1 whitespace-pre-wrap">{item.additionalNotes.fieldNotes}</p>
                                                        </div>
                                                    )}
                                                    {item.additionalNotes.transcription && (
                                                        <div>
                                                            <strong>Phiên âm:</strong>
                                                            <p className="text-neutral-700 mt-1 whitespace-pre-wrap">{item.additionalNotes.transcription}</p>
                                                        </div>
                                                    )}
                                                    {item.additionalNotes.hasLyricsFile && <div><strong>Có file lời bài hát:</strong> Có</div>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Admin Info */}
                                        {item.adminInfo && (
                                            <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFFCF5' }}>
                                                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Thông tin quản trị</h3>
                                                <div className="space-y-2 text-sm">
                                                    {item.adminInfo.collector && <div><strong>Người thu thập:</strong> {item.adminInfo.collector}</div>}
                                                    {item.adminInfo.copyright && <div><strong>Bản quyền:</strong> {item.adminInfo.copyright}</div>}
                                                    {item.adminInfo.archiveOrg && <div><strong>Archive.org:</strong> {item.adminInfo.archiveOrg}</div>}
                                                    {item.adminInfo.catalogId && <div><strong>Mã catalog:</strong> {item.adminInfo.catalogId}</div>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Verification Form Section */}
                                        <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFFCF5' }}>
                                            <div className="mb-4">
                                                <p className="text-neutral-700 mb-4">{stepDescriptions[currentStep - 1]}</p>

                                                {/* Progress indicator */}
                                                <div
                                                    className="flex items-center gap-2 mb-6"
                                                    aria-label={`Tiến độ kiểm duyệt: bước ${currentStep} trong 3`}
                                                >
                                                    {[1, 2, 3].map((step) => (
                                                        <div key={step} className="flex-1">
                                                            <div className={`h-2 rounded-full ${step <= currentStep ? 'bg-primary-600' : 'bg-neutral-200'}`} aria-hidden />
                                                            <div className="text-xs text-center mt-1 text-neutral-600">Bước {step}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Validation message */}
                                                {!validateStep(showVerificationDialog, currentStep) && (
                                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                                                        <p className="text-sm text-red-600 font-medium">
                                                            Vui lòng hoàn thành tất cả các yêu cầu bắt buộc
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Step 1 Form */}
                                            {currentStep === 1 && showVerificationDialog && (
                                                <div className="space-y-4">
                                                    <h3 className="font-semibold text-neutral-800 mb-3">Yêu cầu kiểm tra <span className="text-sm text-neutral-500">(Bắt buộc)</span></h3>
                                                    <div className="space-y-3">
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Thông tin đầy đủ: Tiêu đề, nghệ sĩ, ngày thu, địa điểm, dân tộc, thể loại đã được điền đầy đủ"
                                                                checked={verificationForms[showVerificationDialog]?.step1?.infoComplete || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 1, 'infoComplete', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Thông tin đầy đủ: Tiêu đề, nghệ sĩ, ngày thu, địa điểm, dân tộc, thể loại đã được điền đầy đủ</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Thông tin chính xác: Các thông tin cơ bản phù hợp và không có mâu thuẫn"
                                                                checked={verificationForms[showVerificationDialog]?.step1?.infoAccurate || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 1, 'infoAccurate', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Thông tin chính xác: Các thông tin cơ bản phù hợp và không có mâu thuẫn</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Định dạng đúng: File media hợp lệ, chất lượng đạt yêu cầu tối thiểu"
                                                                checked={verificationForms[showVerificationDialog]?.step1?.formatCorrect || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 1, 'formatCorrect', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Định dạng đúng: File media hợp lệ, chất lượng đạt yêu cầu tối thiểu</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4">
                                                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                                                            Ghi chú kiểm tra sơ bộ <span className="text-sm text-neutral-500">(Tùy chọn)</span>
                                                        </label>
                                                        <textarea
                                                            value={verificationForms[showVerificationDialog]?.step1?.notes || ''}
                                                            onChange={(e) => updateVerificationForm(showVerificationDialog, 1, 'notes', e.target.value)}
                                                            rows={3}
                                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                                                            placeholder="Ghi chú về các vấn đề cần lưu ý hoặc cần bổ sung..."
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Step 2 Form */}
                                            {currentStep === 2 && showVerificationDialog && (
                                                <div className="space-y-4">
                                                    <h3 className="font-semibold text-neutral-800 mb-3">Đánh giá chuyên môn <span className="text-sm text-neutral-500">(Bắt buộc)</span></h3>
                                                    <div className="space-y-3">
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Giá trị văn hóa: Bản thu có giá trị văn hóa, lịch sử hoặc nghệ thuật đáng kể"
                                                                checked={verificationForms[showVerificationDialog]?.step2?.culturalValue || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 2, 'culturalValue', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Giá trị văn hóa: Bản thu có giá trị văn hóa, lịch sử hoặc nghệ thuật đáng kể</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Tính xác thực: Bản thu là bản gốc, không phải bản sao chép hoặc chỉnh sửa không được phép"
                                                                checked={verificationForms[showVerificationDialog]?.step2?.authenticity || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 2, 'authenticity', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Tính xác thực: Bản thu là bản gốc, không phải bản sao chép hoặc chỉnh sửa không được phép</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Độ chính xác: Thông tin về dân tộc, thể loại, phong cách phù hợp với nội dung bản thu"
                                                                checked={verificationForms[showVerificationDialog]?.step2?.accuracy || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 2, 'accuracy', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Độ chính xác: Thông tin về dân tộc, thể loại, phong cách phù hợp với nội dung bản thu</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4">
                                                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                                                            Đánh giá chuyên môn <span className="text-sm text-neutral-500">(Tùy chọn)</span>
                                                        </label>
                                                        <textarea
                                                            value={verificationForms[showVerificationDialog]?.step2?.expertNotes || ''}
                                                            onChange={(e) => updateVerificationForm(showVerificationDialog, 2, 'expertNotes', e.target.value)}
                                                            rows={4}
                                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                                                            placeholder="Đánh giá chi tiết về giá trị văn hóa, tính xác thực, và độ chính xác của bản thu..."
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Step 3 Form */}
                                            {currentStep === 3 && showVerificationDialog && (
                                                <div className="space-y-4">
                                                    <h3 className="font-semibold text-neutral-800 mb-3">Đối chiếu và phê duyệt cuối cùng <span className="text-sm text-neutral-500">(Bắt buộc)</span></h3>
                                                    <div className="space-y-3">
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Đã đối chiếu: Đã kiểm tra và đối chiếu với các nguồn tài liệu, cơ sở dữ liệu liên quan"
                                                                checked={verificationForms[showVerificationDialog]?.step3?.crossChecked || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 3, 'crossChecked', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Đã đối chiếu: Đã kiểm tra và đối chiếu với các nguồn tài liệu, cơ sở dữ liệu liên quan</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Nguồn đã xác minh: Nguồn gốc, người thu thập, quyền sở hữu đã được xác minh"
                                                                checked={verificationForms[showVerificationDialog]?.step3?.sourcesVerified || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 3, 'sourcesVerified', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Nguồn đã xác minh: Nguồn gốc, người thu thập, quyền sở hữu đã được xác minh</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Xác nhận phê duyệt: Tôi xác nhận đã hoàn thành tất cả các bước kiểm tra và đồng ý phê duyệt bản thu này"
                                                                checked={verificationForms[showVerificationDialog]?.step3?.finalApproval || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 3, 'finalApproval', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Xác nhận phê duyệt: Tôi xác nhận đã hoàn thành tất cả các bước kiểm tra và đồng ý phê duyệt bản thu này</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4">
                                                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                                                            Ghi chú cuối cùng <span className="text-sm text-neutral-500">(Tùy chọn)</span>
                                                        </label>
                                                        <textarea
                                                            value={verificationForms[showVerificationDialog]?.step3?.finalNotes || ''}
                                                            onChange={(e) => updateVerificationForm(showVerificationDialog, 3, 'finalNotes', e.target.value)}
                                                            rows={4}
                                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                                                            placeholder="Ghi chú cuối cùng về quá trình kiểm duyệt, các điểm đáng chú ý..."
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between gap-4 p-6 border-t border-neutral-200 bg-neutral-50/50">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => unclaim(showVerificationDialog)}
                                            aria-label="Hủy nhận kiểm duyệt và trả bản thu về hàng đợi"
                                            className="px-6 py-2.5 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                        >
                                            Hủy nhận kiểm duyệt
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (showVerificationDialog) {
                                                    setShowRejectDialog(showVerificationDialog);
                                                }
                                            }}
                                            aria-label="Từ chối bản thu đang kiểm duyệt"
                                            className="px-6 py-2.5 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-orange-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                                        >
                                            Từ chối
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {currentStep > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => prevVerificationStep(showVerificationDialog)}
                                                aria-label={`Quay lại bước ${currentStep - 1}`}
                                                className="px-6 py-2.5 bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                            >
                                                Quay lại (Bước {currentStep - 1})
                                            </button>
                                        )}
                                        {currentStep < 3 ? (
                                            <button
                                                type="button"
                                                onClick={() => nextVerificationStep(showVerificationDialog)}
                                                aria-label={`Chuyển tới bước ${currentStep + 1}`}
                                                className="px-6 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                                            >
                                                Tiếp tục (Bước {currentStep + 1})
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (showVerificationDialog) {
                                                        nextVerificationStep(showVerificationDialog);
                                                    }
                                                }}
                                                disabled={!allVerificationStepsComplete(showVerificationDialog)}
                                                aria-label="Hoàn thành kiểm duyệt và mở xác nhận phê duyệt"
                                                className="px-6 py-2.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-green-600/40 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                                            >
                                                Hoàn thành kiểm duyệt
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        , document.body
                    );
                })()}

                {/* Rejection Dialog */}
                {showRejectDialog && createPortal(
                    <div
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                        role="presentation"
                        onClick={(e) => { if (e.target === e.currentTarget) { setShowRejectDialog(null); setRejectNote(""); setRejectType("direct"); } }}
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
                            aria-labelledby="moderation-reject-dialog-title"
                            className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-lg w-full p-6 pointer-events-auto transform outline-none"
                            style={{
                                backgroundColor: '#FFF2D6',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 id="moderation-reject-dialog-title" className="text-xl font-semibold mb-4 text-neutral-800">Từ chối bản thu</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">Loại từ chối</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 select-none">
                                            <input
                                                type="radio"
                                                name="rejectType"
                                                value="direct"
                                                checked={rejectType === "direct"}
                                                onChange={(e) => setRejectType(e.target.value as "direct" | "temporary")}
                                                aria-label="Từ chối vĩnh viễn"
                                                className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                            />
                                            <div>
                                                <span className="text-neutral-800 font-medium">Từ chối vĩnh viễn</span>
                                                <p className="text-sm text-neutral-600">Dùng khi sai thông tin trầm trọng, bị trùng file, v.v.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 select-none">
                                            <input
                                                type="radio"
                                                name="rejectType"
                                                value="temporary"
                                                checked={rejectType === "temporary"}
                                                onChange={(e) => setRejectType(e.target.value as "direct" | "temporary")}
                                                aria-label="Từ chối tạm thời"
                                                className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                            />
                                            <div>
                                                <span className="text-neutral-800 font-medium">Từ chối tạm thời</span>
                                                <p className="text-sm text-neutral-600">Người đóng góp có thể chỉnh sửa và gửi lại</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="moderation-reject-reason" className="block text-sm font-medium text-neutral-800 mb-2">Lý do từ chối</label>
                                    <p id="reject-dialog-type-hint" className="text-xs text-neutral-700 mb-2">
                                        Bắt buộc nhập lý do trước khi xác nhận từ chối.
                                    </p>
                                    <textarea
                                        id="moderation-reject-reason"
                                        value={rejectNote}
                                        onChange={(e) => setRejectNote(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                                        style={{ backgroundColor: "#FFFCF5" }}
                                        placeholder={rejectType === "temporary" ? "Nhập lý do từ chối và ghi chú những điểm cần chỉnh sửa..." : "Nhập lý do từ chối..."}
                                        aria-required="true"
                                        aria-describedby="reject-dialog-type-hint"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowRejectDialog(null); setRejectNote(""); setRejectType("direct"); }}
                                        className="px-4 py-2 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (showRejectDialog) {
                                                if (!rejectNote.trim()) {
                                                    setShowRejectNoteWarningDialog(true);
                                                    return;
                                                }
                                                setRejectConfirmExpertNotes(rejectNote);
                                                setShowRejectConfirmDialog(showRejectDialog);
                                            }
                                        }}
                                        className="px-4 py-2 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                    >
                                        {rejectType === "direct" ? "Từ chối vĩnh viễn" : "Từ chối tạm thời"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>, document.body
                )}

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
                            className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform outline-none"
                            style={{
                                backgroundColor: '#FFF2D6',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                                <h2 id="moderation-unclaim-dialog-title" className="text-2xl font-bold text-white">Xác nhận hủy nhận kiểm duyệt</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowUnclaimDialog(null)}
                                    className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
                                    aria-label="Đóng"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-6">
                                <div className="rounded-2xl shadow-md border border-neutral-200 p-8" style={{ backgroundColor: '#FFFCF5' }}>
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
                            <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200/80 bg-neutral-50/50">
                                <button
                                    type="button"
                                    onClick={() => setShowUnclaimDialog(null)}
                                    className="px-6 py-2.5 bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmUnclaim}
                                    className="px-6 py-2.5 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
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
                            className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform"
                            style={{
                                backgroundColor: '#FFF2D6',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                                <h2 id="moderation-approve-dialog-title" className="text-2xl font-bold text-white">Xác nhận phê duyệt</h2>
                                <button
                                    type="button"
                                    onClick={() => { setShowApproveConfirmDialog(null); setApproveExpertNotes(""); }}
                                    className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
                                    aria-label="Đóng hộp thoại phê duyệt"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-6">
                                <div className="rounded-2xl shadow-md border border-neutral-200 p-8" style={{ backgroundColor: '#FFFCF5' }}>
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
                            <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200 bg-neutral-50/50">
                                <button
                                    type="button"
                                    onClick={() => { setShowApproveConfirmDialog(null); setApproveExpertNotes(""); }}
                                    className="px-6 py-2.5 bg-neutral-200 text-neutral-900 rounded-full font-medium hover:bg-neutral-300 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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
                            className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform"
                            style={{
                                backgroundColor: '#FFF2D6',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                                <h2 id="moderation-reject-confirm-title" className="text-2xl font-bold text-white">Xác nhận từ chối</h2>
                                <button
                                    type="button"
                                    onClick={() => { setShowRejectConfirmDialog(null); setRejectConfirmExpertNotes(""); }}
                                    className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
                                    aria-label="Đóng hộp thoại xác nhận từ chối"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-6">
                                <div className="rounded-2xl shadow-md border border-neutral-200 p-8" style={{ backgroundColor: '#FFFCF5' }}>
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
                            <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200 bg-neutral-50/50">
                                <button
                                    type="button"
                                    onClick={() => { setShowRejectConfirmDialog(null); setRejectConfirmExpertNotes(""); }}
                                    className="px-6 py-2.5 bg-neutral-200 text-neutral-900 rounded-full font-medium hover:bg-neutral-300 transition-colors shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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
                            className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform outline-none"
                            style={{
                                backgroundColor: '#FFF2D6',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                                <h2 id="moderation-reject-warning-title" className="text-2xl font-bold text-white">Cảnh báo</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowRejectNoteWarningDialog(false)}
                                    className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
                                    aria-label="Đóng"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-6">
                                <div className="rounded-2xl shadow-md border border-neutral-200 p-8" style={{ backgroundColor: '#FFFCF5' }}>
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