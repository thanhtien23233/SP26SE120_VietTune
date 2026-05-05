import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InstrumentConfidenceBar } from '@/components/common/InstrumentConfidenceBar';

describe('InstrumentConfidenceBar', () => {
  it('uses green tone at high confidence boundary', () => {
    render(<InstrumentConfidenceBar name="Dan tranh" confidence={0.7} />);

    const progressbar = screen.getByRole('progressbar', { name: /ai confidence cho dan tranh/i });
    expect(progressbar.getAttribute('aria-valuenow')).toBe('70');
    const fill = progressbar.firstElementChild as HTMLElement | null;
    expect(fill?.className).toContain('bg-emerald-500');
  });

  it('uses amber tone at medium confidence boundary', () => {
    render(<InstrumentConfidenceBar name="Sao truc" confidence={0.4} />);

    const progressbar = screen.getByRole('progressbar', { name: /ai confidence cho sao truc/i });
    expect(progressbar.getAttribute('aria-valuenow')).toBe('40');
    const fill = progressbar.firstElementChild as HTMLElement | null;
    expect(fill?.className).toContain('bg-amber-500');
  });

  it('uses red tone below medium threshold', () => {
    render(<InstrumentConfidenceBar name="Dan bau" confidence={0.39} />);

    const progressbar = screen.getByRole('progressbar', { name: /ai confidence cho dan bau/i });
    expect(progressbar.getAttribute('aria-valuenow')).toBe('39');
    const fill = progressbar.firstElementChild as HTMLElement | null;
    expect(fill?.className).toContain('bg-red-500');
  });

  it('renders compact mode with compact bar width class', () => {
    render(<InstrumentConfidenceBar name="Dan nhi" confidence={0.62} compact />);

    const progressbar = screen.getByRole('progressbar', { name: /ai confidence cho dan nhi/i });
    expect(progressbar.className).toContain('w-16');
    expect(progressbar.className).toContain('h-1.5');
  });

  it('shows unknown label when confidence is null (no 0% fallback)', () => {
    render(<InstrumentConfidenceBar name="Đàn tranh" confidence={null} />);

    expect(screen.queryByText('Không rõ độ tin cậy')).not.toBeNull();
    const progressbar = screen.getByRole('progressbar', { name: /ai confidence cho đàn tranh/i });
    expect(progressbar.getAttribute('aria-valuenow')).toBe('0');
  });

  it('renders full mode and peak label when maxConfidence is provided', () => {
    render(<InstrumentConfidenceBar name="Trong com" confidence={0.85} maxConfidence={0.93} />);

    const progressbar = screen.getByRole('progressbar', { name: /ai confidence cho trong com/i });
    expect(progressbar.className).toContain('w-40');
    expect(progressbar.className).toContain('h-2.5');
    expect(screen.queryByText('peak 93%')).not.toBeNull();
  });
});
