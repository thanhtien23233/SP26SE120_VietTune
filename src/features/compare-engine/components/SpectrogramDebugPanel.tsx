import type { SpectrogramDiagnostics } from '../types';

type Backend = 'custom' | 'wavesurfer';

type Props = {
  trackA: SpectrogramDiagnostics | null;
  trackB: SpectrogramDiagnostics | null;
  backend?: Backend;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className="font-mono text-neutral-700">{value}</span>
    </div>
  );
}

const WS_PLUGIN_NOTE = (
  <>
    <Row label="Engine" value="wavesurfer.js Spectrogram plugin" />
    <Row label="Colour map" value="roseus · mel scale · muted viz" />
    <Row label="FFT samples" value="browser default (~2048, plugin)" />
    <Row label="gainDB/rangeDB" value="20 / 75 (tuned demo)" />
  </>
);

export default function SpectrogramDebugPanel({
  trackA,
  trackB,
  backend = 'wavesurfer',
}: Props) {
  if (backend === 'wavesurfer') {
    return (
      <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-3 text-xs">
        <p className="mb-2 font-semibold text-primary-800">Spectrogram checkpoints (WaveSurfer)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1 rounded-md bg-white p-2">
            <p className="font-semibold text-primary-800">Track A</p>
            {WS_PLUGIN_NOTE}
          </div>
          <div className="space-y-1 rounded-md bg-white p-2">
            <p className="font-semibold text-primary-800">Track B</p>
            {WS_PLUGIN_NOTE}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">
          Playback uses VietTune AudioEngine (decodes twice in demo mode: editor + spectrogram URLs).
        </p>
      </div>
    );
  }

  if (!trackA && !trackB) return null;

  const block = (title: string, d: SpectrogramDiagnostics | null) => (
    <div className="space-y-1 rounded-md bg-white p-2">
      <p className="font-semibold text-primary-800">{title}</p>
      {!d ? (
        <p className="text-neutral-500">No diagnostics</p>
      ) : (
        <>
          <Row label="SampleRate" value={`${d.sampleRate}`} />
          <Row label="FFT/Hop" value={`${d.fftSize}/${d.hopSize}`} />
          <Row label="Frames/Bins" value={`${d.frameCount}/${d.binCount}`} />
          <Row label="dB min/max" value={`${d.dbMin.toFixed(1)} / ${d.dbMax.toFixed(1)}`} />
          <Row label="dB p05/p95" value={`${d.dbP05.toFixed(1)} / ${d.dbP95.toFixed(1)}`} />
        </>
      )}
    </div>
  );

  return (
    <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-3 text-xs">
      <p className="mb-2 font-semibold text-primary-800">FFT render checkpoints</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {block('Track A', trackA)}
        {block('Track B', trackB)}
      </div>
    </div>
  );
}
