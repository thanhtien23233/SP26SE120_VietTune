import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InstrumentConfidencePanel from '@/components/features/moderation/InstrumentConfidencePanel';

const analyzeRecordingMock = vi.fn();

vi.mock('@/services/instrumentDetectionService', () => ({
  instrumentDetectionFlags: {
    confidenceEnabled: true,
    mockEnabled: false,
  },
  instrumentDetectionService: {
    analyzeRecording: (...args: unknown[]) => analyzeRecordingMock(...args),
  },
}));

describe('InstrumentConfidencePanel', () => {
  beforeEach(() => {
    analyzeRecordingMock.mockReset();
  });

  it('loads and renders sorted instrument confidence rows', async () => {
    analyzeRecordingMock.mockResolvedValueOnce({
      instruments: [
        { name: 'Dan bau', confidence: 0.32 },
        { name: 'Dan tranh', confidence: 0.92 },
      ],
      timeline: null,
      audio_info: {
        filename: 'a.wav',
        duration_seconds: 120,
        analyzed_duration: 118,
        num_frames: 256,
        sample_rate: 44100,
      },
    });

    render(<InstrumentConfidencePanel recordingId="rec-1" />);

    expect(screen.getByRole('status').textContent).toContain('Đang phân tích nhạc cụ...');
    await waitFor(() => {
      expect(screen.queryByText('Dan tranh')).not.toBeNull();
    });
    expect(screen.queryByText('Phân tích: 118s / 256 frames / 44100 Hz')).not.toBeNull();
  });

  it('shows error state when analyze request fails', async () => {
    analyzeRecordingMock.mockRejectedValueOnce(new Error('network error'));

    render(<InstrumentConfidencePanel recordingId="rec-2" />);

    await waitFor(() => {
      expect(screen.queryByText('Không thể tải confidence nhạc cụ từ AI.')).not.toBeNull();
    });
  });

  it('does not call API when disabled', () => {
    render(<InstrumentConfidencePanel recordingId="rec-3" enabled={false} />);
    expect(analyzeRecordingMock).not.toHaveBeenCalled();
  });
});
