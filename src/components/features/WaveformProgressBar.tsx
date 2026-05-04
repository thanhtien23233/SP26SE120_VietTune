import { useMemo } from 'react';

interface WaveformProgressBarProps {
  progress: number; // 0-100
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  formatTime: (time: number) => string;
  isDragging?: boolean;
  onDragStart?: (e: React.MouseEvent) => void;
  className?: string;
  barCount?: number; // Number of bars in the waveform
}

export default function WaveformProgressBar({
  progress,
  duration,
  currentTime,
  onSeek,
  formatTime,
  isDragging = false,
  onDragStart,
  className = '',
  barCount = 80,
}: WaveformProgressBarProps) {
  // Generate random heights for waveform bars (consistent across renders)
  const barHeights = useMemo(() => {
    const heights: number[] = [];
    for (let i = 0; i < barCount; i++) {
      // Generate heights between 20% and 100% for visual variety
      heights.push(20 + Math.random() * 80);
    }
    return heights;
  }, [barCount]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;
    onSeek(newTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onDragStart) {
      onDragStart(e);
    } else {
      // Fallback if onDragStart not provided
      e.stopPropagation();
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();

      const updateProgress = (clientX: number) => {
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = percent * duration;
        onSeek(newTime);
      };

      updateProgress(e.clientX);

      const onMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        updateProgress(moveEvent.clientX);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mouseleave', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove, { passive: false });
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('mouseleave', onMouseUp);
    }
  };

  return (
    <div className={className}>
      {/* Waveform Container with Reflection */}
      <div className="relative">
        {/* Main Waveform */}
        <div
          className="relative w-full h-16 cursor-pointer group bg-surface-panel"
          onClick={handleClick}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-end justify-between h-full gap-0.5 px-1">
            {barHeights.map((baseHeight, index) => {
              const barProgress = ((index + 0.5) / barCount) * 100;
              const isPlayed = barProgress < progress;
              const barWidth = `calc((100% - ${barCount * 2}px) / ${barCount})`;

              return (
                <div
                  key={index}
                  className="rounded-sm transition-all duration-50 ease-out origin-bottom"
                  style={{
                    width: barWidth,
                    height: `${Math.min(100, baseHeight)}%`,
                    minHeight: '4px',
                    backgroundColor: isPlayed
                      ? '#9B2C2C' // primary-600 - red for played bars
                      : '#E5E5E5', // neutral-200 - light gray for unplayed bars
                    opacity: isPlayed ? 0.9 : 0.6,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Water Reflection Effect - Always visible, but bars only appear with rhythm */}
        <div
          className="relative w-full h-16 overflow-hidden"
          style={{
            transform: 'scaleY(-1)',
            marginTop: '2px',
            opacity: 0.9,
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)',
          }}
        >
          <div
            className="flex items-end justify-between h-full gap-0.5 px-1"
            style={{
              animation: 'waterRipple 3s ease-in-out infinite',
            }}
          >
            {barHeights.map((baseHeight, index) => {
              const barProgress = ((index + 0.5) / barCount) * 100;
              const isPlayed = barProgress < progress;
              const barWidth = `calc((100% - ${barCount * 2}px) / ${barCount})`;

              return (
                <div
                  key={index}
                  className="rounded-sm transition-all duration-50 ease-out origin-bottom"
                  style={{
                    width: barWidth,
                    height: `${Math.min(100, baseHeight)}%`,
                    minHeight: '4px',
                    backgroundColor: isPlayed
                      ? '#9B2C2C' // primary-600 - red for played bars (matching main waveform exactly)
                      : '#E5E5E5', // neutral-200 - gray for unplayed bars (matching main waveform exactly)
                    // Reflection opacity is lower than main waveform for water effect, but more visible
                    opacity: isPlayed ? 0.75 : 0.65,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Time Stamps */}
      <div className="flex justify-between mt-2.5">
        <span className="text-xs text-neutral-600 font-medium tabular-nums">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs text-neutral-600 font-medium tabular-nums">
          -{formatTime(Math.max(0, duration - currentTime))}
        </span>
      </div>
    </div>
  );
}
