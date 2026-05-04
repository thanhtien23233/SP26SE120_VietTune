import { useCallback, useRef, useState } from 'react';

import {
  formatFileSize,
  inferMimeFromName,
  MAX_AUDIO_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
} from '@/features/upload/uploadConstants';

export type UploadMediaAudioInfo = {
  name: string;
  size: number;
  type: string;
  duration: number;
  bitrate?: number;
  sampleRate?: number;
};

type SetErrors = React.Dispatch<React.SetStateAction<Record<string, string>>>;

/**
 * Local file selection, MIME validation, and browser metadata extraction for the upload wizard.
 */
export function useMediaUpload(options: {
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  setErrors: SetErrors;
}) {
  const { title, setTitle, setErrors } = options;

  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio');
  const [file, setFile] = useState<File | null>(null);
  const [audioInfo, setAudioInfo] = useState<UploadMediaAudioInfo | null>(null);
  const [existingMediaSrc, setExistingMediaSrc] = useState<string | null>(null);
  const [existingMediaInfo, setExistingMediaInfo] = useState<UploadMediaAudioInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAnalyzingRef = useRef(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [createdRecordingId, setCreatedRecordingId] = useState<string | null>(null);
  const [useAiAnalysis, setUseAiAnalysis] = useState(false);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newUploadedUrl, setNewUploadedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      const mime = selected.type || inferMimeFromName(selected.name);

      const isAudio = SUPPORTED_AUDIO_FORMATS.includes(mime);
      const isVideo = SUPPORTED_VIDEO_FORMATS.includes(mime);

      const fileName = selected.name.toLowerCase();
      const hasVideoExtension = /\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)$/i.test(fileName);
      const hasAudioExtension = /\.(mp3|wav|flac|ogg)$/i.test(fileName);

      if (!isAudio && !isVideo) {
        if (hasVideoExtension && mediaType === 'video') {
          // allow by extension
        } else if (hasAudioExtension && mediaType === 'audio') {
          // allow by extension
        } else {
          setErrors((prev) => ({
            ...prev,
            file:
              mediaType === 'audio'
                ? 'Chỉ hỗ trợ file MP3, WAV hoặc FLAC'
                : 'Chỉ hỗ trợ file MP4, MOV, AVI, WebM, MKV, MPEG, WMV, 3GP hoặc FLV',
          }));
          setFile(null);
          setAudioInfo(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      if ((isVideo || hasVideoExtension) && mediaType === 'audio') {
        setErrors((prev) => ({
          ...prev,
          file: 'Bạn đã chọn đóng góp file âm thanh. Không thể chuyển sang file video trong cùng bản đóng góp. Vui lòng chọn file âm thanh.',
        }));
        setFile(null);
        setAudioInfo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if ((isAudio || hasAudioExtension) && mediaType === 'video') {
        setErrors((prev) => ({
          ...prev,
          file: 'Bạn đã chọn đóng góp file video. Không thể chuyển sang file âm thanh trong cùng bản đóng góp. Vui lòng chọn file video.',
        }));
        setFile(null);
        setAudioInfo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const maxBytes = mediaType === 'video' ? MAX_VIDEO_UPLOAD_BYTES : MAX_AUDIO_UPLOAD_BYTES;
      if (selected.size > maxBytes) {
        const label = mediaType === 'video' ? 'video' : 'âm thanh';
        setErrors((prev) => ({
          ...prev,
          file: `File ${label} vượt quá giới hạn ${formatFileSize(maxBytes)} (hiện tại: ${formatFileSize(selected.size)}). Vui lòng chọn file nhỏ hơn.`,
        }));
        setFile(null);
        setAudioInfo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.file;
        return newErrors;
      });

      setCreatedRecordingId(null);
      setNewUploadedUrl(null);
      setUploadProgress(0);

      setFile(selected);
      isAnalyzingRef.current = true;
      setIsAnalyzing(true);

      const url = URL.createObjectURL(selected);
      let cleanedUp = false;
      let mediaElement: HTMLAudioElement | HTMLVideoElement | null = null;
      let wrappedOnLoaded: (() => void) | null = null;
      let wrappedOnError: (() => void) | null = null;
      let metadataTimeout: ReturnType<typeof setTimeout> | null = null;

      const onLoaded = () => {
        if (cleanedUp || !mediaElement) return;
        const durationSeconds = isFinite(mediaElement.duration)
          ? Math.round(mediaElement.duration)
          : 0;

        const bitrate =
          durationSeconds > 0 ? Math.round((selected.size * 8) / durationSeconds / 1000) : undefined;

        setAudioInfo({
          name: selected.name,
          size: selected.size,
          type: mime,
          duration: durationSeconds,
          bitrate,
        });

        if (!title && !useAiAnalysis) {
          const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '');
          setTitle(nameWithoutExt);
        }

        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
        cleanup();
      };

      const onError = () => {
        if (cleanedUp) return;
        if (isVideo) {
          setAudioInfo({
            name: selected.name,
            size: selected.size,
            type: mime,
            duration: 0,
          });
          isAnalyzingRef.current = false;
          setIsAnalyzing(false);
          cleanup();

          console.warn(
            'Không thể đọc metadata từ file video, nhưng vẫn cho phép upload:',
            selected.name,
          );
          return;
        }

        setErrors((prev) => ({
          ...prev,
          file: 'Không thể phân tích file âm thanh. Vui lòng chọn file khác.',
        }));
        setFile(null);
        setAudioInfo(null);
        setCreatedRecordingId(null);
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
        cleanup();
      };

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;

        if (metadataTimeout) {
          clearTimeout(metadataTimeout);
          metadataTimeout = null;
        }

        if (mediaElement) {
          if (wrappedOnLoaded) {
            mediaElement.removeEventListener('loadedmetadata', wrappedOnLoaded);
          }
          if (wrappedOnError) {
            mediaElement.removeEventListener('error', wrappedOnError);
          }
          mediaElement.src = '';
          if (mediaElement instanceof HTMLVideoElement && mediaElement.parentNode) {
            document.body.removeChild(mediaElement);
          }
        }
        URL.revokeObjectURL(url);
      };

      metadataTimeout = setTimeout(() => {
        if (!cleanedUp && isAnalyzingRef.current) {
          console.warn('Timeout khi đọc metadata, nhưng vẫn cho phép upload');
          if (isVideo) {
            setAudioInfo({
              name: selected.name,
              size: selected.size,
              type: mime,
              duration: 0,
            });
            isAnalyzingRef.current = false;
            setIsAnalyzing(false);
            cleanup();
          }
        }
      }, 15000);

      if (isVideo) {
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        mediaElement = video;
        video.preload = 'metadata';
        video.src = url;

        wrappedOnLoaded = () => {
          if (metadataTimeout) clearTimeout(metadataTimeout);
          onLoaded();
        };

        wrappedOnError = () => {
          if (metadataTimeout) clearTimeout(metadataTimeout);
          onError();
        };

        video.addEventListener('loadedmetadata', wrappedOnLoaded);
        video.addEventListener('error', wrappedOnError);
      } else {
        const audio = new Audio();
        mediaElement = audio;
        audio.preload = 'metadata';
        audio.src = url;

        wrappedOnLoaded = () => {
          if (metadataTimeout) clearTimeout(metadataTimeout);
          onLoaded();
        };

        wrappedOnError = () => {
          if (metadataTimeout) clearTimeout(metadataTimeout);
          onError();
        };

        audio.addEventListener('loadedmetadata', wrappedOnLoaded);
        audio.addEventListener('error', wrappedOnError);
      }
    },
    [mediaType, title, useAiAnalysis, setTitle, setErrors],
  );

  return {
    mediaType,
    setMediaType,
    file,
    setFile,
    audioInfo,
    setAudioInfo,
    existingMediaSrc,
    setExistingMediaSrc,
    existingMediaInfo,
    setExistingMediaInfo,
    isAnalyzing,
    setIsAnalyzing,
    isUploadingMedia,
    setIsUploadingMedia,
    createdRecordingId,
    setCreatedRecordingId,
    useAiAnalysis,
    setUseAiAnalysis,
    currentSubmissionId,
    setCurrentSubmissionId,
    uploadProgress,
    setUploadProgress,
    newUploadedUrl,
    setNewUploadedUrl,
    fileInputRef,
    handleFileChange,
  };
}
