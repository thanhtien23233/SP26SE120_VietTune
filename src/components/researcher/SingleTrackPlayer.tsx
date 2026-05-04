import { Download, Eye, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

import logo from '@/components/image/VietTune logo.png';
import type { Recording } from '@/types';

type SingleTrackPlayerProps = {
  recording: Recording;
  className?: string;
};

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '00:00';
  const min = Math.floor(value / 60);
  const sec = Math.floor(value % 60);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function SingleTrackPlayer({ recording, className = '' }: SingleTrackPlayerProps) {
  const waveContainerRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasWaveError, setHasWaveError] = useState(false);
  const src = (recording.audioUrl ?? '').trim();

  useEffect(() => {
    if (!waveContainerRef.current || !src) return;
    setHasWaveError(false);
    const ws = WaveSurfer.create({
      container: waveContainerRef.current,
      url: src,
      height: 72,
      barWidth: 3,
      barGap: 2,
      barRadius: 4,
      waveColor: '#E8C98E',
      progressColor: '#9B2C2C',
      cursorColor: '#9B2C2C',
      cursorWidth: 2,
      normalize: true,
    });
    waveRef.current = ws;

    const onReady = () => {
      setReady(true);
      setDuration(ws.getDuration() || 0);
      setCurrentTime(0);
    };
    const onDecode = (value: number) => {
      if (Number.isFinite(value) && value > 0) setDuration(value);
    };
    const onTimeUpdate = (time: number) => {
      setCurrentTime(time);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onFinish = () => {
      setIsPlaying(false);
      setCurrentTime(ws.getDuration() || 0);
    };
    const onError = () => {
      setHasWaveError(true);
      setReady(false);
      setIsPlaying(false);
    };

    ws.on('ready', onReady);
    ws.on('decode', onDecode);
    ws.on('timeupdate', onTimeUpdate);
    ws.on('play', onPlay);
    ws.on('pause', onPause);
    ws.on('finish', onFinish);
    ws.on('error', onError);

    return () => {
      ws.destroy();
      waveRef.current = null;
      setReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [src]);

  const togglePlay = () => {
    if (!waveRef.current || !ready) return;
    void waveRef.current.playPause();
  };

  if (!src) {
    return (
      <div
        className={`rounded-2xl border border-primary-200/70 bg-surface-panel p-4 shadow-sm ${className}`}
      >
        <p className="text-sm text-neutral-600">Bản thu này chưa có nguồn âm thanh để phát.</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-primary-200/80 bg-surface-panel p-4 shadow-md ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 sm:h-28 sm:w-28">
          {recording.coverImage ? (
            <img
              src={recording.coverImage}
              alt={recording.title}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              width={112}
              height={112}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <img
                src={logo}
                alt="VietTune"
                className="h-14 w-14 object-contain opacity-40"
                loading="lazy"
                decoding="async"
                width={56}
                height={56}
              />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold leading-tight text-neutral-900">
            {recording.title || 'Không có tiêu đề'}
          </h3>
          <div className="mt-3 flex items-center gap-4 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {recording.viewCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Download className="h-3.5 w-3.5" />
              {recording.downloadCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-primary-100 bg-gradient-to-b from-white to-[#FFF7E6] px-3 py-3">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div ref={waveContainerRef} className="w-full" />
        {hasWaveError && (
          <div className="mt-2">
            <audio controls preload="metadata" src={src} className="w-full" />
          </div>
        )}
        <div className="mt-3 flex items-center">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!ready}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
