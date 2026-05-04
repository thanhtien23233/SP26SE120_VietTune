import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Trash2,
  Users,
  MapPin,
  Music,
  Repeat,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import WaveformProgressBar from './WaveformProgressBar';

import { RECORDING_TYPE_NAMES } from '@/config/constants';
import { useAuthStore } from '@/stores/authStore';
import { useMediaFocusStore } from '@/stores/mediaFocusStore';
import { UserRole } from '@/types';
import type { Recording } from '@/types';
import type { LocalRecording } from '@/types';
import { getRegionDisplayName } from '@/utils/recordingTags';

// Props type for AudioPlayer


// Extended Recording type that may include original local data
type RecordingWithLocalData = Recording & {
  _originalLocalData?: LocalRecording & {
    culturalContext?: {
      region?: string;
    };
  };
};

type Props = {
  src?: string;
  title?: string;
  artist?: string;
  compact?: boolean;
  className?: string;
  recording?: Recording;
  onDelete?: (id: string) => void;
  showContainer?: boolean;
  showMetadataTags?: boolean;
  /** When set, passed as state.from when navigating to detail (keeps search filters on back) */
  returnTo?: string;
};

export default function AudioPlayer({
  src,
  title,
  artist,
  compact = false,
  className = '',
  recording,
  onDelete,
  showContainer = false,
  showMetadataTags = true,
  returnTo,
}: Props) {
  // All hooks and variables must be declared before any hook or return
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [savedVolume, setSavedVolume] = useState(1); // Store volume before muting
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [dragVolume, setDragVolume] = useState<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const volumeAnimationFrameRef = useRef<number | null>(null);
  /** Latest volume during drag — React state in mouseup handler is stale; this commits the real value. */
  const volumeDragValueRef = useRef<number | null>(null);
  const lastTimeUpdateRef = useRef<number>(0);

  const myId = useId();
  const activeMediaId = useMediaFocusStore((s) => s.activeMediaId);
  const setActiveMediaId = useMediaFocusStore((s) => s.setActiveMediaId);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const isExpert = String(user?.role) === UserRole.EXPERT;
  const isVideo = src && typeof src === 'string' && src.startsWith('data:video/');
  const mediaRef = isVideo ? videoRef : audioRef;

  // Handle click to navigate to detail page (excluding buttons and progress bar)
  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons, progress bar, or their children
    const target = e.target as HTMLElement;
    const isButton = target.closest('button') !== null;
    const isProgressBar = target.closest('.progress-bar-container') !== null;
    const isVolumeControl = target.closest('.volume-control-container') !== null;

    if (isButton || isProgressBar || isVolumeControl || !recording?.id) return;

    const path = `/recordings/${recording.id}`;
    const pathNorm = location.pathname.replace(/\/$/, '') || '/';
    if (pathNorm === path) return;

    type NavState = { from?: string; preloadedRecording?: Recording };
    const prev = (location.state as NavState | null) ?? {};
    navigate(path, {
      state: {
        from: returnTo ?? prev.from,
        preloadedRecording: recording,
      },
    });
  };

  // Stop propagation for interactive elements
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // When another player (audio or video) becomes active, pause this one
  useEffect(() => {
    if (activeMediaId === null || activeMediaId === myId) return;
    const media = isVideo ? videoRef.current : audioRef.current;
    if (!media) return;
    media.pause();
    setPlaying(false);
  }, [activeMediaId, myId, isVideo]);

  useEffect(() => {
    const media = isVideo ? videoRef.current : audioRef.current;
    if (!media) return;

    // Sync play button state with actual media (e.g. after another player paused us or on re-mount)
    setPlaying(!media.paused);

    // Throttled time update to avoid 60fps re-renders (smoother playback)
    const TIME_UPDATE_THROTTLE_MS = 200;
    const updateTime = () => {
      if (!isDragging && media) {
        const now = Date.now();
        if (now - lastTimeUpdateRef.current >= TIME_UPDATE_THROTTLE_MS) {
          setCurrentTime(media.currentTime);
          lastTimeUpdateRef.current = now;
        }
      }
      if (!isDragging) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    };

    const onTime = () => {
      if (!isDragging) {
        if (animationFrameRef.current === null) {
          animationFrameRef.current = requestAnimationFrame(updateTime);
        }
      }
    };
    const onPlay = () => {
      lastTimeUpdateRef.current = Date.now();
      setPlaying(true);
    };
    const onPause = () => {
      if (media) setCurrentTime(media.currentTime);
      setPlaying(false);
    };
    const onMeta = () => {
      setDuration(isNaN(media.duration) ? 0 : media.duration || 0);
      setIsLoading(false);
    };
    const onVolume = () => {
      const newVol = media.volume;
      setVolume(newVol);
      if (newVol > 0) {
        setSavedVolume(newVol);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      if (useMediaFocusStore.getState().activeMediaId === myId) {
        useMediaFocusStore.getState().setActiveMediaId(null);
      }
    };
    const onCanPlay = () => setIsLoading(false);
    const onWaiting = () => setIsLoading(true);

    media.addEventListener('timeupdate', onTime);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('loadedmetadata', onMeta);
    media.addEventListener('volumechange', onVolume);
    media.addEventListener('ended', onEnded);
    media.addEventListener('canplay', onCanPlay);
    media.addEventListener('waiting', onWaiting);

    setVolume(media.volume);
    setDuration(isNaN(media.duration) ? 0 : media.duration || 0);

    // Start animation frame loop
    if (!isDragging) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      media.removeEventListener('timeupdate', onTime);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('loadedmetadata', onMeta);
      media.removeEventListener('volumechange', onVolume);
      media.removeEventListener('ended', onEnded);
      media.removeEventListener('canplay', onCanPlay);
      media.removeEventListener('waiting', onWaiting);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (volumeAnimationFrameRef.current !== null) {
        cancelAnimationFrame(volumeAnimationFrameRef.current);
        volumeAnimationFrameRef.current = null;
      }
    };
  }, [src, isVideo, isDragging, myId]);

  const formatTime = (t: number) => {
    if (!t || isNaN(t)) return '00:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const play = async () => {
    const media = mediaRef.current;
    if (!media) return;
    setActiveMediaId(myId);
    try {
      await media.play();
      setPlaying(true);
    } catch (e) {
      console.warn('Play failed:', e);
      setActiveMediaId(null);
    }
  };

  const pause = () => {
    const media = mediaRef.current;
    if (!media) return;
    media.pause();
    setPlaying(false);
    if (useMediaFocusStore.getState().activeMediaId === myId) {
      useMediaFocusStore.getState().setActiveMediaId(null);
    }
  };

  const togglePlay = () => (playing ? pause() : play());

  const seekTo = (val: number) => {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = Math.max(0, Math.min(val, duration || 0));
    setCurrentTime(media.currentTime);
  };

  const seekBy = (delta: number) => {
    const media = mediaRef.current;
    if (!media) return;
    const next = Math.max(0, Math.min(duration, media.currentTime + delta));
    media.currentTime = next;
    setCurrentTime(next);
  };

  const handleVolume = (v: number) => {
    const media = mediaRef.current;
    if (!media) return;
    const newVolume = Math.max(0, Math.min(1, v));
    media.volume = newVolume;
    setVolume(newVolume);
    if (newVolume > 0) {
      setSavedVolume(newVolume); // Save non-zero volume
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  // Use dragVolume when dragging, otherwise use volume for smooth updates
  const displayVolume = isDraggingVolume && dragVolume !== null ? dragVolume : volume;

  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (isMuted) {
      // Unmute: restore saved volume
      media.volume = savedVolume > 0 ? savedVolume : 0.5;
      setVolume(media.volume);
      setIsMuted(false);
    } else {
      // Mute: save current volume first
      setSavedVolume(volume);
      media.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleLoop = () => {
    const media = mediaRef.current;
    if (!media) return;
    media.loop = !isLooping;
    setIsLooping(!isLooping);
  };

  // Use dragTime when dragging, otherwise use currentTime for smooth updates
  const displayTime = isDragging && dragTime !== null ? dragTime : currentTime;
  const progressPercent = duration ? (displayTime / duration) * 100 : 0;

  const volumeFillStyle = useMemo(
    () => ({
      width: `${(isMuted ? 0 : displayVolume) * 100}%`,
      transition: isDraggingVolume ? 'none' : 'width 0.1s linear',
    }),
    [isMuted, displayVolume, isDraggingVolume],
  );
  const volumeThumbStyle = useMemo(
    () => ({
      left: `calc(${(isMuted ? 0 : displayVolume) * 100}% - 7px)`,
      opacity: isDraggingVolume ? 1 : 0,
      transition: isDraggingVolume
        ? 'opacity 0s, transform 0.2s'
        : 'opacity 0.2s, transform 0.2s',
    }),
    [isMuted, displayVolume, isDraggingVolume],
  );

  // Container version with delete button and metadata
  if (showContainer && recording) {
    return (
      <div className={className}>
        <div
          className="p-5 rounded-xl border border-neutral-200 cursor-pointer bg-surface-panel"
          onClick={handleContainerClick}
        >
          {/* Audio Player (Full Version) */}
          <div className="w-full">
            {isVideo ? (
              <video ref={videoRef} src={src} preload="metadata" className="w-full rounded-md" />
            ) : (
              <audio ref={audioRef} src={src} preload="metadata" />
            )}

            <div
              className="p-6 border border-neutral-200/80 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl bg-surface-panel"
            >
              {/* Title & Artist */}
              {(title || artist) && (
                <div className="mb-5">
                  {title && (
                    <h4 className="text-neutral-900 font-semibold text-lg mb-1 truncate leading-tight">
                      {title}
                    </h4>
                  )}
                  {artist && (
                    <p className="text-neutral-600 text-sm font-medium truncate">{artist}</p>
                  )}
                </div>
              )}

              {/* Progress Bar */}
              <div className="mb-5 progress-bar-container" onClick={stopPropagation}>
                <WaveformProgressBar
                  progress={progressPercent}
                  duration={duration}
                  currentTime={displayTime}
                  onSeek={seekTo}
                  formatTime={formatTime}
                  isDragging={isDragging}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsDragging(true);
                    const rect = e.currentTarget.getBoundingClientRect();

                    const updateProgress = (clientX: number) => {
                      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                      const newTime = percent * duration;
                      setDragTime(newTime);

                      if (animationFrameRef.current === null) {
                        animationFrameRef.current = requestAnimationFrame(() => {
                          animationFrameRef.current = null;
                        });
                      }
                    };

                    updateProgress(e.clientX);

                    const onMouseMove = (moveEvent: MouseEvent) => {
                      moveEvent.preventDefault();
                      updateProgress(moveEvent.clientX);
                    };

                    const onMouseUp = () => {
                      if (dragTime !== null) {
                        seekTo(dragTime);
                      }
                      setIsDragging(false);
                      setDragTime(null);
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                      document.removeEventListener('mouseleave', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove, { passive: false });
                    document.addEventListener('mouseup', onMouseUp);
                    document.addEventListener('mouseleave', onMouseUp);
                  }}
                />
              </div>

              {/* Controls */}
              <div className="relative flex items-center justify-between">
                {/* Left: Repeat & Volume */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleLoop}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer ${
                      isLooping
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/40'
                        : 'bg-neutral-200/80 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-300'
                    }`}
                    title={isLooping ? 'Tắt lặp lại' : 'Bật lặp lại'}
                  >
                    <Repeat className="w-4.5 h-4.5" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 hover:text-neutral-800 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4.5 h-4.5" strokeWidth={2.5} />
                    ) : (
                      <Volume2 className="w-4.5 h-4.5" strokeWidth={2.5} />
                    )}
                  </button>
                  <div
                    className="w-20 hidden sm:block relative volume-control-container"
                    onClick={stopPropagation}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsDraggingVolume(true);
                      volumeDragValueRef.current = null;
                      const rect = e.currentTarget.getBoundingClientRect();

                      const updateVolume = (clientX: number) => {
                        const percent = Math.max(
                          0,
                          Math.min(1, (clientX - rect.left) / rect.width),
                        );
                        volumeDragValueRef.current = percent;
                        setDragVolume(percent);

                        // Use requestAnimationFrame for smooth visual updates
                        if (volumeAnimationFrameRef.current === null) {
                          volumeAnimationFrameRef.current = requestAnimationFrame(() => {
                            volumeAnimationFrameRef.current = null;
                          });
                        }
                      };

                      updateVolume(e.clientX);

                      const onMouseMove = (moveEvent: MouseEvent) => {
                        moveEvent.preventDefault();
                        updateVolume(moveEvent.clientX);
                      };

                      const onMouseUp = () => {
                        const v = volumeDragValueRef.current;
                        if (v !== null) handleVolume(v);
                        volumeDragValueRef.current = null;
                        setIsDraggingVolume(false);
                        setDragVolume(null);
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        document.removeEventListener('mouseleave', onMouseUp);
                      };

                      document.addEventListener('mousemove', onMouseMove, { passive: false });
                      document.addEventListener('mouseup', onMouseUp);
                      document.addEventListener('mouseleave', onMouseUp);
                    }}
                  >
                    <div className="relative h-2 bg-neutral-200/80 rounded-full cursor-pointer group/volume transition-all duration-200 hover:h-2.5 will-change-[height]">
                      <div
                        className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full shadow-sm will-change-[width]"
                        style={volumeFillStyle}
                      />
                      {/* Thumb */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary-600 rounded-full shadow-md border-2 border-white cursor-grab active:cursor-grabbing hover:scale-125 hover:shadow-lg transition-transform duration-200 will-change-transform"
                        style={volumeThumbStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* Center: Play Controls: Lùi, Play/Pause, Tiến */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => seekBy(-5)}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-neutral-700 hover:text-neutral-900 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 relative shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                    title="Lùi 5 giây"
                  >
                    <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
                    <span className="absolute text-[10px] font-bold text-neutral-800 mt-px">
                      5
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={isLoading}
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 shadow-xl hover:shadow-2xl shadow-primary-600/40 cursor-pointer focus:outline-none"
                  >
                    {isLoading ? (
                      <div className="w-6 h-6 border-3 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : playing ? (
                      <Pause className="w-7 h-7 text-white" strokeWidth={2.5} />
                    ) : (
                      <Play className="w-7 h-7 text-white ml-0.5" strokeWidth={2.5} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => seekBy(5)}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-neutral-700 hover:text-neutral-900 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 relative shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                    title="Tiến 5 giây"
                  >
                    <RotateCw className="w-5 h-5" strokeWidth={2.5} />
                    <span className="absolute text-[10px] font-bold text-neutral-800 mt-px">
                      5
                    </span>
                  </button>
                </div>

                {/* Right: Empty space for balance */}
                <div className="flex items-center" />
              </div>
            </div>
          </div>

          {/* Metadata Tags */}
          {showMetadataTags && (
            <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-5 border-t border-neutral-200/60">
              {recording?.ethnicity &&
                typeof recording.ethnicity === 'object' &&
                recording.ethnicity.name &&
                recording.ethnicity.name !== 'Không xác định' &&
                recording.ethnicity.name.toLowerCase() !== 'unknown' &&
                recording.ethnicity.name.trim() !== '' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-secondary-100/90 text-secondary-800 rounded-full shadow-sm hover:shadow-md transition-shadow duration-200">
                    <Users className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {recording.ethnicity.nameVietnamese || recording.ethnicity.name}
                  </span>
                )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-neutral-100/90 text-neutral-700 rounded-full shadow-sm hover:shadow-md transition-shadow duration-200">
                <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
                {getRegionDisplayName(
                  recording?.region,
                  (recording as RecordingWithLocalData)?._originalLocalData,
                )}
              </span>
              {recording?.recordingType &&
                RECORDING_TYPE_NAMES[recording.recordingType] &&
                RECORDING_TYPE_NAMES[recording.recordingType] !== 'Khác' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-primary-100/90 text-primary-800 rounded-full shadow-sm hover:shadow-md transition-shadow duration-200">
                    <Music className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {RECORDING_TYPE_NAMES[recording.recordingType]}
                  </span>
                )}
              {recording?.tags?.map((tag, idx) =>
                tag && tag.trim() !== '' ? (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-neutral-100/90 text-neutral-700 rounded-full shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    {tag.toLowerCase().includes('dân ca') && (
                      <Music className="h-3.5 w-3.5" strokeWidth={2.5} />
                    )}
                    {tag}
                  </span>
                ) : null,
              )}
              {recording?.instruments?.map((instrument) => (
                <span
                  key={instrument.id}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-neutral-100/90 text-neutral-700 rounded-full shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  {instrument.nameVietnamese || instrument.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact version for cards
  if (compact) {
    return (
      <div className={`${className} w-full cursor-pointer`} onClick={handleContainerClick}>
        {isVideo ? (
          <video ref={videoRef} src={src} preload="metadata" className="w-full rounded-md" />
        ) : (
          <audio ref={audioRef} src={src} preload="metadata" />
        )}

        <div className="flex items-center gap-3">
          {/* Play Button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-600 hover:bg-primary-500 transition-colors disabled:opacity-50 flex-shrink-0 shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : playing ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" />
            )}
          </button>

          {/* Progress */}
          <div className="flex-1 min-w-0 progress-bar-container" onClick={stopPropagation}>
            <WaveformProgressBar
              progress={progressPercent}
              duration={duration}
              currentTime={displayTime}
              onSeek={seekTo}
              formatTime={formatTime}
              isDragging={isDragging}
              barCount={60}
              className="h-12"
            />
          </div>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className={`${className} w-full cursor-pointer`} onClick={handleContainerClick}>
      {isVideo ? (
        <video ref={videoRef} src={src} preload="metadata" className="w-full rounded-md" />
      ) : (
        <audio ref={audioRef} src={src} preload="metadata" />
      )}
      <div
        className="p-6 border border-neutral-200/80 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        {/* Title & Artist */}
        {(title || artist) && (
          <div className="mb-5">
            {title && (
              <h4 className="text-neutral-900 font-semibold text-lg mb-1 truncate leading-tight">
                {title}
              </h4>
            )}
            {artist && <p className="text-neutral-600 text-sm font-medium truncate">{artist}</p>}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-5 progress-bar-container" onClick={stopPropagation}>
          <WaveformProgressBar
            progress={progressPercent}
            duration={duration}
            currentTime={displayTime}
            onSeek={seekTo}
            formatTime={formatTime}
            isDragging={isDragging}
            onDragStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsDragging(true);
              const rect = e.currentTarget.getBoundingClientRect();

              const updateProgress = (clientX: number) => {
                const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                const newTime = percent * duration;
                setDragTime(newTime);

                if (animationFrameRef.current === null) {
                  animationFrameRef.current = requestAnimationFrame(() => {
                    animationFrameRef.current = null;
                  });
                }
              };

              updateProgress(e.clientX);

              const onMouseMove = (moveEvent: MouseEvent) => {
                moveEvent.preventDefault();
                updateProgress(moveEvent.clientX);
              };

              const onMouseUp = () => {
                if (dragTime !== null) {
                  seekTo(dragTime);
                }
                setIsDragging(false);
                setDragTime(null);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.removeEventListener('mouseleave', onMouseUp);
              };

              document.addEventListener('mousemove', onMouseMove, { passive: false });
              document.addEventListener('mouseup', onMouseUp);
              document.addEventListener('mouseleave', onMouseUp);
            }}
          />
        </div>

        {/* Controls */}
        <div className="relative flex items-center justify-center">
          {/* Left: Delete (if any) + Repeat & Volume */}
          <div className="absolute left-0 flex items-center gap-2">
            {isExpert && onDelete && recording && (
              <div>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-3 py-1.5">
                    <span className="text-xs text-red-700 font-medium">Xác nhận?</span>
                    <button
                      onClick={() => {
                        const idToDelete = recording?.id ?? '';
                        if (idToDelete !== '' && idToDelete !== undefined) {
                          onDelete(String(idToDelete));
                        }
                        setShowDeleteConfirm(false);
                      }}
                      className="text-xs text-red-700 hover:text-red-900 font-semibold"
                    >
                      Xóa
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-xs text-neutral-600 hover:text-neutral-800"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 transition-colors shadow-sm hover:shadow-md"
                    title="Xóa bản thu (Chuyên gia)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={toggleLoop}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer ${
                isLooping
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/40'
                  : 'bg-neutral-200/80 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-300'
              }`}
              title={isLooping ? 'Tắt lặp lại' : 'Bật lặp lại'}
            >
              <Repeat className="w-4.5 h-4.5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 hover:text-neutral-800 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4.5 h-4.5" strokeWidth={2.5} />
              ) : (
                <Volume2 className="w-4.5 h-4.5" strokeWidth={2.5} />
              )}
            </button>
            <div
              className="w-20 hidden sm:block relative volume-control-container"
              onClick={stopPropagation}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsDraggingVolume(true);
                volumeDragValueRef.current = null;
                const rect = e.currentTarget.getBoundingClientRect();

                const updateVolume = (clientX: number) => {
                  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                  volumeDragValueRef.current = percent;
                  setDragVolume(percent);

                  // Use requestAnimationFrame for smooth visual updates
                  if (volumeAnimationFrameRef.current === null) {
                    volumeAnimationFrameRef.current = requestAnimationFrame(() => {
                      volumeAnimationFrameRef.current = null;
                    });
                  }
                };

                updateVolume(e.clientX);

                const onMouseMove = (moveEvent: MouseEvent) => {
                  moveEvent.preventDefault();
                  updateVolume(moveEvent.clientX);
                };

                const onMouseUp = () => {
                  const v = volumeDragValueRef.current;
                  if (v !== null) handleVolume(v);
                  volumeDragValueRef.current = null;
                  setIsDraggingVolume(false);
                  setDragVolume(null);
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                  document.removeEventListener('mouseleave', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove, { passive: false });
                document.addEventListener('mouseup', onMouseUp);
                document.addEventListener('mouseleave', onMouseUp);
              }}
            >
              <div className="relative h-2 bg-neutral-200/80 rounded-full cursor-pointer group/volume transition-all duration-200 hover:h-2.5 will-change-[height]">
                <div
                  className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full shadow-sm will-change-[width]"
                  style={volumeFillStyle}
                />
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary-600 rounded-full shadow-md border-2 border-white cursor-grab active:cursor-grabbing hover:scale-125 hover:shadow-lg transition-transform duration-200 will-change-transform"
                  style={volumeThumbStyle}
                />
              </div>
            </div>
          </div>

          {/* Center: Play/Pause */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => seekBy(-5)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-neutral-700 hover:text-neutral-900 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 relative shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              title="Lùi 5 giây"
            >
              <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
              <span className="absolute text-[10px] font-bold text-neutral-800 mt-px">
                5
              </span>
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 shadow-xl hover:shadow-2xl shadow-primary-600/40 cursor-pointer focus:outline-none"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/40 border-t-white rounded-full animate-spin" />
              ) : playing ? (
                <Pause className="w-7 h-7 text-white" strokeWidth={2.5} />
              ) : (
                <Play className="w-7 h-7 text-white ml-0.5" strokeWidth={2.5} />
              )}
            </button>

            <button
              onClick={() => seekBy(5)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-neutral-700 hover:text-neutral-900 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 relative shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              title="Tiến 5 giây"
            >
              <RotateCw className="w-5 h-5" strokeWidth={2.5} />
              <span className="absolute text-[10px] font-bold text-neutral-800 mt-px">
                5
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
