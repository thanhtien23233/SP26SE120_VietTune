import { AlertCircle, Check, FileAudio, Music, Plus, Sparkles, Upload, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React from 'react';

import InstrumentConfidenceBar from '@/components/common/InstrumentConfidenceBar';
import AudioPlayer from '@/components/features/AudioPlayer';
import VideoPlayer from '@/components/features/VideoPlayer';
import type { DetectedInstrument, MetadataSuggestion } from '@/types/instrumentDetection';
import { groupMetadataSuggestionsForAdvisory } from '@/utils/instrumentMetadataMapper';

type MediaInfo = {
  name: string;
  size: number;
  type: string;
  duration: number;
  bitrate?: number;
  sampleRate?: number;
};

type SectionHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  required?: boolean;
};

type MediaUploadStepProps = {
  show: boolean;
  isFormDisabled: boolean;
  isEditMode: boolean;
  existingMediaSrc: string | null;
  existingMediaInfo: MediaInfo | null;
  mediaType: 'audio' | 'video';
  file: File | null;
  audioInfo: MediaInfo | null;
  title: string;
  artist: string;
  isAnalyzing: boolean;
  errors: Record<string, string>;
  createdRecordingId: string | null;
  newUploadedUrl: string | null;
  useAiAnalysis: boolean;
  instrumentPredictions: DetectedInstrument[];
  aiMetadataSuggestions: MetadataSuggestion[];
  /** Upload-time Gemini analyze in flight (advisory pipeline). */
  aiAnalysisLoading?: boolean;
  aiAnalysisError?: string | null;
  isUploadingMedia: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  SectionHeaderComponent: React.ComponentType<SectionHeaderProps>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadAndCreateDraft: () => void;
  onUseAiAnalysisChange: (value: boolean) => void;
  onMediaTypeChange: (value: 'audio' | 'video') => void;
  onResetSelectedFile: () => void;
  formatFileSize: (bytes: number) => string;
  formatDuration: (seconds: number) => string;
};

const AI_CONFIDENCE_WARNING_THRESHOLD = 0.6;
const AI_CONFIDENCE_DANGER_THRESHOLD = 0.4;

function getConfidenceNote(confidence?: number | null): { text: string; className: string } {
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
    return {
      text: 'Không rõ độ tin cậy',
      className: 'text-neutral-600',
    };
  }
  if (confidence < AI_CONFIDENCE_DANGER_THRESHOLD) {
    return {
      text: 'Độ tin cậy thấp, cần kiểm tra thủ công',
      className: 'text-red-700',
    };
  }
  if (confidence < AI_CONFIDENCE_WARNING_THRESHOLD) {
    return {
      text: 'Độ tin cậy trung bình, nên đối chiếu thêm',
      className: 'text-amber-700',
    };
  }
  return {
    text: 'Độ tin cậy tốt',
    className: 'text-emerald-700',
  };
}

export default function MediaUploadStep({
  show,
  isFormDisabled,
  isEditMode,
  existingMediaSrc,
  existingMediaInfo,
  mediaType,
  file,
  audioInfo,
  title,
  artist,
  isAnalyzing,
  errors,
  createdRecordingId,
  newUploadedUrl,
  useAiAnalysis,
  instrumentPredictions,
  aiMetadataSuggestions,
  aiAnalysisLoading = false,
  aiAnalysisError = null,
  isUploadingMedia,
  uploadProgress,
  fileInputRef,
  SectionHeaderComponent,
  onFileChange,
  onUploadAndCreateDraft,
  onUseAiAnalysisChange,
  onMediaTypeChange,
  onResetSelectedFile,
  formatFileSize,
  formatDuration,
}: MediaUploadStepProps) {
  if (!show) return null;
  const hasUploadSuccess = Boolean(createdRecordingId || (isEditMode && newUploadedUrl));
  const shouldShowAiPanel = mediaType === 'audio' && useAiAnalysis && hasUploadSuccess;
  const hasInstrumentPredictions = instrumentPredictions.length > 0;
  const showAiLoading =
    shouldShowAiPanel && (isUploadingMedia || aiAnalysisLoading) && !hasInstrumentPredictions;
  const showAiEmptyState =
    shouldShowAiPanel &&
    !isUploadingMedia &&
    !aiAnalysisLoading &&
    !hasInstrumentPredictions &&
    !aiAnalysisError;
  const advisorySuggestions = groupMetadataSuggestionsForAdvisory(aiMetadataSuggestions);
  const hasSuggestionPreview = shouldShowAiPanel && advisorySuggestions.length > 0;

  return (
    <div
      className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/45 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl"
      aria-disabled={isFormDisabled}
    >
      {(!isEditMode || !existingMediaSrc) && (
        <SectionHeaderComponent
          icon={Upload}
          title={mediaType === 'video' ? 'Tải lên file video' : 'Tải lên file âm thanh'}
          subtitle={
            mediaType === 'video'
              ? 'Hỗ trợ định dạng MP4, MOV, AVI, WebM, MKV, MPEG, WMV, 3GP, FLV'
              : 'Hỗ trợ định dạng MP3, WAV, FLAC'
          }
          required={!isEditMode}
        />
      )}

      {(!isEditMode || !existingMediaSrc) && (
        <div className="mt-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isFormDisabled || (file != null && mediaType === 'video')}
              onClick={() => {
                if (isFormDisabled || (file != null && mediaType === 'video')) return;
                onMediaTypeChange('audio');
              }}
              className={`flex min-h-[44px] items-center justify-center rounded-full border border-secondary-200/60 px-4 py-2 text-sm shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 ${
                mediaType === 'audio'
                  ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white'
                  : 'text-neutral-800 bg-surface-panel hover:bg-[#F5F0E8]'
              } ${
                isFormDisabled || (file != null && mediaType === 'video')
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileAudio className="h-4 w-4" strokeWidth={2.5} />
                <span>File âm thanh</span>
              </div>
            </button>
            <button
              type="button"
              disabled={isFormDisabled || (file != null && mediaType === 'audio')}
              onClick={() => {
                if (isFormDisabled || (file != null && mediaType === 'audio')) return;
                onMediaTypeChange('video');
              }}
              className={`flex min-h-[44px] items-center justify-center rounded-full border border-secondary-200/60 px-4 py-2 text-sm shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 ${
                mediaType === 'video'
                  ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white'
                  : 'text-neutral-800 bg-surface-panel hover:bg-[#F5F0E8]'
              } ${
                isFormDisabled || (file != null && mediaType === 'audio')
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" strokeWidth={2.5} />
                <span>File video</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {isEditMode && existingMediaSrc && !file && (
        <div
          className="mb-8 rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-white/90 to-secondary-50/40 p-6 shadow-md backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-primary-100/95 to-secondary-100/90 p-2 shadow-sm ring-1 ring-secondary-200/50">
              <Music className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-800">Tệp tin hiện tại</h3>
              <p className="text-sm text-neutral-500">Bạn đang chỉnh sửa bản ghi này</p>
            </div>
          </div>

          {mediaType === 'video' ? (
            <VideoPlayer
              src={existingMediaSrc}
              title={existingMediaInfo?.name || title}
              artist={artist || 'Đang chỉnh sửa...'}
              showContainer
            />
          ) : (
            <AudioPlayer
              src={existingMediaSrc}
              title={existingMediaInfo?.name || title}
              artist={artist || 'Đang chỉnh sửa...'}
            />
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 underline underline-offset-4"
            >
              Thay thế tệp tin khác
            </button>
          </div>
        </div>
      )}

      <div className="mt-4" id="field-file">
        <div
          onClick={() => {
            if (isFormDisabled || isAnalyzing || file) return;
            fileInputRef.current?.click();
          }}
          className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            errors.file
              ? 'border-red-500/50 bg-red-500/5'
              : file
                ? 'border-primary-500/50 bg-primary-600/5'
                : 'border-secondary-300/70 hover:border-primary-400 bg-secondary-50/20'
          } ${
            isAnalyzing
              ? 'opacity-60 cursor-wait'
              : isFormDisabled
                ? 'cursor-not-allowed'
                : file
                  ? 'cursor-default'
                  : 'cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={
              mediaType === 'video'
                ? '.mp4,.mov,.avi,.webm,.mkv,.mpeg,.mpg,.wmv,.3gp,.flv,video/*'
                : '.mp3,.wav,.flac,audio/*'
            }
            onChange={onFileChange}
            className="sr-only"
            disabled={isAnalyzing || isFormDisabled}
          />

          {isAnalyzing ? (
            <div className="space-y-3">
              <div className="animate-spin h-10 w-10 border-3 border-primary-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-neutral-800/70">Đang phân tích file...</p>
            </div>
          ) : file && audioInfo ? (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="p-3 bg-primary-600/20 rounded-2xl w-fit mx-auto">
                {mediaType === 'video' ? (
                  <Video className="h-8 w-8 text-primary-600" />
                ) : (
                  <FileAudio className="h-8 w-8 text-primary-600" />
                )}
              </div>
              <div>
                <p className="text-neutral-800 font-medium">{audioInfo.name}</p>
                <div className="flex items-center justify-center gap-4 mt-2 text-sm text-neutral-800/60">
                  <span>{formatFileSize(audioInfo.size)}</span>
                  <span>•</span>
                  <span>{formatDuration(audioInfo.duration)}</span>
                  {audioInfo.bitrate && (
                    <>
                      <span>•</span>
                      <span>~{audioInfo.bitrate} kbps</span>
                    </>
                  )}
                </div>

                {file && !createdRecordingId && (!isEditMode || !newUploadedUrl) && (
                  <div className="mt-5 w-full max-w-sm mx-auto space-y-4">
                    {mediaType === 'audio' && !isEditMode && (
                      <label
                        htmlFor="media-upload-ai-analysis"
                        aria-label="Bật phân tích AI để nhận gợi ý nhạc cụ và metadata (áp dụng thủ công ở bước 2)"
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                          useAiAnalysis
                            ? 'bg-primary-50/70 border-primary-300 ring-1 ring-primary-200'
                            : 'bg-white border-neutral-200 hover:border-primary-300'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          id="media-upload-ai-analysis"
                          type="checkbox"
                          checked={useAiAnalysis}
                          onChange={(e) => onUseAiAnalysisChange(e.target.checked)}
                          disabled={isUploadingMedia}
                          className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <div className="flex-1 text-sm text-left">
                          <div
                            className={`font-bold flex items-center gap-1.5 ${
                              useAiAnalysis ? 'text-primary-800' : 'text-neutral-700'
                            }`}
                          >
                            <Sparkles
                              className={`w-4 h-4 ${
                                useAiAnalysis ? 'text-primary-600' : 'text-neutral-400'
                              }`}
                            />
                            AI Phân tích {useAiAnalysis && '(Gợi ý)'}
                          </div>
                          <p className="text-neutral-500 text-xs mt-1 leading-snug">
                            AI trả về gợi ý nhạc cụ (độ tin cậy) và metadata ở bước 1; bạn chọn Áp dụng ở
                            bước 2 nếu muốn. Tiêu đề và nhạc sĩ/tác giả do bạn nhập. Có thể tốn thêm thời
                            gian.
                          </p>
                        </div>
                      </label>
                    )}

                    {isUploadingMedia ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-neutral-600 mb-1">
                          <span>
                            {useAiAnalysis ? 'Đang tải lên & Phân tích AI...' : 'Đang tải lên...'}
                          </span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-neutral-200/80 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUploadAndCreateDraft();
                        }}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 justify-center"
                      >
                        {useAiAnalysis ? (
                          <Sparkles className="h-4 w-4" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {isEditMode
                          ? 'Tải lên tệp thay thế'
                          : useAiAnalysis
                            ? 'Tải lên & Phân Tích'
                            : 'Bắt đầu tải lên'}
                      </button>
                    )}
                  </div>
                )}
                {(createdRecordingId || (isEditMode && newUploadedUrl)) && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 font-medium bg-emerald-50 w-full max-w-sm mx-auto p-2 rounded-xl border border-emerald-200/60">
                    <Check className="h-5 w-5" />{' '}
                    {isEditMode ? 'Đã tải lên tệp thay thế' : 'Đã tải lên thành công'}
                  </div>
                )}
                {shouldShowAiPanel && (
                  <div className="mt-4 w-full max-w-xl mx-auto rounded-xl border border-secondary-200/70 bg-white/80 p-4 text-left shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-neutral-800">
                      <Sparkles className="h-4 w-4 text-primary-600" />
                      AI Instrument Analysis
                    </div>

                    {showAiLoading && (
                      <div className="mt-3 rounded-lg border border-secondary-200/70 bg-secondary-50/60 p-3 text-sm text-neutral-700">
                        Đang phân tích nhạc cụ, bạn vẫn có thể tiếp tục sang bước tiếp theo.
                      </div>
                    )}

                    {aiAnalysisError && !showAiLoading && !hasInstrumentPredictions && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50/80 p-3 text-sm text-red-800">
                        {aiAnalysisError}
                      </div>
                    )}

                    {hasInstrumentPredictions && (
                      <div className="mt-3 space-y-3">
                        {instrumentPredictions.map((prediction) => {
                          const note = getConfidenceNote(prediction.confidence);
                          return (
                            <div key={`${prediction.id ?? prediction.name}-${prediction.confidence ?? 'na'}`}>
                              <InstrumentConfidenceBar
                                name={prediction.name}
                                confidence={prediction.confidence}
                              />
                              <p className={`mt-1 text-xs font-medium ${note.className}`}>{note.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {showAiEmptyState && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-800">
                        Không thể hiển thị kết quả AI lúc này. Bạn vẫn có thể tiếp tục điền metadata và gửi bình thường.
                      </div>
                    )}

                    <p className="mt-3 text-xs text-neutral-600">
                      AI suggestion only. Expert will verify later.
                    </p>

                    {hasSuggestionPreview && (
                      <div className="mt-4 rounded-lg border border-secondary-200/70 bg-secondary-50/50 p-3">
                        <p className="text-sm font-semibold text-neutral-800">
                          Suggested Metadata (Read-only)
                        </p>
                        <div className="mt-2 space-y-3 text-sm text-neutral-700">
                          {advisorySuggestions.map((group) => (
                            <div key={group.field}>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-neutral-800">
                                  {group.field === 'region'
                                    ? 'Suggested Region'
                                    : group.field === 'genre'
                                      ? 'Suggested Genre'
                                      : group.field === 'eventType'
                                        ? 'Suggested Event Type'
                                        : 'Suggested Ethnic Group'}
                                </p>
                                {group.conflictDetected && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                    Mixed influence
                                  </span>
                                )}
                                {group.requiresExpert && (
                                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                    Requires expert review
                                  </span>
                                )}
                              </div>
                              {group.candidates.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                      Primary
                                    </p>
                                    <p className="text-sm text-neutral-800">
                                      {group.candidates[0].label}{' '}
                                      <span className="font-semibold text-neutral-600">
                                        {Math.round(group.candidates[0].score * 100)}%
                                      </span>
                                      {group.candidates[0].sourceInstruments &&
                                        group.candidates[0].sourceInstruments.length > 0 && (
                                          <span className="text-neutral-500">
                                            {' '}
                                            · from {group.candidates[0].sourceInstruments.join(', ')}
                                          </span>
                                        )}
                                    </p>
                                  </div>
                                  {group.candidates.length > 1 && (
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                        Secondary
                                      </p>
                                      <ul className="mt-1 space-y-1">
                                        {group.candidates.slice(1, 3).map((candidate) => (
                                          <li
                                            key={`${group.field}-${candidate.value}`}
                                            className="flex items-start gap-2"
                                          >
                                            <span className="text-primary-700">•</span>
                                            <span className="text-neutral-700">
                                              {candidate.label}{' '}
                                              <span className="text-xs font-semibold text-neutral-500">
                                                {Math.round(candidate.score * 100)}%
                                              </span>
                                              {candidate.sourceInstruments &&
                                                candidate.sourceInstruments.length > 0 && (
                                                  <span className="text-neutral-500">
                                                    {' '}
                                                    · from {candidate.sourceInstruments.join(', ')}
                                                  </span>
                                                )}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onResetSelectedFile();
                }}
                className="text-sm text-neutral-800/60 hover:text-red-400 transition-colors"
              >
                Chọn file khác
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-primary-600/10 rounded-2xl w-fit mx-auto group-hover:bg-primary-600/20 transition-colors">
                <Plus className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-800">
                  {isEditMode
                    ? 'Thay thế tệp tin'
                    : mediaType === 'video'
                      ? 'Chọn file video'
                      : 'Chọn file âm thanh'}
                </p>
                <p className="text-sm text-neutral-800/50 mt-1 font-medium">
                  {isEditMode
                    ? 'Click để chọn tệp mới thay thế tệp hiện tại'
                    : 'Kéo thả file vào đây hoặc click để chọn'}
                </p>
              </div>
            </div>
          )}
        </div>
        {errors.file && (
          <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.file}
          </p>
        )}
      </div>
    </div>
  );
}
