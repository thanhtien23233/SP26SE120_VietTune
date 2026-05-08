import { useMemo, useState } from 'react';

import { useCompareEngine } from '../hooks/useCompareEngine';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useSpectrogramMode } from '../hooks/useSpectrogramMode';

import CompareTimeline from './CompareTimeline';
import CompareToolbar from './CompareToolbar';
import DifferenceScoreCard from './DifferenceScoreCard';
import EthnoResearchPanel from './EthnoResearchPanel';
import MetadataDrawer from './MetadataDrawer';
import SpectrogramCanvas from './SpectrogramCanvas';
import SpectrogramDebugPanel from './SpectrogramDebugPanel';
import WaveSurferSpectrogramCompare from './WaveSurferSpectrogramCompare';

type Props = {
  leftRecording?: import('@/types').Recording;
  rightRecording?: import('@/types').Recording;
  leftSource?: string;
  rightSource?: string;
  metadataPanel?: React.ReactNode;
  className?: string;
};

export default function CompareWorkstation({
  leftRecording,
  rightRecording,
  leftSource,
  rightSource,
  metadataPanel,
  className = '',
}: Props) {
  const leftSrc = (leftSource ?? leftRecording?.audioUrl ?? '').trim();
  const rightSrc = (rightSource ?? rightRecording?.audioUrl ?? '').trim();
  const hasBothSources = leftSrc.length > 0 && rightSrc.length > 0;
  const { mode, setMode } = useSpectrogramMode();
  const engine = useCompareEngine({ leftSource: leftSrc, rightSource: rightSrc, mode });
  const [annotations, setAnnotations] = useState<Array<{ id: string; at: number; text: string }>>([]);

  useKeyboardShortcuts({
    onTogglePlay: engine.togglePlay,
    onNudge: (delta) => engine.seek(Math.max(0, engine.time + delta)),
    setMode,
    setFocusBoth: () => engine.setFocus('both'),
    setFocusA: () => engine.setFocus('left'),
    setFocusB: () => engine.setFocus('right'),
  });

  const heading = useMemo(
    () => `${leftRecording?.title ?? 'Track A'} vs ${rightRecording?.title ?? 'Track B'}`,
    [leftRecording?.title, rightRecording?.title],
  );
  const leftInstruments = useMemo(
    () => (leftRecording?.instruments ?? []).map((i) => i.nameVietnamese ?? i.name).filter(Boolean),
    [leftRecording?.instruments],
  );
  const rightInstruments = useMemo(
    () => (rightRecording?.instruments ?? []).map((i) => i.nameVietnamese ?? i.name).filter(Boolean),
    [rightRecording?.instruments],
  );

  if (!hasBothSources) {
    return (
      <div className={`rounded-xl border border-secondary-200/70 bg-white p-4 ${className}`}>
        <p className="text-sm text-neutral-600">
          Cần chọn đủ 2 bản thu có nguồn âm thanh để dùng Shared Spectrogram Compare Engine.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 rounded-2xl border border-secondary-200/80 bg-white p-4 ${className}`}>
      <div>
        <h4 className="text-base font-semibold text-primary-800">VietTune Shared Spectrogram Compare Engine</h4>
        <p className="text-xs text-neutral-600">{heading}</p>
      </div>
      <div className="flex justify-end">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-secondary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 disabled:opacity-50"
            disabled={engine.analysisLoading}
            onClick={async () => {
              const url = await engine.exportSpectrogramImage('A');
              if (!url) return;
              const link = document.createElement('a');
              link.href = url;
              link.download = `viettune-spectrogram-a-${Date.now()}.png`;
              link.click();
            }}
          >
            Export Track A PNG
          </button>
          <button
            type="button"
            className="rounded-lg border border-secondary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 disabled:opacity-50"
            disabled={engine.analysisLoading}
            onClick={async () => {
              const url = await engine.exportSpectrogramImage('B');
              if (!url) return;
              const link = document.createElement('a');
              link.href = url;
              link.download = `viettune-spectrogram-b-${Date.now()}.png`;
              link.click();
            }}
          >
            Export Track B PNG
          </button>
        </div>
      </div>
      <CompareToolbar
        mode={mode}
        setMode={setMode}
        isPlaying={engine.isPlaying}
        onTogglePlay={engine.togglePlay}
        onReset={engine.reset}
        focusMode={engine.focusMode}
        onFocusChange={engine.setFocus}
        crossfade={engine.crossfade}
        onCrossfade={engine.setCrossfade}
        zoomX={engine.zoomX}
        onZoomX={engine.setZoomX}
        overlayOpacity={engine.overlayOpacity}
        onOverlayOpacity={engine.setOverlayOpacity}
        disabled={!engine.ready}
      />
      {engine.analysisError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Audio analysis failed: {engine.analysisError}
        </div>
      ) : null}
      {engine.analysisLoading && !engine.analysisError ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          {engine.spectrogramBackend === 'wavesurfer'
            ? 'Loading WaveSurfer spectrograms (muted preview; audio uses shared engine)...'
            : 'Preparing spectrogram analysis in background...'}
        </div>
      ) : null}
      {engine.spectrogramBackend === 'wavesurfer' ? (
        <WaveSurferSpectrogramCompare
          mode={mode}
          overlayOpacity={engine.overlayOpacity}
          leftMountRef={engine.leftSpectrogramMountRef}
          rightMountRef={engine.rightSpectrogramMountRef}
        />
      ) : (
        <SpectrogramCanvas canvasRef={engine.canvasRef} />
      )}
      <CompareTimeline
        time={engine.time}
        duration={engine.duration}
        onSeek={engine.seek}
        disabled={!engine.ready}
      />
      <DifferenceScoreCard
        backend={engine.spectrogramBackend}
        summary={engine.summary}
      />
      <SpectrogramDebugPanel
        backend={engine.spectrogramBackend}
        trackA={engine.diagnostics.trackA}
        trackB={engine.diagnostics.trackB}
      />
      <EthnoResearchPanel
        leftInstruments={leftInstruments}
        rightInstruments={rightInstruments}
        motifSimilarity={engine.motifSimilarity}
        regionStart={engine.regionStart}
        regionEnd={engine.regionEnd}
        duration={engine.duration}
        onRegionStart={engine.setRegionStart}
        onRegionEnd={engine.setRegionEnd}
        annotations={annotations}
        onAddAnnotation={(text, at) =>
          setAnnotations((prev) => [...prev, { id: crypto.randomUUID(), text, at }])
        }
      />
      {metadataPanel ? <MetadataDrawer>{metadataPanel}</MetadataDrawer> : null}
    </div>
  );
}

