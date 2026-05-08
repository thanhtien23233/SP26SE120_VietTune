import React from 'react';

import type { SpectrogramMode } from '../types';

type Props = {
  mode: SpectrogramMode;
  overlayOpacity: number;
  /** Mount points for WaveSurfer (refs from useCompareEngine). */
  leftMountRef: React.RefObject<HTMLDivElement | null>;
  rightMountRef: React.RefObject<HTMLDivElement | null>;
};

const asDivRef = (r: React.RefObject<HTMLDivElement | null>) => r as React.Ref<HTMLDivElement>;

/**
 * Presentation-only mounts for muted WaveSurfer + Spectrogram (instances owned by useCompareEngine).
 */
export default function WaveSurferSpectrogramCompare({
  mode,
  overlayOpacity,
  leftMountRef,
  rightMountRef,
}: Props) {
  const panelChrome =
    'min-h-[120px] w-full rounded-lg border border-white/10 bg-black/40 shadow-inner ring-1 ring-white/5';

  if (mode === 'overlay') {
    const op = Math.max(0.15, Math.min(1, overlayOpacity));
    return (
      <div
        className="relative h-[320px] w-full overflow-hidden rounded-xl border border-secondary-200/80 bg-[#070b14]"
        aria-label="Spectrogram compare surface overlay"
      >
        <div className="pointer-events-none absolute left-3 top-2 z-10 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
          Overlay blend
        </div>
        <div className="absolute inset-0 p-2 pt-8">
          <div className="relative h-full w-full">
            <div className={`absolute inset-0 ${panelChrome} overflow-hidden`}>
              <div ref={asDivRef(leftMountRef)} className="h-full w-full" />
            </div>
            <div
              className="absolute inset-0 overflow-hidden mix-blend-screen"
              style={{ opacity: op }}
            >
              <div className={`h-full w-full ${panelChrome}`}>
                <div ref={asDivRef(rightMountRef)} className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'difference') {
    return (
      <div
        className="relative h-[320px] w-full overflow-hidden rounded-xl border border-secondary-200/80 bg-[#070b14]"
        aria-label="Spectrogram compare surface experimental"
      >
        <div className="pointer-events-none absolute left-3 top-2 z-10 flex items-center gap-2">
          <span className="rounded-full bg-violet-500/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-100">
            Experimental
          </span>
          <span className="text-[10px] text-white/50">Visual spectral contrast (not numeric diff)</span>
        </div>
        <div className="absolute inset-0 p-2 pt-8">
          <div className="relative h-full w-full">
            <div className={`absolute inset-0 ${panelChrome} overflow-hidden`}>
              <div ref={asDivRef(leftMountRef)} className="h-full w-full" />
            </div>
            <div className="absolute inset-0 overflow-hidden mix-blend-difference opacity-85">
              <div className={`h-full w-full ${panelChrome}`}>
                <div ref={asDivRef(rightMountRef)} className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-[320px] w-full flex-col gap-2 overflow-hidden rounded-xl border border-secondary-200/80 bg-[#070b14] p-2"
      aria-label="Spectrogram compare surface side by side"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#f59e0b]/90">
          Track A
        </p>
        <div className={`min-h-0 flex-1 overflow-hidden ${panelChrome}`}>
          <div ref={asDivRef(leftMountRef)} className="h-full min-h-[128px] w-full" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#60a5fa]/90">
          Track B
        </p>
        <div className={`min-h-0 flex-1 overflow-hidden ${panelChrome}`}>
          <div ref={asDivRef(rightMountRef)} className="h-full min-h-[128px] w-full" />
        </div>
      </div>
    </div>
  );
}
