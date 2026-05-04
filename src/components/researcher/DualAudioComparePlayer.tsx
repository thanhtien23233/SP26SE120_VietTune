import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

import type { Recording } from '@/types';

type AudioFocusMode = 'both' | 'left' | 'right';

interface DualAudioComparePlayerProps {
  leftRecording?: Recording;
  rightRecording?: Recording;
  leftSource?: string;
  rightSource?: string;
  className?: string;
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '00:00';
  const min = Math.floor(value / 60);
  const sec = Math.floor(value % 60);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function safeDestroy(ws: WaveSurfer | null) {
  if (!ws) return;
  try {
    ws.destroy();
  } catch {
    /* AbortError from BodyStreamBuffer is expected during teardown */
  }
}

export default function DualAudioComparePlayer({
  leftRecording,
  rightRecording,
  leftSource,
  rightSource,
  className = '',
}: DualAudioComparePlayerProps) {
  const FALLBACK_REVEAL_DELAY_MS = 3000;
  const leftSrc = (leftSource ?? leftRecording?.audioUrl ?? '').trim();
  const rightSrc = (rightSource ?? rightRecording?.audioUrl ?? '').trim();

  const leftContainerRef = useRef<HTMLDivElement | null>(null);
  const rightContainerRef = useRef<HTMLDivElement | null>(null);
  const leftWaveRef = useRef<WaveSurfer | null>(null);
  const rightWaveRef = useRef<WaveSurfer | null>(null);
  const leftReadyRef = useRef(false);
  const rightReadyRef = useRef(false);
  const syncIntervalRef = useRef<number | null>(null);
  const isSyncApplyingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [leftReady, setLeftReady] = useState(false);
  const [rightReady, setRightReady] = useState(false);
  const [leftTime, setLeftTime] = useState(0);
  const [rightTime, setRightTime] = useState(0);
  const [leftDuration, setLeftDuration] = useState(0);
  const [rightDuration, setRightDuration] = useState(0);
  const [leftError, setLeftError] = useState(false);
  const [rightError, setRightError] = useState(false);
  const [leftFallbackEnabled, setLeftFallbackEnabled] = useState(false);
  const [rightFallbackEnabled, setRightFallbackEnabled] = useState(false);
  const [focusMode, setFocusMode] = useState<AudioFocusMode>('both');

  const maxDuration = Math.max(leftDuration, rightDuration);
  const timelineValue = Math.max(leftTime, rightTime);
  const bothReady = leftReady && rightReady;
  const hasBothSources = leftSrc.length > 0 && rightSrc.length > 0;
  const leftFallbackVisible = leftError || leftFallbackEnabled;
  const rightFallbackVisible = rightError || rightFallbackEnabled;

  const stopSyncInterval = () => {
    if (syncIntervalRef.current !== null) {
      window.clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  const applyFocusMode = (mode: AudioFocusMode) => {
    if (leftWaveRef.current) {
      leftWaveRef.current.setVolume(mode === 'right' ? 0 : 1);
    }
    if (rightWaveRef.current) {
      rightWaveRef.current.setVolume(mode === 'left' ? 0 : 1);
    }
  };

  useEffect(() => {
    applyFocusMode(focusMode);
  }, [focusMode, leftReady, rightReady]);

  useEffect(() => {
    if (!leftContainerRef.current || !leftSrc) return;
    setLeftError(false);
    setLeftFallbackEnabled(false);
    const fallbackTimer = window.setTimeout(() => {
      if (!leftReadyRef.current) setLeftFallbackEnabled(true);
    }, FALLBACK_REVEAL_DELAY_MS);
    const ws = WaveSurfer.create({
      container: leftContainerRef.current,
      url: leftSrc,
      height: 68,
      barWidth: 3,
      barGap: 2,
      barRadius: 4,
      waveColor: '#E8C98E',
      progressColor: '#9B2C2C',
      cursorColor: '#9B2C2C',
      cursorWidth: 2,
      normalize: true,
      fetchParams: {
        credentials: 'omit',
      },
    });
    leftWaveRef.current = ws;

    ws.on('ready', () => {
      leftReadyRef.current = true;
      setLeftReady(true);
      setLeftFallbackEnabled(false);
      setLeftDuration(ws.getDuration() || 0);
      setLeftTime(0);
    });
    ws.on('decode', (d) => {
      if (Number.isFinite(d) && d > 0) setLeftDuration(d);
    });
    ws.on('timeupdate', (t) => {
      setLeftTime(t);
      if (!isSyncApplyingRef.current && rightWaveRef.current && rightReadyRef.current) {
        const drift = Math.abs((rightWaveRef.current.getCurrentTime() || 0) - t);
        if (drift > 0.35) {
          isSyncApplyingRef.current = true;
          rightWaveRef.current.setTime(t);
          isSyncApplyingRef.current = false;
        }
      }
    });
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('error', () => {
      setLeftError(true);
      setLeftReady(false);
      setIsPlaying(false);
    });

    return () => {
      window.clearTimeout(fallbackTimer);
      safeDestroy(ws);
      leftWaveRef.current = null;
      leftReadyRef.current = false;
      setLeftReady(false);
      setLeftTime(0);
      setLeftDuration(0);
      setIsPlaying(false);
      stopSyncInterval();
    };
  }, [leftSrc]);

  useEffect(() => {
    if (!rightContainerRef.current || !rightSrc) return;
    setRightError(false);
    setRightFallbackEnabled(false);
    const fallbackTimer = window.setTimeout(() => {
      if (!rightReadyRef.current) setRightFallbackEnabled(true);
    }, FALLBACK_REVEAL_DELAY_MS);
    const ws = WaveSurfer.create({
      container: rightContainerRef.current,
      url: rightSrc,
      height: 68,
      barWidth: 3,
      barGap: 2,
      barRadius: 4,
      waveColor: '#D9EAFD',
      progressColor: '#1D4ED8',
      cursorColor: '#1D4ED8',
      cursorWidth: 2,
      normalize: true,
      fetchParams: {
        credentials: 'omit',
      },
    });
    rightWaveRef.current = ws;

    ws.on('ready', () => {
      rightReadyRef.current = true;
      setRightReady(true);
      setRightFallbackEnabled(false);
      setRightDuration(ws.getDuration() || 0);
      setRightTime(0);
    });
    ws.on('decode', (d) => {
      if (Number.isFinite(d) && d > 0) setRightDuration(d);
    });
    ws.on('timeupdate', (t) => {
      setRightTime(t);
      if (!isSyncApplyingRef.current && leftWaveRef.current && leftReadyRef.current) {
        const drift = Math.abs((leftWaveRef.current.getCurrentTime() || 0) - t);
        if (drift > 0.35) {
          isSyncApplyingRef.current = true;
          leftWaveRef.current.setTime(t);
          isSyncApplyingRef.current = false;
        }
      }
    });
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('error', () => {
      setRightError(true);
      setRightReady(false);
      setIsPlaying(false);
    });

    return () => {
      window.clearTimeout(fallbackTimer);
      safeDestroy(ws);
      rightWaveRef.current = null;
      rightReadyRef.current = false;
      setRightReady(false);
      setRightTime(0);
      setRightDuration(0);
      setIsPlaying(false);
      stopSyncInterval();
    };
  }, [rightSrc]);

  useEffect(() => {
    return () => {
      stopSyncInterval();
    };
  }, []);

  const canSyncPlay = hasBothSources && bothReady && !leftError && !rightError;

  const syncToTime = (time: number) => {
    isSyncApplyingRef.current = true;
    if (leftWaveRef.current) leftWaveRef.current.setTime(time);
    if (rightWaveRef.current) rightWaveRef.current.setTime(time);
    isSyncApplyingRef.current = false;
    setLeftTime(time);
    setRightTime(time);
  };

  const startSyncLoop = () => {
    stopSyncInterval();
    syncIntervalRef.current = window.setInterval(() => {
      if (!leftWaveRef.current || !rightWaveRef.current || !isPlaying) return;
      const leftNow = leftWaveRef.current.getCurrentTime() || 0;
      const rightNow = rightWaveRef.current.getCurrentTime() || 0;
      const drift = Math.abs(leftNow - rightNow);
      if (drift > 0.3) {
        isSyncApplyingRef.current = true;
        rightWaveRef.current.setTime(leftNow);
        isSyncApplyingRef.current = false;
      }
    }, 250);
  };

  const handleTogglePlay = async () => {
    if (!canSyncPlay || !leftWaveRef.current || !rightWaveRef.current) return;
    if (isPlaying) {
      leftWaveRef.current.pause();
      rightWaveRef.current.pause();
      setIsPlaying(false);
      stopSyncInterval();
      return;
    }
    const baseTime = Math.max(leftWaveRef.current.getCurrentTime(), rightWaveRef.current.getCurrentTime());
    syncToTime(baseTime);
    await Promise.allSettled([leftWaveRef.current.play(), rightWaveRef.current.play()]);
    setIsPlaying(true);
    startSyncLoop();
  };

  const handleReset = () => {
    if (!leftWaveRef.current || !rightWaveRef.current) return;
    leftWaveRef.current.pause();
    rightWaveRef.current.pause();
    syncToTime(0);
    setIsPlaying(false);
    stopSyncInterval();
  };

  const handleSeek = (value: number) => {
    syncToTime(value);
  };

  const leftArtist = useMemo(() => leftRecording?.performers?.[0]?.name ?? 'Không rõ nghệ nhân', [leftRecording]);
  const rightArtist = useMemo(
    () => rightRecording?.performers?.[0]?.name ?? 'Không rõ nghệ nhân',
    [rightRecording],
  );

  if (!hasBothSources) {
    return (
      <div className={`rounded-xl border border-secondary-200/70 bg-white p-4 ${className}`}>
        <p className="text-sm text-neutral-600">
          Cần chọn đủ 2 bản thu có nguồn âm thanh để dùng chế độ phát đồng bộ.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-secondary-200/70 bg-white p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-base font-semibold text-primary-800">Dual Audio Compare Player</h4>
        <div className="inline-flex items-center rounded-xl border border-secondary-200 bg-secondary-50/70 p-1">
          {(['both', 'left', 'right'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFocusMode(mode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                focusMode === mode
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-800 hover:bg-primary-100/70'
              }`}
            >
              {mode === 'both' ? 'A+B' : mode === 'left' ? 'A only' : 'B only'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-primary-200/70 bg-surface-panel p-3">
          <p className="mb-1 text-xs font-semibold text-primary-700">Track A</p>
          <p className="text-sm font-semibold text-neutral-900">{leftRecording?.title ?? 'Chưa chọn'}</p>
          <p className="mb-3 text-xs text-neutral-600">{leftArtist}</p>
          <div ref={leftContainerRef} className="w-full" />
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-700">
            <span>{formatTime(leftTime)}</span>
            <span>{formatTime(leftDuration)}</span>
          </div>
          {leftFallbackVisible && (
            <audio controls preload="metadata" src={leftSrc} className="mt-2 w-full" />
          )}
        </div>

        <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3">
          <p className="mb-1 text-xs font-semibold text-blue-700">Track B</p>
          <p className="text-sm font-semibold text-neutral-900">{rightRecording?.title ?? 'Chưa chọn'}</p>
          <p className="mb-3 text-xs text-neutral-600">{rightArtist}</p>
          <div ref={rightContainerRef} className="w-full" />
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-700">
            <span>{formatTime(rightTime)}</span>
            <span>{formatTime(rightDuration)}</span>
          </div>
          {rightFallbackVisible && (
            <audio controls preload="metadata" src={rightSrc} className="mt-2 w-full" />
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
          <span>{formatTime(timelineValue)}</span>
          <span>{formatTime(maxDuration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(maxDuration, 0.01)}
          step={0.1}
          value={Math.min(timelineValue, maxDuration || 0)}
          onChange={(e) => handleSeek(Number(e.target.value))}
          disabled={!canSyncPlay}
          className="w-full accent-primary-600"
          aria-label="Seek synchronized timeline"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void handleTogglePlay();
          }}
          disabled={!canSyncPlay}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? 'Pause All' : 'Play All'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!canSyncPlay}
          className="inline-flex items-center gap-2 rounded-xl border border-secondary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-800 transition-colors hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
          <Volume2 className="h-3.5 w-3.5" />
          Đồng bộ phát/tạm dừng/seek giữa hai bản thu.
        </span>
      </div>
    </div>
  );
}
