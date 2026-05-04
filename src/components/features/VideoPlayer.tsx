import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Users,
  MapPin,
  Music,
  Repeat,
  Maximize,
  Minimize,
} from 'lucide-react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { RECORDING_TYPE_NAMES } from '@/config/constants';
import { useVideoPlayback } from '@/hooks/useVideoPlayback';
import type { Recording } from '@/types';
import type { LocalRecording } from '@/types';
import { getRegionDisplayName } from '@/utils/recordingTags';

// Extended Recording type that may include original local data
type RecordingWithLocalData = Recording & {
  _originalLocalData?: LocalRecording & {
    culturalContext?: {
      region?: string;
    };
  };
};

// Props type for VideoPlayer
type Props = {
  src?: string;
  title?: string;
  artist?: string;
  compact?: boolean;
  className?: string;
  recording?: Recording;
  showContainer?: boolean;
  showMetadataTags?: boolean;
  /** When set, passed as state.from when navigating to detail (keeps search filters on back) */
  returnTo?: string;
};

export default function VideoPlayer({
  src,
  title,
  artist,
  compact = false,
  className = '',
  recording,
  showContainer = false,
  showMetadataTags = true,
  returnTo,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    animationFrameRef,
    controlsVisible,
    cursorHidden,
    displayTime,
    displayVolume,
    dragTime,
    duration,
    effectiveVideoSrc,
    formatTime,
    handleVolume,
    isDragging,
    isDraggingVolume,
    isFullscreen,
    isLoading,
    isLooping,
    isMuted,
    isVideo,
    onVideoAreaMouseEnter,
    onVideoAreaMouseMove,
    onVideoAreaMouseLeave,
    playerRootRef,
    progressPercent,
    seekBy,
    seekTo,
    setDragTime,
    setDragVolume,
    setIsDragging,
    setIsDraggingVolume,
    showControlsTemporarily,
    stopPropagation,
    toggleFullscreen,
    toggleLoop,
    toggleMute,
    togglePlay,
    videoRef,
    videoSrcReady,
    volume,
    volumeAnimationFrameRef,
    volumeDragValueRef,
    playing,
  } = useVideoPlayback(src);

  const progressFillStyle = useMemo(
    () => ({
      width: `${progressPercent}%`,
      transition: isDragging ? 'none' : 'width 0.1s linear',
    }),
    [progressPercent, isDragging],
  );
  const progressThumbStyle = useMemo(
    () => ({
      left: `calc(${progressPercent}% - 7px)`,
      opacity: isDragging ? 1 : 0,
      transition: isDragging ? 'opacity 0s, transform 0.2s' : 'opacity 0.2s, transform 0.2s',
    }),
    [progressPercent, isDragging],
  );
  const compactProgressThumbStyle = useMemo(
    () => ({
      left: `calc(${progressPercent}% - 7px)`,
      opacity: isDragging ? 1 : 0,
      transition: isDragging ? 'opacity 0s' : 'opacity 0.2s',
    }),
    [progressPercent, isDragging],
  );
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

  const handleContainerClick = (e: React.MouseEvent) => {
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
  // Container version with metadata
  if (showContainer && recording) {
    return (
      <div className={className}>
        <div
          className="p-5 rounded-xl border border-neutral-200 cursor-pointer bg-surface-panel"
          onClick={handleContainerClick}
        >
          <div
            ref={playerRootRef}
            className={`relative ${isFullscreen ? 'flex flex-col items-center justify-center h-full w-full min-h-0' : ''}`}
            onMouseMove={showControlsTemporarily}
          >
            {/* Video Player (Full Version) - wrapper với overflow-hidden để góc bo tròn không bị nhô vuông */}
            <div
              className={`w-full rounded-md overflow-hidden [contain:layout_paint] ${isFullscreen ? 'flex-1 min-h-0 flex items-center justify-center' : ''} ${playing && cursorHidden ? 'cursor-none' : ''}`}
              onMouseEnter={onVideoAreaMouseEnter}
              onMouseMove={onVideoAreaMouseMove}
              onMouseLeave={onVideoAreaMouseLeave}
            >
              {isVideo ? (
                videoSrcReady ? (
                  <video
                    ref={videoRef}
                    src={effectiveVideoSrc ?? undefined}
                    preload="auto"
                    playsInline
                    className={
                      isFullscreen ? 'max-w-full max-h-full object-contain' : 'w-full block'
                    }
                    controls={false}
                  />
                ) : (
                  <div className="w-full aspect-video bg-neutral-200" aria-busy="true" />
                )
              ) : (
                <div className="w-full aspect-[16/9] bg-neutral-200 flex items-center justify-center">
                  <p className="text-neutral-500">Không có video để phát</p>
                </div>
              )}
            </div>

            {!videoSrcReady && isVideo && (
              <div
                className="absolute inset-0 z-30 flex items-center justify-center bg-neutral-200"
                aria-label="Đang tải video"
              >
                <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
              </div>
            )}

            <div
              className={`absolute left-4 right-4 bottom-4 z-20 backdrop-blur-xl bg-black/50 border border-white/30 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl pt-7 px-7 pb-10 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
            >
              {/* Title & Artist */}
              {(title || artist) && (
                <div className="mb-5">
                  {title && (
                    <h4 className="font-semibold text-lg mb-1 truncate leading-tight text-white">
                      {title}
                    </h4>
                  )}
                  {artist && <p className="text-sm font-medium truncate text-white">{artist}</p>}
                </div>
              )}

              {/* Progress Bar — same UI/UX as volume bar */}
              <div className="mb-8 w-full" onClick={stopPropagation}>
                <div
                  className="progress-bar-container w-full"
                  onMouseDown={(e) => {
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
                >
                  <div className="relative h-2 bg-neutral-200/80 rounded-full cursor-pointer group/progress transition-all duration-200 hover:h-2.5 will-change-[height]">
                    <div
                      className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full shadow-sm will-change-[width]"
                      style={progressFillStyle}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary-600 rounded-full shadow-md border-2 border-white cursor-grab active:cursor-grabbing hover:scale-125 hover:shadow-lg transition-transform duration-200 will-change-transform pointer-events-none"
                      style={progressThumbStyle}
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-2.5">
                  <span className="text-xs font-medium tabular-nums text-white">
                    {formatTime(displayTime)}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-white">
                    -{formatTime(Math.max(0, duration - displayTime))}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="relative flex items-center justify-center">
                {/* Left: Repeat & Volume */}
                <div className="absolute left-0 flex items-center gap-2">
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

                {/* Right: Fullscreen */}
                <div className="absolute right-0 flex items-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleFullscreen();
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 hover:text-neutral-800 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer ${!isVideo ? 'opacity-50 pointer-events-none' : ''}`}
                    title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                    disabled={!isVideo}
                  >
                    {isFullscreen ? (
                      <Minimize className="w-4.5 h-4.5" strokeWidth={2.5} />
                    ) : (
                      <Maximize className="w-4.5 h-4.5" strokeWidth={2.5} />
                    )}
                  </button>
                </div>
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
          <div
            className={`w-full h-20 rounded-md overflow-hidden ${playing && cursorHidden ? 'cursor-none' : ''}`}
            onMouseEnter={onVideoAreaMouseEnter}
            onMouseMove={onVideoAreaMouseMove}
            onMouseLeave={onVideoAreaMouseLeave}
          >
            {videoSrcReady ? (
              <video
                ref={videoRef}
                src={effectiveVideoSrc ?? undefined}
                preload="auto"
                playsInline
                className="w-full block"
                controls={false}
              />
            ) : (
              <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-20 rounded-md overflow-hidden bg-neutral-200 flex items-center justify-center">
            <p className="text-neutral-500 text-sm">Không có video</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Play Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              void togglePlay();
            }}
            disabled={!isVideo || isLoading}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-600 hover:bg-primary-500 transition-colors disabled:opacity-50 flex-shrink-0 shadow-md hover:shadow-lg"
            aria-label={playing ? 'Tạm dừng' : 'Phát'}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : playing ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" />
            )}
          </button>

          {/* Progress — same interaction areas as AudioPlayer (no waveform) */}
          <div className="flex-1 min-w-0 progress-bar-container" onClick={stopPropagation}>
            {isVideo ? (
              <div
                className="h-12 flex items-center"
                onMouseDown={(e) => {
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
                    if (dragTime !== null) seekTo(dragTime);
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
              >
                <div className="relative w-full h-2 bg-neutral-200/80 rounded-full cursor-pointer transition-all duration-200 hover:h-2.5">
                  <div
                    className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full shadow-sm"
                    style={progressFillStyle}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary-600 rounded-full shadow-md border-2 border-white pointer-events-none"
                    style={compactProgressThumbStyle}
                  />
                </div>
              </div>
            ) : (
              <div className="h-1.5 bg-neutral-200 rounded-full opacity-50 w-full" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div
      ref={playerRootRef}
      className={`${className} w-full relative cursor-pointer ${isFullscreen ? 'flex flex-col items-center justify-center h-full w-full min-h-0' : ''}`}
      onMouseMove={showControlsTemporarily}
      onClick={handleContainerClick}
    >
      {isVideo ? (
        <div
          className={`w-full rounded-md overflow-hidden [contain:layout_paint] ${isFullscreen ? 'flex-1 min-h-0 flex items-center justify-center' : ''} ${playing && cursorHidden ? 'cursor-none' : ''}`}
          onMouseEnter={onVideoAreaMouseEnter}
          onMouseMove={onVideoAreaMouseMove}
          onMouseLeave={onVideoAreaMouseLeave}
        >
          {videoSrcReady ? (
            <video
              ref={videoRef}
              src={effectiveVideoSrc ?? undefined}
              preload="auto"
              playsInline
              className={isFullscreen ? 'max-w-full max-h-full object-contain' : 'w-full block'}
              controls={false}
            />
          ) : (
            <div className="w-full aspect-[16/9] bg-neutral-200" aria-busy="true" />
          )}
        </div>
      ) : (
        <div className="w-full aspect-[16/9] rounded-md overflow-hidden bg-neutral-200 flex items-center justify-center">
          <p className="text-neutral-500">Không có video để phát</p>
        </div>
      )}

      {!videoSrcReady && isVideo && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-neutral-200"
          aria-label="Đang tải video"
        >
          <div className="w-10 h-10 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}

      <div
        className={`absolute left-4 right-4 bottom-4 z-20 backdrop-blur-xl bg-black/50 border border-white/30 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl p-6 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
      >
        {/* Title & Artist */}
        {(title || artist) && (
          <div className="mb-5">
            {title && (
              <h4 className="font-semibold text-lg mb-1 truncate leading-tight text-white">
                {title}
              </h4>
            )}
            {artist && <p className="text-sm font-medium truncate text-white">{artist}</p>}
          </div>
        )}

        {/* Progress Bar — same UI/UX as volume bar */}
        <div className="mb-5 w-full" onClick={stopPropagation}>
          {isVideo ? (
            <div
              className="progress-bar-container w-full"
              onMouseDown={(e) => {
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
            >
              <div className="relative h-2 bg-neutral-200/80 rounded-full cursor-pointer group/progress transition-all duration-200 hover:h-2.5 will-change-[height]">
                <div
                  className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full shadow-sm will-change-[width]"
                  style={progressFillStyle}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary-600 rounded-full shadow-md border-2 border-white cursor-grab active:cursor-grabbing hover:scale-125 hover:shadow-lg transition-transform duration-200 will-change-transform pointer-events-none"
                  style={progressThumbStyle}
                />
              </div>
            </div>
          ) : (
            <div className="h-2.5 bg-neutral-200/60 rounded-full opacity-50" />
          )}

          {isVideo && (
            <div className="flex justify-between mt-2.5">
              <span className="text-xs font-medium tabular-nums text-white">
                {formatTime(displayTime)}
              </span>
              <span className="text-xs font-medium tabular-nums text-white">
                -{formatTime(Math.max(0, duration - displayTime))}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="relative flex items-center justify-center">
          {/* Left: Repeat & Volume */}
          <div className="absolute left-0 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLoop}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer ${
                isLooping
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/40'
                  : 'bg-neutral-200/80 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-300'
              } ${!isVideo ? 'opacity-50 pointer-events-none' : ''}`}
              title={isLooping ? 'Tắt lặp lại' : 'Bật lặp lại'}
              disabled={!isVideo}
            >
              <Repeat className="w-4.5 h-4.5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 hover:text-neutral-800 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer ${!isVideo ? 'opacity-50 pointer-events-none' : ''}`}
              disabled={!isVideo}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4.5 h-4.5" strokeWidth={2.5} />
              ) : (
                <Volume2 className="w-4.5 h-4.5" strokeWidth={2.5} />
              )}
            </button>
            <div
              className={`w-20 hidden sm:block relative volume-control-container ${!isVideo ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={stopPropagation}
              onMouseDown={
                !isVideo
                  ? undefined
                  : (e) => {
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
                    }
              }
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
              onClick={() => isVideo && seekBy(-5)}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-neutral-700 hover:text-neutral-900 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 relative shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer ${!isVideo ? 'opacity-50 pointer-events-none' : ''}`}
              title="Lùi 5 giây"
              disabled={!isVideo}
            >
              <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
              <span className="absolute text-[10px] font-bold text-neutral-800 mt-px">
                5
              </span>
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={!isVideo || isLoading}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 shadow-xl hover:shadow-2xl shadow-primary-600/40 cursor-pointer focus:outline-none"
              aria-label={playing ? 'Tạm dừng' : 'Phát'}
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
              onClick={() => isVideo && seekBy(5)}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-neutral-700 hover:text-neutral-900 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 relative shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer ${!isVideo ? 'opacity-50 pointer-events-none' : ''}`}
              title="Tiến 5 giây"
              disabled={!isVideo}
            >
              <RotateCw className="w-5 h-5" strokeWidth={2.5} />
              <span className="absolute text-[10px] font-bold text-neutral-800 mt-px">
                5
              </span>
            </button>
          </div>

          {/* Right: Fullscreen */}
          <div className="absolute right-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                void toggleFullscreen();
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 hover:text-neutral-800 bg-neutral-200/80 hover:bg-neutral-300 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer ${!isVideo ? 'opacity-50 pointer-events-none' : ''}`}
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              disabled={!isVideo}
            >
              {isFullscreen ? (
                <Minimize className="w-4.5 h-4.5" strokeWidth={2.5} />
              ) : (
                <Maximize className="w-4.5 h-4.5" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
