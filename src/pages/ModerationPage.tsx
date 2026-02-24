import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Region, RecordingType, RecordingQuality, VerificationStatus, Recording, UserRole, RecordingMetadata, Instrument } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { ModerationStatus } from "@/types";
import AudioPlayer from "@/components/features/AudioPlayer";
import VideoPlayer from "@/components/features/VideoPlayer";
import { isYouTubeUrl } from "@/utils/youtube";
import { migrateVideoDataToVideoData, formatDateTime, getModerationStatusLabel } from "@/utils/helpers";
import { buildTagsFromLocal } from "@/utils/recordingTags";
import { createPortal } from "react-dom";
import { ChevronDown, Search, AlertCircle, X, FileText, MessageSquare, BookOpen, MapPin, Music, User as UserIcon, CheckCircle, Trash2 } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import ForbiddenPage from "@/pages/ForbiddenPage";
import { getLocalRecordingMetaList, getLocalRecordingFull, setLocalRecording, toMeta, removeLocalRecording } from "@/services/recordingStorage";
import { recordingRequestService } from "@/services/recordingRequestService";

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
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

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

    return (
        <div ref={dropdownRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400 rounded-full focus:outline-none focus:border-primary-500 transition-colors text-left flex items-center justify-between ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
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
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Tìm kiếm..."
                                        className="w-full pl-9 pr-3 py-2 text-neutral-900 placeholder-neutral-500 border border-neutral-400 rounded-full focus:outline-none focus:border-primary-500 text-sm"
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
                                <div className="px-5 py-3 text-neutral-400 text-sm text-center">
                                    Không tìm thấy kết quả
                                </div>
                            ) : (
                                filteredOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => {
                                            onChange(option);
                                            setIsOpen(false);
                                            setSearch("");
                                        }}
                                        className={`w-full px-5 py-3 text-left text-sm transition-colors ${value === option
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
        contributorEditLocked?: boolean;
    };
    /** True khi bản thu đang PENDING_REVIEW do Người đóng góp bấm "Hoàn tất chỉnh sửa" (đang chờ Chuyên gia kiểm duyệt lại). */
    resubmittedForModeration?: boolean;
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
    const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);
    type ExpertTabId = "review" | "ai" | "knowledge";
    const [activeTab, setActiveTab] = useState<ExpertTabId>("review");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedItemFull, setSelectedItemFull] = useState<LocalRecordingMini | null>(null);

    const load = useCallback(async () => {
        try {
            const all = await getLocalRecordingMetaList() as LocalRecordingMini[];
            const migrated = migrateVideoDataToVideoData(all);
            // Filter by claimedBy - only show items claimed by this expert or unclaimed items
            // When an expert claims an item, it's "put in their bag" - other experts can't see it
            const expertItems = migrated.filter(
                (r) => {
                    // Show items claimed by this expert (they are "in the bag")
                    if (r.moderation?.claimedBy === user?.id) return true;
                    // Show unclaimed items (available for claiming)
                    if (!r.moderation?.claimedBy && r.moderation?.status === ModerationStatus.PENDING_REVIEW) return true;
                    // Show items reviewed by this expert (approved, rejected permanently, or rejected temporarily)
                    if (r.moderation?.reviewerId === user?.id) return true;
                    // Don't show items claimed by other experts
                    return false;
                }
            );
            setAllItems(expertItems);
            // Apply filters
            let filtered = expertItems;
            if (statusFilter !== "ALL") {
                filtered = filtered.filter((r) => r.moderation?.status === statusFilter);
            }
            // Sort by date
            filtered = [...filtered].sort((a, b) => {
                const aDate = (a as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || (a as LocalRecordingMini).uploadedAt || a.moderation?.reviewedAt || '';
                const bDate = (b as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || (b as LocalRecordingMini).uploadedAt || b.moderation?.reviewedAt || '';
                const dateA = new Date(aDate || 0).getTime();
                const dateB = new Date(bDate || 0).getTime();
                return dateSort === "newest" ? dateB - dateA : dateA - dateB;
            });
            setItems(filtered);
        } catch (err) {
            console.error(err);
            setItems([]);
            setAllItems([]);
        }
    }, [user?.id, statusFilter, dateSort]);

    useEffect(() => {
        load();
        const interval = setInterval(load, 3000); // refresh to pick up changes in same tab
        return () => clearInterval(interval);
    }, [load]);

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
                const item = await getLocalRecordingFull(selectedId) as LocalRecordingMini | null;
                if (cancelled || !item) return;
                const migrated = migrateVideoDataToVideoData([item])[0];
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
                const item = await getLocalRecordingFull(showVerificationDialog) as LocalRecordingMini | null;
                if (cancelled || !item) return;
                const migrated = migrateVideoDataToVideoData([item])[0];

                if (migrated) {
                    // Keep full recording (with blobs) only in dialog state for playback; never put blobs in allItems
                    setDialogCurrentRecording(migrated);
                    // Update allItems with metadata only (no audioData/videoData) so list stays light.
                    // Merge with current item's moderation so we don't overwrite claim state (claimedBy, verificationStep)
                    // that was just set by claim() before saveItems() has persisted.
                    const metaOnly = toMeta(migrated) as LocalRecordingMini;
                    setAllItems(prev => {
                        const idx = prev.findIndex(it => it.id === showVerificationDialog);
                        if (idx >= 0) {
                            const current = prev[idx];
                            return prev.map(it =>
                                it.id === showVerificationDialog
                                    ? { ...metaOnly, moderation: { ...metaOnly.moderation, ...current?.moderation } }
                                    : it
                            );
                        }
                        return [...prev, metaOnly];
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
            if (e.key === 'Escape') {
                if (showVerificationDialog) {
                    cancelVerification(showVerificationDialog);
                }
                if (showRejectDialog) {
                    setShowRejectDialog(null);
                    setRejectNote("");
                    setRejectType("direct");
                }
                if (showUnclaimDialog) {
                    setShowUnclaimDialog(null);
                }
                if (showApproveConfirmDialog) {
                    setShowApproveConfirmDialog(null);
                }
                if (showRejectConfirmDialog) {
                    setShowRejectConfirmDialog(null);
                }
                if (showRejectNoteWarningDialog) {
                    setShowRejectNoteWarningDialog(false);
                }
                if (showDeleteConfirmId) {
                    setShowDeleteConfirmId(null);
                }
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showVerificationDialog, showRejectDialog, showUnclaimDialog, showApproveConfirmDialog, showRejectConfirmDialog, showRejectNoteWarningDialog, showDeleteConfirmId]);

    if (!user || user.role !== "EXPERT") {
        return (
            <ForbiddenPage message="Bạn cần tài khoản Chuyên gia để truy cập trang kiểm duyệt bản thu." />
        );
    }

    const saveItems = async (updated: LocalRecordingMini[]) => {
        try {
            for (const item of updated) {
                const id = item.id;
                if (!id) continue;
                const full = await getLocalRecordingFull(id) as LocalRecordingMini | null;
                const merged = full
                    ? { ...full, ...item, audioData: full.audioData, videoData: full.videoData, youtubeUrl: full.youtubeUrl }
                    : item;
                await setLocalRecording(merged as import("@/types").LocalRecording);
            }
            void load();
        } catch (err) {
            console.error(err);
        }
    };

    const claim = (id?: string) => {
        if (!id) return;
        const updated = allItems.map((it) => {
            if (it.id === id) {
                // If already claimed by another, block
                if (it.moderation?.status === ModerationStatus.IN_REVIEW && it.moderation?.claimedBy && it.moderation.claimedBy !== user?.id) {
                    return it;
                }
                // Start verification process - step 1
                setVerificationStep(prev => ({ ...prev, [id]: 1 }));
                // Load existing verification data if available
                const moderation = it.moderation;
                if (moderation?.verificationData) {
                    setVerificationForms(prev => ({
                        ...prev,
                        [id]: moderation.verificationData as VerificationData,
                    }));
                }
                setShowVerificationDialog(id);
                return {
                    ...it,
                    moderation: {
                        ...it.moderation,
                        status: ModerationStatus.IN_REVIEW,
                        claimedBy: user?.id,
                        claimedByName: user?.username,
                        claimedAt: new Date().toISOString(),
                        verificationStep: 1,
                    },
                };
            }
            return it;
        });
        setAllItems(updated);
        saveItems(updated);
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

    const prevVerificationStep = (id?: string) => {
        if (!id) return;
        const currentStep = getCurrentVerificationStep(id);

        // Can't go back if already at step 1
        if (currentStep <= 1) return;

        const prevStep = currentStep - 1;
        setVerificationStep(prev => ({ ...prev, [id]: prevStep }));

        // Save verification data to item
        const updated = allItems.map((it) => {
            if (it.id === id && it.moderation?.claimedBy === user?.id) {
                const currentFormData = verificationForms[id] || {};
                return {
                    ...it,
                    moderation: {
                        ...it.moderation,
                        verificationStep: prevStep,
                        verificationData: {
                            ...(it.moderation?.verificationData || {}),
                            ...currentFormData,
                        },
                    },
                };
            }
            return it;
        });
        setAllItems(updated);
        saveItems(updated);
    };

    const nextVerificationStep = (id?: string) => {
        if (!id) return;
        const currentStep = getCurrentVerificationStep(id);

        if (currentStep < 3) {
            // Bước 1 và 2: Không cần validate, cho phép tiếp tục luôn
            const nextStep = currentStep + 1;
            setVerificationStep(prev => ({ ...prev, [id]: nextStep }));

            // Save verification data to item
            const updated = allItems.map((it) => {
                if (it.id === id && it.moderation?.claimedBy === user?.id) {
                    const currentFormData = verificationForms[id] || {};
                    return {
                        ...it,
                        moderation: {
                            ...it.moderation,
                            verificationStep: nextStep,
                            verificationData: {
                                ...(it.moderation?.verificationData || {}),
                                ...currentFormData,
                            },
                        },
                    };
                }
                return it;
            });
            setAllItems(updated);
            saveItems(updated);
        } else {
            // Step 3: Phải validate trước khi hoàn thành
            if (!validateStep(id, currentStep)) {
                alert(`Vui lòng hoàn thành tất cả các yêu cầu bắt buộc ở Bước ${currentStep} trước khi hoàn thành kiểm duyệt bản thu!`);
                return;
            }
            // Step 3 completed - show confirmation dialog before approving
            setShowApproveConfirmDialog(id);
            return;
        }
    };

    const handleConfirmApprove = () => {
        const id = showApproveConfirmDialog;
        if (!id) return;
        // Automatically approve when all 3 steps are completed
        const updated = allItems.map((it) => {
            if (it.id === id && it.moderation?.claimedBy === user?.id) {
                const currentFormData = verificationForms[id] || {};
                setVerificationStep(prev => {
                    const newState = { ...prev };
                    delete newState[id];
                    return newState;
                });
                setVerificationForms(prev => {
                    const newState = { ...prev };
                    delete newState[id];
                    return newState;
                });
                return {
                    ...it,
                    resubmittedForModeration: false,
                    moderation: {
                        ...it.moderation,
                        status: ModerationStatus.APPROVED,
                        reviewerId: user?.id,
                        reviewerName: user?.username,
                        reviewedAt: new Date().toISOString(),
                        claimedBy: null,
                        claimedByName: null,
                        verificationStep: undefined,
                        verificationData: {
                            ...(it.moderation?.verificationData || {}),
                            ...currentFormData,
                        },
                    },
                };
            }
            return it;
        });
        setAllItems(updated);
        saveItems(updated);
        setShowVerificationDialog(null);
        setShowApproveConfirmDialog(null);
        if (selectedId === id) setSelectedId(null);
    };

    const handleConfirmReject = () => {
        const id = showRejectConfirmDialog;
        if (!id) return;
        reject(id, rejectType, rejectNote);
        if (showVerificationDialog === id) {
            setShowVerificationDialog(null);
        }
        setShowRejectDialog(null);
        setShowRejectConfirmDialog(null);
        setRejectNote("");
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

    const cancelVerification = (id?: string) => {
        if (!id) return;
        // Just close the dialog, don't unclaim
        setShowVerificationDialog(null);
    };

    const unclaim = (id?: string) => {
        if (!id) return;
        // Show confirmation dialog
        setShowUnclaimDialog(id);
    };

    const handleConfirmUnclaim = () => {
        const id = showUnclaimDialog;
        if (!id) return;
        // Cancel verification - return to PENDING_REVIEW and unclaim
        setVerificationStep(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
        });
        setVerificationForms(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
        });
        setShowVerificationDialog(null);
        setShowUnclaimDialog(null);
        const updated = allItems.map((it) => {
            if (it.id === id && it.moderation?.claimedBy === user?.id) {
                return {
                    ...it,
                    moderation: {
                        ...it.moderation,
                        status: ModerationStatus.PENDING_REVIEW,
                        claimedBy: null,
                        claimedByName: null,
                        claimedAt: null,
                        verificationStep: undefined,
                        verificationData: undefined,
                    },
                };
            }
            return it;
        });
        setAllItems(updated);
        saveItems(updated);
    };

    const handleConfirmDelete = async () => {
        const id = showDeleteConfirmId;
        if (!id) return;
        const toDelete = allItems.find(it => it.id === id);
        const recordingTitle = toDelete?.basicInfo?.title || toDelete?.title || "Không có tiêu đề";
        try {
            await removeLocalRecording(id);
            await recordingRequestService.addNotification({
                type: "recording_deleted",
                title: "Bản thu đã được Chuyên gia xóa khỏi hệ thống",
                body: `Bản thu "${recordingTitle}" đã được xóa khỏi hệ thống bởi Chuyên gia.`,
                forRoles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.EXPERT, UserRole.RESEARCHER],
                recordingId: id,
            });
            setAllItems(prev => prev.filter(it => it.id !== id));
            if (selectedId === id) setSelectedId(null);
        } finally {
            setShowDeleteConfirmId(null);
        }
    };

    // Approve function is no longer needed - approval happens automatically after step 3

    const reject = (id?: string, type: "direct" | "temporary" = "direct", note?: string) => {
        if (!id) return;
        const updated = allItems.map((it) => {
            if (it.id === id) {
                if (it.moderation?.claimedBy !== user?.id && it.moderation?.reviewerId !== user?.id) {
                    return it;
                }
                const wasResubmission = it.resubmittedForModeration === true;
                const contributorEditLocked = type === "direct" && wasResubmission;
                return {
                    ...it,
                    moderation: {
                        ...it.moderation,
                        status: type === "direct" ? ModerationStatus.REJECTED : ModerationStatus.TEMPORARILY_REJECTED,
                        reviewerId: user?.id,
                        reviewerName: user?.username,
                        reviewedAt: new Date().toISOString(),
                        rejectionNote: note || "",
                        contributorEditLocked: contributorEditLocked || it.moderation?.contributorEditLocked,
                        claimedBy: null,
                        claimedByName: null,
                    },
                };
            }
            return it;
        });
        setAllItems(updated);
        saveItems(updated);
        setShowRejectDialog(null);
        setRejectNote("");
        setRejectType("direct");
    };

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
                {/* Header — responsive; wraps on small screens */}
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
                        Kiểm duyệt bản thu
                    </h1>
                    <BackButton />
                </div>

                {/* Tabs — VietTune UI */}
                <div
                    className="border border-neutral-200/80 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm mb-6 sm:mb-8 transition-all duration-300 hover:shadow-xl min-w-0 overflow-x-hidden"
                    style={{ backgroundColor: "#FFFCF5" }}
                >
                    <nav
                        className="flex flex-wrap gap-2 p-4 sm:p-6 lg:p-8 border-b border-neutral-200/80 bg-white/50"
                        aria-label="Cổng chuyên gia"
                    >
                        {[
                            { id: "review" as const, label: "Xem duyệt bản thu", icon: FileText },
                            { id: "ai" as const, label: "Giám sát phản hồi của AI", icon: MessageSquare },
                            { id: "knowledge" as const, label: "Kho tri thức", icon: BookOpen },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                                    activeTab === tab.id
                                        ? "bg-primary-600 text-white border-primary-600 shadow-md"
                                        : "text-neutral-700 bg-white border-neutral-200/80 hover:border-primary-300 hover:bg-primary-50/80"
                                }`}
                                aria-current={activeTab === tab.id ? "page" : undefined}
                            >
                                <tab.icon className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Tab: Xem duyệt bản thu */}
                    {activeTab === "review" && (
                        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-0 min-h-[calc(100vh-280px)]">
                            {/* Left: Hàng đợi */}
                            <div
                                className="rounded-b-2xl lg:rounded-b-none border-t border-neutral-200/80 flex flex-col overflow-hidden"
                                style={{ backgroundColor: "#FFFCF5" }}
                            >
                                <div className="p-4 border-b border-neutral-200/80 flex-shrink-0">
                                    <h2 className="text-lg font-semibold text-neutral-900 mb-3">Hàng đợi kiểm duyệt</h2>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                            <input
                                                type="text"
                                                placeholder="Tìm bản thu..."
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 text-neutral-900 placeholder-neutral-500 text-sm focus:outline-none focus:border-primary-500"
                                                style={{ backgroundColor: "#FFFCF5" }}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { key: "ALL", label: "Tất cả" },
                                                { key: ModerationStatus.PENDING_REVIEW, label: "Chờ được kiểm duyệt" },
                                                { key: ModerationStatus.IN_REVIEW, label: "Đang được kiểm duyệt" },
                                                { key: ModerationStatus.APPROVED, label: "Đã được kiểm duyệt" },
                                                { key: ModerationStatus.REJECTED, label: "Đã bị từ chối vĩnh viễn" },
                                                { key: ModerationStatus.TEMPORARILY_REJECTED, label: "Đã bị từ chối tạm thời" },
                                            ].map((f) => (
                                                <button
                                                    key={f.key}
                                                    type="button"
                                                    onClick={() => setStatusFilter(f.key)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                                        statusFilter === f.key
                                                            ? "bg-primary-600 text-white"
                                                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                                    }`}
                                                >
                                                    {f.label}
                                                </button>
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
                                        />
                                    </div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto min-h-0">
                                    {items.length === 0 ? (
                                        <div className="p-4 text-center text-neutral-500 text-sm">
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
                            return (
                                <div
                                    key={it.id}
                                    onClick={() => setSelectedId(it.id ?? null)}
                                    className={`p-4 border-b border-neutral-200/80 cursor-pointer transition-colors border-l-4 ${borderColor} ${
                                        selectedId === it.id ? "bg-primary-50/80" : "hover:bg-neutral-50"
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2">
                                            {it.basicInfo?.title || it.title || "Không có tiêu đề"}
                                        </h3>
                                        <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700">
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
                            <div
                                className="rounded-b-2xl lg:rounded-bl-none border-t lg:border-t-0 lg:border-l border-neutral-200/80 overflow-y-auto p-4 sm:p-6"
                                style={{ backgroundColor: "#FFFCF5" }}
                            >
                                {selectedId && (() => {
                                    const item = selectedItemFull ?? allItems.find((i) => i.id === selectedId);
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
                                    } else if (item.mediaType === "audio" && item.audioData?.trim()) {
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
                                            audioUrl: r.audioData ?? "",
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
                                    return (
                                        <div className="space-y-6">
                                            <div className="rounded-2xl border border-neutral-200/80 shadow-md overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 text-white p-6">
                                                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                                    <div>
                                                        <h2 className="text-xl font-semibold mb-1">{item.basicInfo?.title || item.title || "Không có tiêu đề"}</h2>
                                                        <p className="text-sm text-white/80">
                                                            {item.culturalContext?.ethnicity || "—"} • {item.culturalContext?.province || item.culturalContext?.region || "—"} • {formatDateTime((item as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || item.uploadedAt)}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {(item.moderation?.status === ModerationStatus.PENDING_REVIEW || (item.moderation?.status === ModerationStatus.IN_REVIEW && item.moderation?.claimedBy === user?.id)) && (
                                                            <button
                                                                onClick={() => item.id && claim(item.id)}
                                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium cursor-pointer"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
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
                                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium cursor-pointer border border-red-500/50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Xóa bản thu khỏi hệ thống
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {mediaSrc && convertedForPlayer && (
                                                    <div className="rounded-xl overflow-hidden bg-black/20">
                                                        {isVideo ? (
                                                            <VideoPlayer src={mediaSrc} title={item.basicInfo?.title || item.title} artist={item.basicInfo?.artist} recording={convertedForPlayer} showContainer={true} />
                                                        ) : (
                                                            <AudioPlayer src={mediaSrc} title={item.basicInfo?.title || item.title} artist={item.basicInfo?.artist} recording={convertedForPlayer} showContainer={true} />
                                                        )}
                                                    </div>
                                                )}
                                                {!mediaSrc && (
                                                    <p className="text-sm text-white/70 py-2">Không có bản thu để phát.</p>
                                                )}
                                            </div>
                                            <div className="rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-sm">
                                                <h3 className="text-base font-semibold text-neutral-900 mb-3">Thông tin bản thu</h3>
                                                <ul className="space-y-2 text-sm">
                                                    <li className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-neutral-500" /> <span>Người đóng góp: {item.uploader?.username || "Khách"}</span></li>
                                                    <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-neutral-500" /> <span>Dân tộc / Vùng: {item.culturalContext?.ethnicity || "—"} / {item.culturalContext?.region || item.culturalContext?.province || "—"}</span></li>
                                                    <li className="flex items-center gap-2"><Music className="h-4 w-4 text-neutral-500" /> <span>Nhạc cụ: {item.culturalContext?.instruments?.join(", ") || "—"}</span></li>
                                                    <li>Loại sự kiện: {item.culturalContext?.eventType || "—"}</li>
                                                </ul>
                                            </div>
                                        </div>
                                    );
                                })()}
                                {!selectedId && (
                                    <div className="flex flex-col items-center justify-center min-h-[320px] text-center">
                                        <FileText className="h-16 w-16 text-primary-300 mb-4" />
                                        <h3 className="text-lg font-semibold text-neutral-800 mb-1">Chọn một bản thu</h3>
                                        <p className="text-sm text-neutral-500">Chọn bản thu từ hàng đợi bên trái để xem chi tiết và kiểm duyệt.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: Giám sát AI */}
                    {activeTab === "ai" && (
                        <div className="p-6 sm:p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
                            <MessageSquare className="h-16 w-16 text-primary-300 mb-4" />
                            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Giám sát phản hồi AI</h2>
                            <p className="text-neutral-600 max-w-md">Theo dõi và chỉnh sửa các phản hồi do AI tạo ra trước khi hiển thị cho người dùng.</p>
                        </div>
                    )}

                    {/* Tab: Kho tri thức */}
                    {activeTab === "knowledge" && (
                        <div className="p-6 sm:p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
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
                                className="rounded-2xl border border-neutral-300/80 shadow-2xl backdrop-blur-sm max-w-5xl w-full overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform mt-8"
                                style={{
                                    backgroundColor: '#FFF2D6',
                                    animation: 'slideUp 0.3s ease-out',
                                    maxHeight: 'calc(100vh - 4rem)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                                    <h2 className="text-2xl font-bold text-white">{stepNames[currentStep - 1]}</h2>
                                    <button
                                        onClick={() => cancelVerification(showVerificationDialog)}
                                        className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer"
                                        aria-label="Đóng"
                                    >
                                        <X className="h-5 w-5" strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="overflow-y-auto p-6 max-h-[80vh]">
                                    <div className="space-y-6">
                                        {/* Media Player Section */}
                                        <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFFCF5' }}>
                                            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Bản thu</h3>
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
                                                <div className="flex items-center gap-2 mb-6">
                                                    {[1, 2, 3].map((step) => (
                                                        <div key={step} className="flex-1">
                                                            <div className={`h-2 rounded-full ${step <= currentStep ? 'bg-primary-600' : 'bg-neutral-200'}`} />
                                                            <div className="text-xs text-center mt-1 text-neutral-600">Bước {step}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Validation message */}
                                                {!validateStep(showVerificationDialog, currentStep) && (
                                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Thông tin đầy đủ: Tiêu đề, nghệ sĩ, ngày thu, địa điểm, dân tộc, thể loại đã được điền đầy đủ</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Thông tin chính xác: Các thông tin cơ bản phù hợp và không có mâu thuẫn"
                                                                checked={verificationForms[showVerificationDialog]?.step1?.infoAccurate || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 1, 'infoAccurate', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Thông tin chính xác: Các thông tin cơ bản phù hợp và không có mâu thuẫn</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Định dạng đúng: File media hợp lệ, chất lượng đạt yêu cầu tối thiểu"
                                                                checked={verificationForms[showVerificationDialog]?.step1?.formatCorrect || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 1, 'formatCorrect', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none cursor-pointer"
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
                                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500"
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
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Giá trị văn hóa: Bản thu có giá trị văn hóa, lịch sử hoặc nghệ thuật đáng kể</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Tính xác thực: Bản thu là bản gốc, không phải bản sao chép hoặc chỉnh sửa không được phép"
                                                                checked={verificationForms[showVerificationDialog]?.step2?.authenticity || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 2, 'authenticity', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Tính xác thực: Bản thu là bản gốc, không phải bản sao chép hoặc chỉnh sửa không được phép</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Độ chính xác: Thông tin về dân tộc, thể loại, phong cách phù hợp với nội dung bản thu"
                                                                checked={verificationForms[showVerificationDialog]?.step2?.accuracy || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 2, 'accuracy', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none cursor-pointer"
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
                                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500"
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
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Đã đối chiếu: Đã kiểm tra và đối chiếu với các nguồn tài liệu, cơ sở dữ liệu liên quan</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Nguồn đã xác minh: Nguồn gốc, người thu thập, quyền sở hữu đã được xác minh"
                                                                checked={verificationForms[showVerificationDialog]?.step3?.sourcesVerified || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 3, 'sourcesVerified', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none cursor-pointer"
                                                            />
                                                            <span className="text-neutral-700">Nguồn đã xác minh: Nguồn gốc, người thu thập, quyền sở hữu đã được xác minh</span>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                aria-label="Xác nhận phê duyệt: Tôi xác nhận đã hoàn thành tất cả các bước kiểm tra và đồng ý phê duyệt bản thu này"
                                                                checked={verificationForms[showVerificationDialog]?.step3?.finalApproval || false}
                                                                onChange={(e) => updateVerificationForm(showVerificationDialog, 3, 'finalApproval', e.target.checked)}
                                                                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none cursor-pointer"
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
                                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500"
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
                                            onClick={() => unclaim(showVerificationDialog)}
                                            className="px-6 py-2.5 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95 cursor-pointer"
                                        >
                                            Hủy nhận kiểm duyệt
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (showVerificationDialog) {
                                                    setShowRejectDialog(showVerificationDialog);
                                                }
                                            }}
                                            className="px-6 py-2.5 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-orange-600/40 hover:scale-110 active:scale-95 cursor-pointer"
                                        >
                                            Từ chối
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {currentStep > 1 && (
                                            <button
                                                onClick={() => prevVerificationStep(showVerificationDialog)}
                                                className="px-6 py-2.5 bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                                            >
                                                Quay lại (Bước {currentStep - 1})
                                            </button>
                                        )}
                                        {currentStep < 3 ? (
                                            <button
                                                onClick={() => nextVerificationStep(showVerificationDialog)}
                                                className="px-6 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
                                            >
                                                Tiếp tục (Bước {currentStep + 1})
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    if (showVerificationDialog) {
                                                        nextVerificationStep(showVerificationDialog);
                                                    }
                                                }}
                                                disabled={!allVerificationStepsComplete(showVerificationDialog)}
                                                className="px-6 py-2.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-green-600/40 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
                            className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-lg w-full p-6 pointer-events-auto transform"
                            style={{
                                backgroundColor: '#FFF2D6',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-semibold mb-4 text-neutral-800">Từ chối bản thu</h3>
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
                                                className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 hover:accent-primary-700"
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
                                                className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 hover:accent-primary-700"
                                            />
                                            <div>
                                                <span className="text-neutral-800 font-medium">Từ chối tạm thời</span>
                                                <p className="text-sm text-neutral-600">Người đóng góp có thể chỉnh sửa và gửi lại</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">Lý do từ chối</label>
                                    <textarea
                                        value={rejectNote}
                                        onChange={(e) => setRejectNote(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500"
                                        style={{ backgroundColor: "#FFFCF5" }}
                                        placeholder={rejectType === "temporary" ? "Nhập lý do từ chối và ghi chú những điểm cần chỉnh sửa..." : "Nhập lý do từ chối..."}
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => { setShowRejectDialog(null); setRejectNote(""); setRejectType("direct"); }}
                                        className="px-4 py-2 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (showRejectDialog) {
                                                if (!rejectNote.trim()) {
                                                    setShowRejectNoteWarningDialog(true);
                                                    return;
                                                }
                                                // Show confirmation dialog
                                                setShowRejectConfirmDialog(showRejectDialog);
                                            }
                                        }}
                                        className="px-4 py-2 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95 cursor-pointer"
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
                            className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform"
                            style={{
                                backgroundColor: '#FFF2D6',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                                <h2 className="text-2xl font-bold text-white">Xác nhận hủy nhận kiểm duyệt</h2>
                                <button
                                    onClick={() => setShowUnclaimDialog(null)}
                                    className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer"
                                    aria-label="Đóng"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} />
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
                                    onClick={() => setShowUnclaimDialog(null)}
                                    className="px-6 py-2.5 bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleConfirmUnclaim}
                                    className="px-6 py-2.5 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95 cursor-pointer"
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
                        onClick={() => setShowApproveConfirmDialog(null)}
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
                            className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform"
                            style={{
                                backgroundColor: '#FFF2D6',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                                <h2 className="text-2xl font-bold text-white">Xác nhận phê duyệt</h2>
                                <button
                                    onClick={() => setShowApproveConfirmDialog(null)}
                                    className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer"
                                    aria-label="Đóng"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} />
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
                                            Bạn có chắc chắn muốn phê duyệt bản thu này?
                                        </h3>
                                        <div className="text-neutral-700 text-center space-y-1">
                                            <p>Hành động này sẽ đưa bản thu vào danh sách đã được kiểm duyệt.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200 bg-neutral-50/50">
                                <button
                                    onClick={() => setShowApproveConfirmDialog(null)}
                                    className="px-6 py-2.5 bg-neutral-200 text-neutral-800 rounded-full font-medium hover:bg-neutral-300 transition-colors shadow-sm hover:shadow-md"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleConfirmApprove}
                                    className="px-6 py-2.5 bg-green-600 text-white rounded-full font-medium hover:bg-green-500 transition-colors shadow-sm hover:shadow-md"
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
                        onClick={() => setShowRejectConfirmDialog(null)}
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
                            className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform"
                            style={{
                                backgroundColor: '#FFF2D6',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                                <h2 className="text-2xl font-bold text-white">Xác nhận từ chối</h2>
                                <button
                                    onClick={() => setShowRejectConfirmDialog(null)}
                                    className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer"
                                    aria-label="Đóng"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} />
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
                                            Bạn có chắc chắn muốn {rejectType === "direct" ? "từ chối vĩnh viễn" : "từ chối tạm thời"} bản thu này?
                                        </h3>
                                        <div className="text-neutral-700 text-center space-y-1">
                                            <p>{rejectType === "direct" ? "Bản thu sẽ bị từ chối vĩnh viễn. Người đóng góp sẽ không thể chỉnh sửa bản thu." : "Bản thu sẽ bị từ chối tạm thời. Người đóng góp sẽ có thể chỉnh sửa bản thu."}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200 bg-neutral-50/50">
                                <button
                                    onClick={() => setShowRejectConfirmDialog(null)}
                                    className="px-6 py-2.5 bg-neutral-200 text-neutral-800 rounded-full font-medium hover:bg-neutral-300 transition-colors shadow-sm hover:shadow-md"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleConfirmReject}
                                    className="px-6 py-2.5 bg-red-600 text-white rounded-full font-medium hover:bg-red-500 transition-colors shadow-sm hover:shadow-md"
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
                            className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col pointer-events-auto transform"
                            style={{
                                backgroundColor: '#FFF2D6',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
                                <h2 className="text-2xl font-bold text-white">Cảnh báo</h2>
                                <button
                                    onClick={() => setShowRejectNoteWarningDialog(false)}
                                    className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer"
                                    aria-label="Đóng"
                                >
                                    <X className="h-5 w-5" strokeWidth={2.5} />
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
                                    onClick={() => setShowRejectNoteWarningDialog(false)}
                                    className="px-6 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
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
                            onClick={() => setShowDeleteConfirmId(null)}
                            style={{
                                animation: "fadeIn 0.3s ease-out",
                                top: 0, left: 0, right: 0, bottom: 0,
                                width: "100vw", height: "100vh", position: "fixed",
                            }}
                        >
                            <div
                                className="rounded-2xl shadow-xl border border-neutral-300/80 backdrop-blur-sm max-w-md w-full overflow-hidden flex flex-col pointer-events-auto transform"
                                style={{ backgroundColor: "#FFF2D6", animation: "slideUp 0.3s ease-out" }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-neutral-700 to-neutral-800">
                                    <h2 className="text-xl font-bold text-white">Xóa bản thu khỏi hệ thống</h2>
                                    <button
                                        onClick={() => setShowDeleteConfirmId(null)}
                                        className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
                                        aria-label="Đóng"
                                    >
                                        <X className="h-5 w-5" strokeWidth={2.5} />
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
                                        onClick={() => setShowDeleteConfirmId(null)}
                                        className="px-6 py-2.5 bg-neutral-200 text-neutral-800 rounded-full font-medium hover:bg-neutral-300 transition-colors shadow-sm"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleConfirmDelete}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-full font-medium hover:bg-red-500 transition-colors shadow-sm"
                                    >
                                        <Trash2 className="h-4 w-4" />
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