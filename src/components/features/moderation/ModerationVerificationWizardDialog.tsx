import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, Ref } from 'react';
import { createPortal } from 'react-dom';

import AudioPlayer from '@/components/features/AudioPlayer';
import VideoPlayer from '@/components/features/VideoPlayer';
import { EXPERT_API_PHASE2 } from '@/config/expertWorkflowPhase';
import { MODERATION_EXPERT_TEXTAREA_MAX_LENGTH } from '@/config/validationConstants';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { buildRecordingForModerationWizard } from '@/features/moderation/utils/buildRecordingForModerationWizard';
import { resolveCulturalContextForDisplay } from '@/features/moderation/utils/resolveReferenceDisplayStrings';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';
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
  onUpdateVerificationForm: (step: number, field: string, value: boolean | string) => void;
}) {
  const stepNames = [
    'Bước 1: Kiểm tra sơ bộ',
    'Bước 2: Xác minh chuyên môn',
    'Bước 3: Đối chiếu và phê duyệt',
  ];
  const stepDescriptions = [
    'Đánh giá tính đầy đủ và phù hợp của thông tin',
    'Đánh giá bởi chuyên gia về tính chính xác và giá trị văn hóa',
    'Đối chiếu với các nguồn tài liệu và quyết định phê duyệt',
  ];

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
            {stepNames[currentStep - 1]}
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
                  {stepNames[currentStep - 1]}
                </h3>
                <p
                  id={`verification-step-description-${currentStep}`}
                  className="text-neutral-700 mb-4"
                >
                  {stepDescriptions[currentStep - 1]}
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
                    Yêu cầu kiểm tra <span className="text-sm text-neutral-500">(Bắt buộc)</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Thông tin đầy đủ: Tiêu đề, nghệ sĩ, ngày thu, địa điểm, dân tộc, thể loại đã được điền đầy đủ"
                        checked={formSlice?.step1?.infoComplete || false}
                        onChange={(e) =>
                          onUpdateVerificationForm(1, 'infoComplete', e.target.checked)
                        }
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        Thông tin đầy đủ: Tiêu đề, nghệ sĩ, ngày thu, địa điểm, dân tộc, thể loại đã
                        được điền đầy đủ
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Thông tin chính xác: Các thông tin cơ bản phù hợp và không có mâu thuẫn"
                        checked={formSlice?.step1?.infoAccurate || false}
                        onChange={(e) =>
                          onUpdateVerificationForm(1, 'infoAccurate', e.target.checked)
                        }
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        Thông tin chính xác: Các thông tin cơ bản phù hợp và không có mâu thuẫn
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Định dạng đúng: File media hợp lệ, chất lượng đạt yêu cầu tối thiểu"
                        checked={formSlice?.step1?.formatCorrect || false}
                        onChange={(e) =>
                          onUpdateVerificationForm(1, 'formatCorrect', e.target.checked)
                        }
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        Định dạng đúng: File media hợp lệ, chất lượng đạt yêu cầu tối thiểu
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Ghi chú kiểm tra sơ bộ{' '}
                      <span className="text-sm text-neutral-500">(Tùy chọn)</span>
                    </label>
                    <textarea
                      value={formSlice?.step1?.notes || ''}
                      onChange={(e) => onUpdateVerificationForm(1, 'notes', e.target.value)}
                      rows={3}
                      maxLength={MODERATION_EXPERT_TEXTAREA_MAX_LENGTH}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                      placeholder="Ghi chú về các vấn đề cần lưu ý hoặc cần bổ sung..."
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-800 mb-3">
                    Đánh giá chuyên môn <span className="text-sm text-neutral-500">(Bắt buộc)</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Giá trị văn hóa: Bản thu có giá trị văn hóa, lịch sử hoặc nghệ thuật đáng kể"
                        checked={formSlice?.step2?.culturalValue || false}
                        onChange={(e) =>
                          onUpdateVerificationForm(2, 'culturalValue', e.target.checked)
                        }
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        Giá trị văn hóa: Bản thu có giá trị văn hóa, lịch sử hoặc nghệ thuật đáng kể
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Tính xác thực: Bản thu là bản gốc, không phải bản sao chép hoặc chỉnh sửa không được phép"
                        checked={formSlice?.step2?.authenticity || false}
                        onChange={(e) =>
                          onUpdateVerificationForm(2, 'authenticity', e.target.checked)
                        }
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        Tính xác thực: Bản thu là bản gốc, không phải bản sao chép hoặc chỉnh sửa
                        không được phép
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Độ chính xác: Thông tin về dân tộc, thể loại, phong cách phù hợp với nội dung bản thu"
                        checked={formSlice?.step2?.accuracy || false}
                        onChange={(e) => onUpdateVerificationForm(2, 'accuracy', e.target.checked)}
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        Độ chính xác: Thông tin về dân tộc, thể loại, phong cách phù hợp với nội
                        dung bản thu
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Đánh giá chuyên môn{' '}
                      <span className="text-sm text-neutral-500">(Tùy chọn)</span>
                    </label>
                    <textarea
                      value={formSlice?.step2?.expertNotes || ''}
                      onChange={(e) => onUpdateVerificationForm(2, 'expertNotes', e.target.value)}
                      rows={4}
                      maxLength={MODERATION_EXPERT_TEXTAREA_MAX_LENGTH}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                      placeholder="Đánh giá chi tiết về giá trị văn hóa, tính xác thực, và độ chính xác của bản thu..."
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-800 mb-3">
                    Đối chiếu và phê duyệt cuối cùng{' '}
                    <span className="text-sm text-neutral-500">(Bắt buộc)</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Đã đối chiếu: Đã kiểm tra và đối chiếu với các nguồn tài liệu, cơ sở dữ liệu liên quan"
                        checked={formSlice?.step3?.crossChecked || false}
                        onChange={(e) =>
                          onUpdateVerificationForm(3, 'crossChecked', e.target.checked)
                        }
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        Đã đối chiếu: Đã kiểm tra và đối chiếu với các nguồn tài liệu, cơ sở dữ liệu
                        liên quan
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Nguồn đã xác minh: Nguồn gốc, người thu thập, quyền sở hữu đã được xác minh"
                        checked={formSlice?.step3?.sourcesVerified || false}
                        onChange={(e) =>
                          onUpdateVerificationForm(3, 'sourcesVerified', e.target.checked)
                        }
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        Nguồn đã xác minh: Nguồn gốc, người thu thập, quyền sở hữu đã được xác minh
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Xác nhận phê duyệt: Tôi xác nhận đã hoàn thành tất cả các bước kiểm tra và đồng ý phê duyệt bản thu này"
                        checked={formSlice?.step3?.finalApproval || false}
                        onChange={(e) =>
                          onUpdateVerificationForm(3, 'finalApproval', e.target.checked)
                        }
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        Xác nhận phê duyệt: Tôi xác nhận đã hoàn thành tất cả các bước kiểm tra và
                        đồng ý phê duyệt bản thu này
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label="Nội dung nhạy cảm: Đề xuất áp dụng hạn chế công bố cho bản ghi này"
                        checked={formSlice?.step3?.sensitiveContent || false}
                        onChange={(e) =>
                          onUpdateVerificationForm(3, 'sensitiveContent', e.target.checked)
                        }
                        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-neutral-300 accent-primary-600 hover:accent-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
                      />
                      <span className="text-neutral-700">
                        Nội dung nhạy cảm: Đề xuất áp dụng hạn chế công bố cho bản ghi này
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label
                      htmlFor="verification-final-notes"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      Ghi chú cuối cùng <span className="text-sm text-neutral-500">(Tùy chọn)</span>
                    </label>
                    <textarea
                      id="verification-final-notes"
                      value={formSlice?.step3?.finalNotes || ''}
                      onChange={(e) => onUpdateVerificationForm(3, 'finalNotes', e.target.value)}
                      rows={4}
                      maxLength={MODERATION_EXPERT_TEXTAREA_MAX_LENGTH}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
                      placeholder="Ghi chú cuối cùng về quá trình kiểm duyệt, các điểm đáng chú ý..."
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
