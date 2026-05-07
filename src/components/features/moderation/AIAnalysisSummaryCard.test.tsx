import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AIAnalysisSummaryCard from '@/components/features/moderation/AIAnalysisSummaryCard';

describe('AIAnalysisSummaryCard', () => {
  it('shows empty state when detection finished with no instruments', () => {
    render(
      <AIAnalysisSummaryCard
        analysisResult={{ instruments: [], timeline: null, audio_info: null }}
        metadataSuggestions={[]}
        metadataLoading={false}
        metadataError={null}
        detectionLoading={false}
        detectionError={null}
      />,
    );

    expect(screen.getByText(/Chưa có phân tích nhạc cụ/i)).toBeDefined();
  });

  it('renders top instruments with confidence', () => {
    render(
      <AIAnalysisSummaryCard
        analysisResult={{
          instruments: [{ name: 'Sáo', confidence: 0.82, id: '1' }],
          timeline: null,
          audio_info: null,
        }}
        metadataSuggestions={[
          {
            field: 'region',
            value: 'Miền núi',
            sourceInstrument: 'Sáo',
            confidence: 0.7,
          },
        ]}
        metadataLoading={false}
        metadataError={null}
        detectionLoading={false}
        detectionError={null}
      />,
    );

    expect(screen.getByText('Sáo')).toBeDefined();
    expect(screen.getAllByText('82%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Miền núi')).toBeDefined();
  });
});
