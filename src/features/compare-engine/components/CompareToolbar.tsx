import { Pause, Play, RotateCcw } from 'lucide-react';

import type { FocusMode, SpectrogramMode } from '../types';

type Props = {
  mode: SpectrogramMode;
  setMode: (mode: SpectrogramMode) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  focusMode: FocusMode;
  onFocusChange: (mode: FocusMode) => void;
  crossfade: number;
  onCrossfade: (value: number) => void;
  zoomX: number;
  onZoomX: (value: number) => void;
  overlayOpacity: number;
  onOverlayOpacity: (value: number) => void;
  disabled?: boolean;
};

export default function CompareToolbar({
  mode,
  setMode,
  isPlaying,
  onTogglePlay,
  onReset,
  focusMode,
  onFocusChange,
  crossfade,
  onCrossfade,
  zoomX,
  onZoomX,
  overlayOpacity,
  onOverlayOpacity,
  disabled,
}: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-secondary-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        {(['side-by-side', 'overlay', 'difference'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={mode === v}
            onClick={() => setMode(v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              mode === v ? 'bg-primary-600 text-white' : 'bg-secondary-50 text-primary-800'
            }`}
          >
            {v === 'side-by-side' ? 'Side-by-side' : v === 'overlay' ? 'Overlay' : 'Difference'}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl border border-secondary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-800 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        {(['both', 'left', 'right'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFocusChange(f)}
            className={`rounded-lg px-2 py-1 text-xs ${focusMode === f ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-primary-800'}`}
          >
            {f === 'both' ? 'A+B' : f === 'left' ? 'A only' : 'B only'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs text-neutral-600">
          Crossfade
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={crossfade}
            onChange={(e) => onCrossfade(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-xs text-neutral-600">
          Zoom
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={zoomX}
            onChange={(e) => onZoomX(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-xs text-neutral-600">
          Overlay opacity
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={overlayOpacity}
            onChange={(e) => onOverlayOpacity(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
      </div>
    </div>
  );
}

