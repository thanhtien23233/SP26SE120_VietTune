type Props = {
  time: number;
  duration: number;
  onSeek: (next: number) => void;
  disabled?: boolean;
};

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '00:00';
  const min = Math.floor(value / 60);
  const sec = Math.floor(value % 60);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function CompareTimeline({ time, duration, onSeek, disabled }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-600">
        <span>{formatTime(time)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0.01, duration)}
        step={0.01}
        value={Math.min(time, duration)}
        onChange={(e) => onSeek(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-primary-600"
        aria-label="Shared synchronized timeline"
      />
    </div>
  );
}

