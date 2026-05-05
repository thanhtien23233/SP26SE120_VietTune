import { AlertCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, Ref } from 'react';
import { createPortal } from 'react-dom';

import AudioPlayer from '@/components/features/AudioPlayer';
import DeclaredDetectedInstrumentPanel from '@/components/features/moderation/DeclaredDetectedInstrumentPanel';
import InstrumentConfidencePanel from '@/components/features/moderation/InstrumentConfidencePanel';
import MetadataSuggestionPanel from '@/components/features/upload/MetadataSuggestionPanel';
import VideoPlayer from '@/components/features/VideoPlayer';
import { EXPERT_API_PHASE2 } from '@/config/expertWorkflowPhase';
import { MODERATION_EXPERT_TEXTAREA_MAX_LENGTH } from '@/config/validationConstants';
import { VERIFICATION_STEPS } from '@/features/moderation/constants/verificationStepDefinitions';
import { useRecordingMetadataSuggestions } from '@/features/moderation/hooks/useRecordingMetadataSuggestions';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { buildRecordingForModerationWizard } from '@/features/moderation/utils/buildRecordingForModerationWizard';
import { resolveCulturalContextForDisplay } from '@/features/moderation/utils/resolveReferenceDisplayStrings';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';
import type { MetadataSuggestion } from '@/types/instrumentDetection';
import { detectCrossCaseWarning } from '@/utils/crossCaseInstrumentWarning';
import { metadataSuggestionKey } from '@/utils/instrumentMetadataMapper';
import { isYouTubeUrl } from '@/utils/youtube';

function culturalContextDepsKey(ctx: LocalRecordingMini['culturalContext']): string {
  if (!ctx) return '';
  return [
    ctx.ethnicity ?? '',
    ctx.eventType ?? '',
    ctx.region ?? '',
    ctx.province ?? '',
    ctx.performanceType ?? '',
    (ctx.instruments ?? []).join('|'),
  ].join('\u0001');
}

const overlayBackdropStyle: CSSProperties = {
  animation: 'fadeIn 0.3s ease-out',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  position: 'fixed',
};

function WizardMediaBlock({
  item,
  culturalContextForDisplay,
}: {
  item: LocalRecordingMini;
  /** Resolved UUID→tên; khi có thì tag + Recording khớp chi tiết submission. */
  culturalContextForDisplay?: LocalRecordingMini['culturalContext'];
}) {
  let mediaSrc: string | undefined;
  let isVideo = false;

  const trimStr = (s: string | null | undefined) => {
    const t = typeof s === 'string' ? s.trim() : '';
    return t.length > 0 ? t : undefined;
  };

  /** Phase 2 queue: URL từ API nằm ở `audioUrl` / `videoData`; bản cục bộ có thể dùng `audioData` (data URL). */
  const videoSrc = trimStr(item.videoData ?? undefined);
  const audioSrc = trimStr(item.audioUrl ?? undefined) ?? trimStr(item.audioData ?? undefined);

  if (item.mediaType === 'youtube' && item.youtubeUrl && item.youtubeUrl.trim()) {
    mediaSrc = item.youtubeUrl.trim();
    isVideo = true;
  } else if (
    item.youtubeUrl &&
    typeof item.youtubeUrl === 'string' &&
    item.youtubeUrl.trim() &&
    isYouTubeUrl(item.youtubeUrl)
  ) {
    mediaSrc = item.youtubeUrl.trim();
    isVideo = true;
  } else if (item.mediaType === 'video' && videoSrc) {
    mediaSrc = videoSrc;
    isVideo = true;
  } else if (item.mediaType === 'audio' && audioSrc) {
    mediaSrc = audioSrc;
    isVideo = false;
  } else if (videoSrc) {
    mediaSrc = videoSrc;
    isVideo = true;
  } else if (audioSrc) {
    mediaSrc = audioSrc;
    isVideo = mediaSrc.startsWith('data:video/');
  }

  if (!mediaSrc || mediaSrc.trim().length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-neutral-500">Không có bản thu nào để phát</p>
        <p className="text-xs text-neutral-400">
          MediaType: {item.mediaType || 'Không xác định'} | YouTube: {item.youtubeUrl ? 'Có' : 'Không'}{' '}
          | Video: {item.videoData ? `Có (${item.videoData.length} ký tự)` : 'Không'} | Audio URL:{' '}
          {item.audioUrl ? `Có (${item.audioUrl.length} ký tự)` : 'Không'} | AudioData:{' '}
          {item.audioData ? `Có (${item.audioData.length} ký tự)` : 'Không'}
        </p>
        {item.mediaType === 'video' && !item.videoData && (
          <p className="text-xs text-red-400 mt-2">
            Lưu ý: Video cần có đường dẫn (videoData) để phát. Nếu lỗi kéo dài, liên hệ quản trị.
          </p>
        )}
      </div>
    );
  }

  const convertedRecording = buildRecordingForModerationWizard(item, {
    culturalContext: culturalContextForDisplay ?? item.culturalContext,
  });
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
  return (
    <AudioPlayer
      src={mediaSrc}
      title={item.basicInfo?.title || item.title}
      artist={item.basicInfo?.artist}
      recording={convertedRecording}
      showContainer={true}
    />
  );
}

export function ModerationVerificationWizardDialog({
  submissionId,
  item,
  panelRef,
  expertReviewNotesDraft,
  onExpertReviewNotesChange,
  formSlice,
  currentStep,
  onClose,
  onUnclaim,
  onOpenReject,
  onPrevStep,
  onNextStep,
  onCompleteFinalStep,
  isCurrentStepValid,
  allStepsComplete,
  onUpdateVerificationForm,
}: {
  submissionId: string;
  item: LocalRecordingMini;
  panelRef: Ref<HTMLDivElement>;
  expertReviewNotesDraft: string;
  onExpertReviewNotesChange: (text: string) => void;
  formSlice: ModerationVerificationData | undefined;
  currentStep: number;
  onClose: () => void;
  onUnclaim: () => void;
  onOpenReject: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onCompleteFinalStep: () => void;
  isCurrentStepValid: boolean;
  allStepsComplete: boolean;
  onUpdateVerificationForm: (step: number, field: string, value: unknown) => void;
}) {
  const stepDef = VERIFICATION_STEPS[(currentStep === 2 || currentStep === 3 ? currentStep : 1) - 1];

  const [resolvedCulturalContext, setResolvedCulturalContext] = useState<
    LocalRecordingMini['culturalContext'] | null
  >(null);
  const culturalContextKey = culturalContextDepsKey(item.culturalContext);
  const itemRef = useRef(item);
  itemRef.current = item;
  useEffect(() => {
    const ctx = itemRef.current.culturalContext;
    setResolvedCulturalContext(null);
    if (!ctx) return;
    let cancelled = false;
    void resolveCulturalContextForDisplay(ctx)
      .then((next) => {
        if (!cancelled && next) setResolvedCulturalContext(next);
      })
      .catch((err) => {
        console.warn('resolveCulturalContextForDisplay failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [culturalContextKey, item.id]);
  const step1CulturalContext =
    item.culturalContext != null ? (resolvedCulturalContext ?? item.culturalContext) : undefined;
  const [newInstrumentOverride, setNewInstrumentOverride] = useState('');
  const step2Overrides = (formSlice?.step2?.instrumentOverrides ?? {}) as Record<
    string,
    'confirmed' | 'rejected' | 'added'
  >;
  const metadataOverrides =
    (formSlice?.step2?.expertMetadataOverrides ?? {}) as NonNullable<
      ModerationVerificationData['step2']
    >['expertMetadataOverrides'];
  const listedInstruments = Array.from(new Set(step1CulturalContext?.instruments ?? []));
  const { suggestions: metadataSuggestions, loading: metadataSuggestionsLoading } =
    useRecordingMetadataSuggestions(item.id, Boolean(item.id));
  const [metadataCorrectionDrafts, setMetadataCorrectionDrafts] = useState<Record<string, string>>({});
  const crossCase = detectCrossCaseWarning({
    instruments: step1CulturalContext?.instruments ?? [],
    songSignals: [
      item.basicInfo?.genre ?? '',
      step1CulturalContext?.performanceType ?? '',
      step1CulturalContext?.eventType ?? '',
    ],
  });
  const crossCaseSelection = formSlice?.step2?.crossCaseClassification ?? 'none';

  const upsertMetadataOverride = (suggestion: MetadataSuggestion, action: 'confirmed' | 'corrected' | 'skipped', value?: string) => {
    const key = metadataSuggestionKey(suggestion);
    onUpdateVerificationForm(2, 'expertMetadataOverrides', {
      ...(metadataOverrides ?? {}),
      [key]: { action, value: value?.trim() || undefined },
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
      onClick={onClose}
      role="presentation"
      style={overlayBackdropStyle}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-dialog-title"
        aria-describedby={`verification-step-description-${currentStep}`}
        tabIndex={-1}
        className="rounded-2xl border border-neutral-300/80 bg-surface-panel shadow-2xl backdrop-blur-sm max-w-5xl w-full overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform mt-8 outline-none focus:outline-none"
        style={{
          animation: 'slideUp 0.3s ease-out',
          maxHeight: 'calc(100vh - 4rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
          <h2 id="verification-dialog-title" className="text-2xl font-bold text-white">
            {stepDef.wizardTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
            aria-label="Đóng hộp thoại kiểm duyệt"
          >
            <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto p-6 max-h-[80vh]">
          <div className="space-y-6">
            <div
              className="rounded-2xl border border-neutral-200/80 shadow-md p-4 sm:p-5 bg-surface-panel"
            >
              <label
                htmlFor={`expert-review-notes-dialog-${submissionId}`}
                className="block text-sm font-semibold text-neutral-900 mb-1"
              >
                Ghi chú chuyên gia
              </label>
              <p
                id={`expert-review-notes-dialog-hint-${submissionId}`}
                className="text-xs text-neutral-600 mb-3 leading-relaxed"
              >
                {EXPERT_API_PHASE2
                  ? 'Nháp lưu trên trình duyệt; sau khi máy chủ ghi nhận phê duyệt/từ chối, nội dung được gửi kèm nhật ký kiểm tra (AuditLog).'
                  : 'Lưu cục bộ theo từng bản thu (localStorage). Sẽ gộp với ghi chú ở bước xác nhận khi bạn phê duyệt hoặc từ chối.'}
              </p>
              <textarea
                id={`expert-review-notes-dialog-${submissionId}`}
                value={expertReviewNotesDraft}
                onChange={(e) => onExpertReviewNotesChange(e.target.value)}
                rows={4}
                maxLength={MODERATION_EXPERT_TEXTAREA_MAX_LENGTH}
                placeholder="Theo dõi ngữ cảnh, nguồn tham chiếu, cảnh báo cho admin…"
                aria-describedby={`expert-review-notes-dialog-hint-${submissionId}`}
                className="w-full rounded-xl border border-neutral-200/90 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-400/60 resize-y min-h-[96px]"
              />
            </div>

            <div
              className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
              role="region"
              aria-labelledby={`verification-media-heading-${submissionId}`}
            >
              <h3
                className="text-lg font-semibold text-neutral-900 mb-4"
                id={`verification-media-heading-${submissionId}`}
              >
                Bản thu
              </h3>
              <WizardMediaBlock
                item={item}
                culturalContextForDisplay={step1CulturalContext ?? item.culturalContext}
              />
            </div>

            <div
              className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
            >
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Thông tin cơ bản</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Tiêu đề:</strong> {item.basicInfo?.title || item.title || 'Không có'}
                </div>
                {item.basicInfo?.artist && (
                  <div>
                    <strong>Nghệ sĩ:</strong> {item.basicInfo.artist}
                  </div>
                )}
                {item.basicInfo?.composer && (
                  <div>
                    <strong>Tác giả/Nhạc sĩ:</strong> {item.basicInfo.composer}
                  </div>
                )}
                {item.basicInfo?.language && (
                  <div>
                    <strong>Ngôn ngữ:</strong> {item.basicInfo.language}
                  </div>
                )}
                {item.basicInfo?.genre && (
                  <div>
                    <strong>Thể loại:</strong> {item.basicInfo.genre}
                  </div>
                )}
                {item.basicInfo?.recordingDate && (
                  <div>
                    <strong>Ngày thu:</strong> {item.basicInfo.recordingDate}
                    {item.basicInfo.dateEstimated && (
                      <span className="text-neutral-500"> (Ước tính)</span>
                    )}
                  </div>
                )}
                {item.basicInfo?.dateNote && (
                  <div>
                    <strong>Ghi chú ngày:</strong> {item.basicInfo.dateNote}
                  </div>
                )}
                {item.basicInfo?.recordingLocation && (
                  <div>
                    <strong>Địa điểm thu:</strong> {item.basicInfo.recordingLocation}
                  </div>
                )}
              </div>
            </div>

            {step1CulturalContext && (
              <div
                className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
              >
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Bối cảnh văn hóa</h3>
                <div className="space-y-2 text-sm">
                  {step1CulturalContext.ethnicity && (
                    <div>
                      <strong>Dân tộc:</strong> {step1CulturalContext.ethnicity}
                    </div>
                  )}
                  {step1CulturalContext.region && (
                    <div>
                      <strong>Vùng:</strong> {step1CulturalContext.region}
                    </div>
                  )}
                  {step1CulturalContext.province && (
                    <div>
                      <strong>Tỉnh/Thành phố:</strong> {step1CulturalContext.province}
                    </div>
                  )}
                  {step1CulturalContext.eventType && (
                    <div>
                      <strong>Loại sự kiện:</strong> {step1CulturalContext.eventType}
                    </div>
                  )}
                  {step1CulturalContext.performanceType && (
                    <div>
                      <strong>Loại biểu diễn:</strong> {step1CulturalContext.performanceType}
                    </div>
                  )}
                  {step1CulturalContext.instruments &&
                    step1CulturalContext.instruments.length > 0 && (
                      <div>
                        <strong>Nhạc cụ:</strong> {step1CulturalContext.instruments.join(', ')}
                      </div>
                    )}
                </div>
              </div>
            )}

            {item.additionalNotes && (
              <div
                className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
              >
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Ghi chú bổ sung</h3>
                <div className="space-y-2 text-sm">
                  {item.additionalNotes.description && (
                    <div>
                      <strong>Mô tả:</strong>
                      <p className="text-neutral-700 mt-1 whitespace-pre-wrap">
                        {item.additionalNotes.description}
                      </p>
                    </div>
                  )}
                  {item.additionalNotes.fieldNotes && (
                    <div>
                      <strong>Ghi chú thực địa:</strong>
                      <p className="text-neutral-700 mt-1 whitespace-pre-wrap">
                        {item.additionalNotes.fieldNotes}
                      </p>
                    </div>
                  )}
                  {item.additionalNotes.transcription && (
                    <div>
                      <strong>Phiên âm:</strong>
                      <p className="text-neutral-700 mt-1 whitespace-pre-wrap">
                        {item.additionalNotes.transcription}
                      </p>
                    </div>
                  )}
                  {item.additionalNotes.hasLyricsFile && (
                    <div>
                      <strong>Có file lời bài hát:</strong> Có
                    </div>
                  )}
                </div>
              </div>
            )}

            {item.adminInfo && (
              <div
                className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
              >
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Thông tin quản trị</h3>
                <div className="space-y-2 text-sm">
                  {item.adminInfo.collector && (
                    <div>
                      <strong>Người thu thập:</strong> {item.adminInfo.collector}
                    </div>
                  )}
                  {item.adminInfo.copyright && (
                    <div>
                      <strong>Bản quyền:</strong> {item.adminInfo.copyright}
                    </div>
                  )}
                  {item.adminInfo.archiveOrg && (
                    <div>
                      <strong>Archive.org:</strong> {item.adminInfo.archiveOrg}
                    </div>
                  )}
                  {item.adminInfo.catalogId && (
                    <div>
                      <strong>Mã catalog:</strong> {item.adminInfo.catalogId}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div
              className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
              role="region"
              aria-labelledby={`verification-step-heading-${currentStep}`}
            >
              <div className="mb-4">
                <h3
                  id={`verification-step-heading-${currentStep}`}
                  className="text-base font-semibold text-neutral-900 mb-2"
                >
                  {stepDef.wizardTitle}
                </h3>
                <p
                  id={`verification-step-description-${currentStep}`}
                  className="text-neutral-700 mb-4"
                >
                  {stepDef.description}
                </p>
                <div
                  className="flex items-center gap-2 mb-6"
                  aria-label={`Tiến độ kiểm duyệt: bước ${currentStep} trong 3`}
                >
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex-1">
                      <div
                        className={`h-2 rounded-full ${step <= currentStep ? 'bg-primary-600' : 'bg-neutral-200'}`}
                        aria-hidden
                      />
                      <div
                        className="text-xs text-center mt-1 text-neutral-600"
                        aria-current={step === currentStep ? 'step' : undefined}
                      >
                        Bước {step}
                      </div>
                    </div>
                  ))}
                </div>
                {!isCurrentStepValid && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                    <p className="text-sm text-red-600 font-medium">
                      Vui lòng hoàn thành tất cả các yêu cầu bắt buộc
                    </p>
                  </div>
                )}
              </div>

              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-800 mb-3">
                    {VERIFICATION_STEPS[0].sectionTitle}{' '}
                    <span className="text-sm text-neutral-500">(Bắt buộc)</span>
                  </h3>
                  <div className="space-y-3">
                    {VERIFICATION_STEPS[0].fields.map((field) => (
                      <div key={field.key} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={field.label}
                          checked={!!(formSlice?.step1 as Record<string, unknown> | undefined)?.[field.key]}
                          onChange={(e) => onUpdateVerificationForm(1, field.key, e.target.checked)}
                          className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                        />
                        <span className="text-neutral-700">{field.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {VERIFICATION_STEPS[0].notesLabel}{' '}
                      <span className="text-sm text-neutral-500">(Tùy chọn)</span>
                    </label>
                    <textarea
                      value={formSlice?.step1?.notes || ''}
                      onChange={(e) => onUpdateVerificationForm(1, VERIFICATION_STEPS[0].notesField, e.target.value)}
                      rows={3}
                      maxLength={MODERATION_EXPERT_TEXTAREA_MAX_LENGTH}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                      placeholder={VERIFICATION_STEPS[0].notesPlaceholder}
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  {crossCase.warning && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
                      <p className="flex items-start gap-2 text-xs text-amber-800">
                        <AlertCircle className="mt-0.5 h-4 w-4" />
                        {crossCase.warning}
                      </p>
                    </div>
                  )}
                  {item.id && <InstrumentConfidencePanel recordingId={item.id} enabled />}
                  {item.id && (
                    <DeclaredDetectedInstrumentPanel
                      recordingId={item.id}
                      declaredInstruments={step1CulturalContext?.instruments ?? []}
                      enabled
                    />
                  )}
                  <h3 className="font-semibold text-neutral-800 mb-3">
                    {VERIFICATION_STEPS[1].sectionTitle}{' '}
                    <span className="text-sm text-neutral-500">(Bắt buộc)</span>
                  </h3>
                  <div className="space-y-3">
                    {VERIFICATION_STEPS[1].fields.map((field) => (
                      <div key={field.key} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={field.label}
                          checked={!!(formSlice?.step2 as Record<string, unknown> | undefined)?.[field.key]}
                          onChange={(e) => onUpdateVerificationForm(2, field.key, e.target.checked)}
                          className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                        />
                        <span className="text-neutral-700">{field.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <p className="mb-3 text-sm font-medium text-neutral-800">
                      Đánh dấu cross-case nhạc cụ truyền thống/hiện đại
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          key: 'traditional_with_modern_instruments',
                          label: 'Traditional + modern instruments',
                        },
                        {
                          key: 'contemporary_with_traditional_instruments',
                          label: 'Contemporary + traditional instruments',
                        },
                        { key: 'none', label: 'Không có cross-case' },
                      ].map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => onUpdateVerificationForm(2, 'crossCaseClassification', option.key)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            crossCaseSelection === option.key
                              ? 'bg-primary-600 text-white'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <p className="mb-3 text-sm font-medium text-neutral-800">
                      Xác minh nhạc cụ (confirm/reject/add)
                    </p>
                    {listedInstruments.length > 0 ? (
                      <div className="space-y-2">
                        {listedInstruments.map((instrumentName) => {
                          const status = step2Overrides[instrumentName];
                          return (
                            <div
                              key={instrumentName}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2"
                            >
                              <span className="text-sm text-neutral-800">{instrumentName}</span>
                              <div className="flex items-center gap-2">
                                {(['confirmed', 'rejected'] as const).map((choice) => (
                                  <button
                                    key={choice}
                                    type="button"
                                    onClick={() =>
                                      onUpdateVerificationForm(2, 'instrumentOverrides', {
                                        ...step2Overrides,
                                        [instrumentName]: choice,
                                      })
                                    }
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                      status === choice
                                        ? choice === 'confirmed'
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-red-600 text-white'
                                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                    }`}
                                  >
                                    {choice === 'confirmed' ? 'Xác nhận' : 'Bác bỏ'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-600">Chưa có nhạc cụ để xác minh.</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={newInstrumentOverride}
                        onChange={(e) => setNewInstrumentOverride(e.target.value)}
                        placeholder="Thêm nhạc cụ bị thiếu..."
                        className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const name = newInstrumentOverride.trim();
                          if (!name) return;
                          onUpdateVerificationForm(2, 'instrumentOverrides', {
                            ...step2Overrides,
                            [name]: 'added',
                          });
                          setNewInstrumentOverride('');
                        }}
                        className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
                      >
                        Thêm nhạc cụ
                      </button>
                    </div>
                    {Object.entries(step2Overrides).some(([, status]) => status === 'added') && (
                      <p className="mt-2 text-xs text-neutral-600">
                        Đã thêm:{' '}
                        {Object.entries(step2Overrides)
                          .filter(([, status]) => status === 'added')
                          .map(([name]) => name)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <p className="mb-3 text-sm font-medium text-neutral-800">
                      Xác minh metadata gợi ý từ AI
                    </p>
                    <MetadataSuggestionPanel
                      suggestions={metadataSuggestions}
                      loading={metadataSuggestionsLoading}
                      readOnly
                    />
                    {metadataSuggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {metadataSuggestions.map((s) => {
                          const key = metadataSuggestionKey(s);
                          const current = metadataOverrides?.[key];
                          const draft = metadataCorrectionDrafts[key] ?? '';
                          return (
                            <div key={key} className="rounded-lg border border-neutral-200 px-3 py-2">
                              <p className="text-xs text-neutral-700">
                                <strong>{s.field}</strong>: {s.value}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => upsertMetadataOverride(s, 'confirmed')}
                                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                                    current?.action === 'confirmed'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-neutral-100 text-neutral-700'
                                  }`}
                                >
                                  Xác nhận
                                </button>
                                <button
                                  type="button"
                                  onClick={() => upsertMetadataOverride(s, 'skipped')}
                                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                                    current?.action === 'skipped'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-neutral-100 text-neutral-700'
                                  }`}
                                >
                                  Bỏ qua
                                </button>
                                <input
                                  type="text"
                                  value={draft}
                                  onChange={(e) =>
                                    setMetadataCorrectionDrafts((prev) => ({
                                      ...prev,
                                      [key]: e.target.value,
                                    }))
                                  }
                                  placeholder="Giá trị chỉnh sửa..."
                                  className="min-w-[180px] flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => upsertMetadataOverride(s, 'corrected', draft)}
                                  disabled={!draft.trim()}
                                  className="rounded-full bg-primary-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                                >
                                  Sửa
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {VERIFICATION_STEPS[1].notesLabel}{' '}
                      <span className="text-sm text-neutral-500">(Tùy chọn)</span>
                    </label>
                    <textarea
                      value={formSlice?.step2?.expertNotes || ''}
                      onChange={(e) => onUpdateVerificationForm(2, VERIFICATION_STEPS[1].notesField, e.target.value)}
                      rows={4}
                      maxLength={MODERATION_EXPERT_TEXTAREA_MAX_LENGTH}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                      placeholder={VERIFICATION_STEPS[1].notesPlaceholder}
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-800 mb-3">
                    {VERIFICATION_STEPS[2].sectionTitle}{' '}
                    <span className="text-sm text-neutral-500">(Bắt buộc)</span>
                  </h3>
                  <div className="space-y-3">
                    {VERIFICATION_STEPS[2].fields.map((field) => (
                      <div key={field.key} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={field.label}
                          checked={!!(formSlice?.step3 as Record<string, unknown> | undefined)?.[field.key]}
                          onChange={(e) => onUpdateVerificationForm(3, field.key, e.target.checked)}
                          className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                        />
                        <span className="text-neutral-700">{field.label}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={VERIFICATION_STEPS[2].optionalFields?.[0]?.label}
                        checked={formSlice?.step3?.sensitiveContent || false}
                        onChange={(e) =>
                          onUpdateVerificationForm(3, 'sensitiveContent', e.target.checked)
                        }
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        {VERIFICATION_STEPS[2].optionalFields?.[0]?.label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label
                      htmlFor="verification-final-notes"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      {VERIFICATION_STEPS[2].notesLabel}{' '}
                      <span className="text-sm text-neutral-500">(Tùy chọn)</span>
                    </label>
                    <textarea
                      id="verification-final-notes"
                      value={formSlice?.step3?.finalNotes || ''}
                      onChange={(e) => onUpdateVerificationForm(3, VERIFICATION_STEPS[2].notesField, e.target.value)}
                      rows={4}
                      maxLength={MODERATION_EXPERT_TEXTAREA_MAX_LENGTH}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                      placeholder={VERIFICATION_STEPS[2].notesPlaceholder}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 p-6 border-t border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onUnclaim}
              aria-label="Hủy nhận kiểm duyệt và trả bản thu về hàng đợi"
              className="px-6 py-2.5 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Hủy nhận kiểm duyệt
            </button>
            <button
              type="button"
              onClick={onOpenReject}
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
                onClick={onPrevStep}
                aria-label={`Quay lại bước ${currentStep - 1}`}
                className="px-6 py-2.5 bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Quay lại (Bước {currentStep - 1})
              </button>
            )}
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={onNextStep}
                aria-label={`Chuyển tới bước ${currentStep + 1}`}
                className="px-6 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              >
                Tiếp tục (Bước {currentStep + 1})
              </button>
            ) : (
              <button
                type="button"
                onClick={onCompleteFinalStep}
                disabled={!allStepsComplete}
                aria-label="Hoàn thành kiểm duyệt và mở xác nhận phê duyệt"
                className="px-6 py-2.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-green-600/40 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
              >
                Hoàn thành kiểm duyệt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
