import React from 'react';

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement>;
};

export default function SpectrogramCanvas({ canvasRef }: Props) {
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-xl border border-secondary-200 bg-slate-900">
      <canvas ref={canvasRef} className="h-full w-full" aria-label="Shared spectrogram surface" />
    </div>
  );
}

