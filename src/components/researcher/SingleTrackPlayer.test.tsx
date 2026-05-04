import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SingleTrackPlayer from '@/components/researcher/SingleTrackPlayer';
import { RecordingQuality, RecordingType, VerificationStatus } from '@/types';
import { Region } from '@/types';
import { UserRole } from '@/types';
import type { Recording } from '@/types';

type HandlerMap = Record<string, ((...args: unknown[]) => void) | undefined>;

const waveSurferMock = vi.hoisted(() => {
  const handlers: HandlerMap = {};
  let isPlaying = false;
  const instance = {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
    }),
    destroy: vi.fn(),
    getDuration: vi.fn(() => 125),
    playPause: vi.fn(async () => {
      isPlaying = !isPlaying;
      handlers[isPlaying ? 'play' : 'pause']?.();
    }),
  };

  return {
    handlers,
    create: vi.fn(() => instance),
    reset() {
      isPlaying = false;
      Object.keys(handlers).forEach((key) => {
        delete handlers[key];
      });
      vi.clearAllMocks();
    },
    instance,
  };
});

vi.mock('wavesurfer.js', () => ({
  default: {
    create: waveSurferMock.create,
  },
}));

vi.mock('@/components/image/VietTune logo.png', () => ({
  default: 'logo.png',
}));

const recordingFixture: Recording = {
  id: 'r1',
  title: 'Dan ca',
  ethnicity: {
    id: 'e1',
    name: 'Kinh',
    nameVietnamese: 'Kinh',
    region: Region.RED_RIVER_DELTA,
    recordingCount: 1,
  },
  region: Region.RED_RIVER_DELTA,
  recordingType: RecordingType.FOLK_SONG,
  duration: 120,
  audioUrl: 'https://example.com/audio.mp3',
  instruments: [],
  performers: [],
  uploadedDate: '2026-01-01T00:00:00.000Z',
  uploader: {
    id: 'u1',
    username: 'user',
    email: 'u@example.com',
    fullName: 'User',
    role: UserRole.USER,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  tags: [],
  metadata: {
    recordingQuality: RecordingQuality.FIELD_RECORDING,
  },
  verificationStatus: VerificationStatus.PENDING,
  viewCount: 0,
  likeCount: 0,
  downloadCount: 0,
};

describe('SingleTrackPlayer', () => {
  beforeEach(() => {
    waveSurferMock.reset();
  });

  it('toggles play/pause button label when waveform player emits events', async () => {
    render(<SingleTrackPlayer recording={recordingFixture} />);

    waveSurferMock.handlers.ready?.();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Phát' }).hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Phát' }));
    expect(waveSurferMock.instance.playPause).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Tạm dừng' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng' }));
    expect(waveSurferMock.instance.playPause).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('button', { name: 'Phát' })).not.toBeNull();
  });

  it('shows missing-audio message when source url is empty', () => {
    render(<SingleTrackPlayer recording={{ ...recordingFixture, audioUrl: '' }} />);
    expect(screen.getByText('Bản thu này chưa có nguồn âm thanh để phát.')).not.toBeNull();
  });
});
