import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

import { useVideoDataUrlSource } from '@/hooks/useVideoDataUrlSource';
import { useMediaFocusStore } from '@/stores/mediaFocusStore';

/** Throttle interval for time updates (ms) - reduces re-renders during playback */
const TIME_UPDATE_THROTTLE_MS = 200;

/** Auto-hide video controls after user activity (fullscreen and minimized) */
const CONTROLS_HIDE_DELAY_MS = 3000;

export function useVideoPlayback(src: string | undefined) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRootRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimeoutRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [savedVolume, setSavedVolume] = useState(1); // Store volume before muting
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [dragVolume, setDragVolume] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [cursorHidden, setCursorHidden] = useState(false);
  const hideCursorTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const volumeAnimationFrameRef = useRef<number | null>(null);
  /** Latest volume during drag — state read in document mouseup is stale. */
  const volumeDragValueRef = useRef<number | null>(null);
  const lastTimeUpdateRef = useRef<number>(0);
  const latestTimeRef = useRef<number>(0);

  const myId = useId();
  const activeMediaId = useMediaFocusStore((s) => s.activeMediaId);
  const setActiveMediaId = useMediaFocusStore((s) => s.setActiveMediaId);
  // Check if src is a video data URL or video file
  const isVideo =
    src &&
    typeof src === 'string' &&
    (src.startsWith('data:video/') || src.match(/\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)$/i));

  const isDataVideo = Boolean(src && typeof src === 'string' && src.startsWith('data:video/'));
  const dataUrlForBlob = isDataVideo && typeof src === 'string' ? src : undefined;
  const resolvedVideoSrc = useVideoDataUrlSource(dataUrlForBlob);

  // Use blob URL when ready for data:video/ to avoid main-thread decode; otherwise use src
  const effectiveVideoSrc = isDataVideo ? resolvedVideoSrc : isVideo ? src : undefined;
  const videoSrcReady = isVideo && (isDataVideo ? resolvedVideoSrc != null : true);
  const stopPropagation = (e: ReactMouseEvent) => {
    e.stopPropagation();
  };
  // When another player (audio or video) becomes active, pause this one
  useEffect(() => {
    if (activeMediaId === null || activeMediaId === myId) return;
    const media = videoRef.current;
    if (!media) return;
    media.pause();
    setPlaying(false);
  }, [activeMediaId, myId]);

  // Reset cursor visibility when video is paused
  useEffect(() => {
    if (!playing) {
      if (hideCursorTimeoutRef.current !== null) {
        window.clearTimeout(hideCursorTimeoutRef.current);
        hideCursorTimeoutRef.current = null;
      }
      setCursorHidden(false);
    }
  }, [playing]);

  /** Hide cursor over video when playing and idle; show on mouse move ("shake") */
  const CURSOR_HIDE_DELAY_MS = 1500;
  const clearHideCursorTimer = () => {
    if (hideCursorTimeoutRef.current !== null) {
      window.clearTimeout(hideCursorTimeoutRef.current);
      hideCursorTimeoutRef.current = null;
    }
  };
  const onVideoAreaMouseEnter = () => {
    if (!playing) return;
    clearHideCursorTimer();
    hideCursorTimeoutRef.current = window.setTimeout(
      () => setCursorHidden(true),
      CURSOR_HIDE_DELAY_MS,
    );
  };
  const onVideoAreaMouseMove = () => {
    clearHideCursorTimer();
    setCursorHidden(false);
    if (playing) {
      hideCursorTimeoutRef.current = window.setTimeout(
        () => setCursorHidden(true),
        CURSOR_HIDE_DELAY_MS,
      );
    }
  };
  const onVideoAreaMouseLeave = () => {
    clearHideCursorTimer();
    setCursorHidden(false);
  };

  /** Show controls and hide again after 3s (same in fullscreen and minimized). */
  const clearHideControlsTimer = useCallback(() => {
    if (hideControlsTimeoutRef.current !== null) {
      window.clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    clearHideControlsTimer();
    hideControlsTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
      hideControlsTimeoutRef.current = null;
    }, CONTROLS_HIDE_DELAY_MS);
  }, [clearHideControlsTimer]);

  useEffect(() => {
    // Track fullscreen changes (incl. vendor-prefixed variants)
    const onFsChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        msFullscreenElement?: Element | null;
      };
      const fsEl =
        document.fullscreenElement ??
        doc.webkitFullscreenElement ??
        doc.msFullscreenElement ??
        null;
      setIsFullscreen(fsEl === playerRootRef.current);
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange as EventListener);
    document.addEventListener('MSFullscreenChange', onFsChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange as EventListener);
      document.removeEventListener('MSFullscreenChange', onFsChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      clearHideControlsTimer();
      return;
    }
    showControlsTemporarily();
    return () => clearHideControlsTimer();
  }, [isFullscreen, clearHideControlsTimer, showControlsTemporarily]);

  // When playing in minimized mode, hide controls after 3s (same as fullscreen)
  useEffect(() => {
    if (!playing) {
      setControlsVisible(true);
      clearHideControlsTimer();
      return;
    }
    if (!isFullscreen) {
      showControlsTemporarily();
    }
    return () => clearHideControlsTimer();
  }, [playing, isFullscreen, clearHideControlsTimer, showControlsTemporarily]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;

    // Sync play button state with actual media (e.g. after another player paused us or on re-mount)
    setPlaying(!media.paused);

    // Throttled time update to avoid 60fps re-renders (reduces lag during playback)
    const updateTime = () => {
      if (!isDragging && media) {
        const now = Date.now();
        latestTimeRef.current = media.currentTime;
        if (now - lastTimeUpdateRef.current >= TIME_UPDATE_THROTTLE_MS) {
          setCurrentTime(latestTimeRef.current);
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
  }, [src, isDragging, videoSrcReady, myId]);

  const play = async () => {
    const media = videoRef.current;
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
    const media = videoRef.current;
    if (!media) return;
    media.pause();
    setPlaying(false);
    if (useMediaFocusStore.getState().activeMediaId === myId) {
      useMediaFocusStore.getState().setActiveMediaId(null);
    }
  };

  const togglePlay = () => (playing ? pause() : play());

  const seekTo = (val: number) => {
    const media = videoRef.current;
    if (!media) return;
    media.currentTime = Math.max(0, Math.min(val, duration || 0));
    setCurrentTime(media.currentTime);
  };

  const seekBy = (delta: number) => {
    const media = videoRef.current;
    if (!media) return;
    const next = Math.max(0, Math.min(duration, media.currentTime + delta));
    media.currentTime = next;
    setCurrentTime(next);
  };

  const handleVolume = (v: number) => {
    const media = videoRef.current;
    if (!media) return;
    const newVolume = Math.max(0, Math.min(1, v));
    media.volume = newVolume;
    setVolume(newVolume);
    if (newVolume > 0) {
      setSavedVolume(newVolume);
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  const formatTime = (t: number) => {
    if (!t || isNaN(t)) return '00:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Use dragTime when dragging, otherwise use currentTime for smooth updates
  const displayTime = isDragging && dragTime !== null ? dragTime : currentTime;
  // Use dragVolume when dragging, otherwise use volume for smooth updates
  const displayVolume = isDraggingVolume && dragVolume !== null ? dragVolume : volume;
  const progressPercent = duration ? (displayTime / duration) * 100 : 0;

  const toggleMute = () => {
    const media = videoRef.current;
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
    const media = videoRef.current;
    if (!media) return;
    media.loop = !isLooping;
    setIsLooping(!isLooping);
  };

  const toggleFullscreen = async () => {
    const root = playerRootRef.current;
    if (!root) return;

    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };

    if (isFullscreen) {
      const exit = document.exitFullscreen ?? doc.webkitExitFullscreen ?? doc.msExitFullscreen;
      if (exit) {
        try {
          await exit.call(document);
        } catch {
          // ignore
        }
      }
      return;
    }

    const el = root as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };
    const request = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.msRequestFullscreen;
    if (request) {
      try {
        await request.call(el);
      } catch {
        // ignore
      }
    } else if (
      videoRef.current &&
      'webkitEnterFullscreen' in videoRef.current &&
      typeof (videoRef.current as HTMLVideoElement & { webkitEnterFullscreen: () => void })
        .webkitEnterFullscreen === 'function'
    ) {
      // iOS Safari fallback for <video>
      try {
        (
          videoRef.current as HTMLVideoElement & { webkitEnterFullscreen: () => void }
        ).webkitEnterFullscreen();
      } catch {
        // ignore
      }
    }
  };

  return {
    animationFrameRef,
    controlsVisible,
    cursorHidden,
    displayTime,
    displayVolume,
    dragTime,
    dragVolume,
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
    pause,
    play,
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
  };
}
