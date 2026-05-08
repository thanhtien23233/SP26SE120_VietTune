type Props = {
  leftInstruments: string[];
  rightInstruments: string[];
  motifSimilarity: number;
  regionStart: number;
  regionEnd: number;
  duration: number;
  onRegionStart: (value: number) => void;
  onRegionEnd: (value: number) => void;
  annotations: Array<{ id: string; at: number; text: string }>;
  onAddAnnotation: (text: string, at: number) => void;
};

export default function EthnoResearchPanel({
  leftInstruments,
  rightInstruments,
  motifSimilarity,
  regionStart,
  regionEnd,
  duration,
  onRegionStart,
  onRegionEnd,
  annotations,
  onAddAnnotation,
}: Props) {
  const overlap = leftInstruments.filter((name) => rightInstruments.includes(name));
  return (
    <div className="space-y-3 rounded-xl border border-secondary-200 bg-white p-3">
      <p className="text-sm font-semibold text-primary-800">Ethnomusicology analysis layer</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-secondary-50 p-2 text-xs">
          <p className="font-semibold text-neutral-700">Instrument fingerprint</p>
          <p>A: {leftInstruments.join(', ') || '—'}</p>
          <p>B: {rightInstruments.join(', ') || '—'}</p>
          <p>Shared: {overlap.join(', ') || 'None'}</p>
        </div>
        <div className="rounded-lg bg-secondary-50 p-2 text-xs">
          <p className="font-semibold text-neutral-700">Motif similarity (selected region)</p>
          <p className="text-lg font-semibold text-primary-800">{(motifSimilarity * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-secondary-50 p-2 text-xs">
          <p className="font-semibold text-neutral-700">Region compare</p>
          <label className="mt-1 block">
            Start
            <input
              type="range"
              min={0}
              max={Math.max(0.01, duration)}
              step={0.1}
              value={regionStart}
              onChange={(e) => onRegionStart(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="mt-1 block">
            End
            <input
              type="range"
              min={0}
              max={Math.max(0.01, duration)}
              step={0.1}
              value={Math.max(regionEnd, regionStart)}
              onChange={(e) => onRegionEnd(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-secondary-200 p-2 text-xs">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold text-neutral-700">Research annotations</p>
          <button
            type="button"
            className="rounded bg-primary-600 px-2 py-1 text-white"
            onClick={() => {
              const text = window.prompt('Annotation note');
              if (!text?.trim()) return;
              const at = Number(window.prompt('Time (seconds)', '0') ?? '0');
              onAddAnnotation(text.trim(), Number.isFinite(at) ? at : 0);
            }}
          >
            Add note
          </button>
        </div>
        {annotations.length === 0 ? (
          <p className="text-neutral-500">No annotation yet.</p>
        ) : (
          <ul className="space-y-1">
            {annotations.map((item) => (
              <li key={item.id}>
                <span className="font-semibold text-primary-800">{item.at.toFixed(1)}s</span> - {item.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

