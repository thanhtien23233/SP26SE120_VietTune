import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MetadataSuggestionPanel from '@/components/features/upload/MetadataSuggestionPanel';
import type { MetadataSuggestion } from '@/types/instrumentDetection';
import * as instrumentMetadataMapper from '@/utils/instrumentMetadataMapper';

describe('MetadataSuggestionPanel', () => {
  it('applies top advisory candidate for each field', () => {
    const onApply = vi.fn();
    const suggestions: MetadataSuggestion[] = [
      { field: 'region', value: 'Miền Bắc', sourceInstrument: 'Đàn tranh', confidence: 0.82 },
      { field: 'region', value: 'Miền Trung', sourceInstrument: 'Sáo trúc', confidence: 0.61 },
      { field: 'ethnicity', value: 'Kinh', sourceInstrument: 'Đàn tranh', confidence: 0.66 },
    ];

    render(<MetadataSuggestionPanel suggestions={suggestions} onApply={onApply} />);

    expect(
      screen.getAllByText(/Độ tin cậy hiển thị theo mức phát hiện nhạc cụ/).length,
    ).toBeGreaterThan(0);

    const applyButtons = screen.getAllByRole('button', { name: 'Áp dụng' });
    expect(applyButtons.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(applyButtons[0]);
    expect(onApply).toHaveBeenCalledWith('ethnicity', 'Kinh (Việt)');

    fireEvent.click(applyButtons[1]);
    expect(onApply).toHaveBeenCalledWith('region', 'Miền Bắc');
  });

  it('uses separate advisory groups for vocalStyle and eventType', () => {
    const onApply = vi.fn();
    const suggestions: MetadataSuggestion[] = [
      { field: 'vocalStyle', value: 'Ca trù', sourceInstrument: 'Đàn tranh', confidence: 0.88 },
      { field: 'vocalStyle', value: 'Chèo', sourceInstrument: 'Đàn tranh', confidence: 0.5 },
      { field: 'eventType', value: 'Lễ hội', sourceInstrument: 'Đàn tranh', confidence: 0.88 },
      { field: 'eventType', value: 'Biểu diễn', sourceInstrument: 'Đàn tranh', confidence: 0.4 },
    ];

    render(<MetadataSuggestionPanel suggestions={suggestions} onApply={onApply} />);

    expect(
      screen.getAllByText(/Độ tin cậy hiển thị theo mức phát hiện nhạc cụ/).length,
    ).toBeGreaterThan(0);

    expect(screen.getAllByText('Ca trù').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lễ hội').length).toBeGreaterThan(0);

    const vocalLabel = screen.getAllByText('Lối hát / Thể loại')[0];
    const vocalCard = vocalLabel.parentElement?.nextElementSibling as HTMLElement;
    const eventLabel = screen.getAllByText('Loại sự kiện')[0];
    const eventCard = eventLabel.parentElement?.nextElementSibling as HTMLElement;

    fireEvent.click(within(vocalCard).getByRole('button', { name: 'Áp dụng' }));
    fireEvent.click(within(eventCard).getByRole('button', { name: 'Áp dụng' }));
    expect(onApply).toHaveBeenCalledWith('vocalStyle', 'Ca trù');
    expect(onApply).toHaveBeenCalledWith('eventType', 'Lễ hội');
  });

  it('when advisory top does not match any eventType row, falls back to row value and still shows source', () => {
    const spy = vi.spyOn(instrumentMetadataMapper, 'groupMetadataSuggestionsForAdvisory').mockReturnValue([
      {
        field: 'eventType',
        candidates: [
          {
            value: 'KhôngCóTrongRows',
            label: 'KhôngCóTrongRows',
            score: 0.99,
            sourceInstrument: 'Khác',
          },
        ],
        conflictDetected: false,
        requiresExpert: true,
      },
    ]);
    try {
      render(
        <MetadataSuggestionPanel
          suggestions={[
            { field: 'eventType', value: 'Lễ hội', sourceInstrument: 'Đàn tranh', confidence: 0.7 },
          ]}
        />,
      );
      expect(screen.getAllByText('Lễ hội').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Nguồn: Đàn tranh/).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('progressbar', { name: /AI confidence cho Đàn tranh/i }).length).toBeGreaterThan(
        0,
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('shows confidence footnote in readOnly mode when suggestions exist', () => {
    const suggestions: MetadataSuggestion[] = [
      { field: 'region', value: 'Miền Bắc', sourceInstrument: 'Đàn tranh', confidence: 0.8 },
    ];
    render(<MetadataSuggestionPanel suggestions={suggestions} readOnly />);
    expect(
      screen.getAllByText(/không phải từ mô hình dự đoán độc lập/).length,
    ).toBeGreaterThan(0);
  });
});
