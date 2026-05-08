import type { DifferenceSummary } from '../types';

type Backend = 'custom' | 'wavesurfer';

type Props = {
  summary: DifferenceSummary;
  /** Custom FFT matrices supply real metrics; WaveSurfer demo shows placeholders. */
  backend?: Backend;
};

export default function DifferenceScoreCard({
  summary,
  backend = 'wavesurfer',
}: Props) {
  const wsDemo = backend === 'wavesurfer';

  return (
    <div className="rounded-xl border border-secondary-200 bg-secondary-50/50 p-3 text-xs text-neutral-700">
      <p className="mb-1 font-semibold text-primary-800">Difference analytics</p>
      {wsDemo ? (
        <p className="mb-2 rounded-md bg-secondary-100/80 px-2 py-1.5 text-[11px] text-neutral-600">
          Spectral numeric metrics require the offline FFT renderer. WaveSurfer demo mode shows waveform/spectrogram
          only; similarity scores below are placeholders.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <span>Divergence: {summary.divergence.toFixed(3)}</span>
        <span>Bass: {summary.bass.toFixed(3)}</span>
        <span>Mid: {summary.mid.toFixed(3)}</span>
        <span>Treble: {summary.treble.toFixed(3)}</span>
        <span>Similarity: {(summary.similarity * 100).toFixed(1)}%</span>
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">
        Difference heatmap range: {`\u00B1${summary.signedRangeDb}dB`} (blue: B louder, red: A louder){' '}
        {wsDemo ? '— Heatmap unavailable in WaveSurfer mode.' : null}
      </p>
    </div>
  );
}
