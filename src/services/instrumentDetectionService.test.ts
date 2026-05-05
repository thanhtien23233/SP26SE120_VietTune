import { beforeEach, describe, expect, it, vi } from 'vitest';

import { legacyPost } from '@/api/legacyHttp';
import { createInstrumentDetectionService } from '@/services/instrumentDetectionService';

vi.mock('@/api/legacyHttp', () => ({
  legacyPost: vi.fn(),
}));

function createMockClient() {
  return {
    GET: vi.fn(),
    POST: vi.fn(),
  };
}

describe('instrumentDetectionService', () => {
  beforeEach(() => {
    vi.mocked(legacyPost).mockReset();
  });

  it('maps POST /api/AIAnalysis/analyze-only payload (id, name, confidence)', async () => {
    const client = createMockClient();
    const service = createInstrumentDetectionService(client);
    vi.mocked(legacyPost).mockResolvedValueOnce({
      data: {
        instruments: [
          { id: 'u1', name: 'Đàn tranh', confidence: 0.92 },
          { id: 'u2', name: 'Sáo trúc', confidence: 0.64 },
        ],
      },
    });

    const file = new File([new Uint8Array([1, 2, 3])], 'sample.mp3', { type: 'audio/mpeg' });
    const result = await service.analyzeOnlyFromFile(file);

    expect(legacyPost).toHaveBeenCalledWith(
      '/AIAnalysis/analyze-only',
      expect.any(FormData),
      expect.objectContaining({ timeout: 300000 }),
    );
    expect(client.POST).not.toHaveBeenCalled();
    expect(result.instruments).toHaveLength(2);
    expect(result.instruments[0]?.name).toBe('Đàn tranh');
    expect(result.instruments[0]?.confidence).toBe(0.92);
    expect(result.instruments[1]?.confidence).toBe(0.64);
    expect(result.timeline).toBeNull();
    expect(result.audio_info).toBeNull();
  });

  it('maps missing confidence to null (no fake 0%)', async () => {
    const client = createMockClient();
    const service = createInstrumentDetectionService(client);
    vi.mocked(legacyPost).mockResolvedValueOnce({
      instruments: [{ id: 'u1', name: 'Đàn bầu' }],
    });

    const file = new File([new Uint8Array([1])], 'a.mp3', { type: 'audio/mpeg' });
    const result = await service.analyzeOnlyFromFile(file);

    expect(result.instruments).toHaveLength(1);
    expect(result.instruments[0]?.name).toBe('Đàn bầu');
    expect(result.instruments[0]?.confidence).toBeNull();
  });

  it('normalizes analyze-recording direct payload', async () => {
    const client = createMockClient();
    const service = createInstrumentDetectionService(client);
    client.POST.mockResolvedValueOnce({
      data: {
        instruments: [
          {
            name: 'Sao truc',
            confidence: 0.63,
          },
        ],
        timeline: null,
        audioInfo: {
          filename: 'recording.wav',
          duration_seconds: 33,
          analyzed_duration: 33,
          num_frames: 100,
          sample_rate: 22050,
        },
      },
      response: new Response(null, { status: 200 }),
    });

    const result = await service.analyzeRecording('rec-123');

    expect(client.POST).toHaveBeenCalledWith('/api/audio-analysis/analyze-recording/{recordingId}', {
      params: { path: { recordingId: 'rec-123' } },
    });
    expect(result.instruments[0]?.name).toBe('Sao truc');
    expect(result.instruments[0]?.confidence).toBe(0.63);
    expect(result.audio_info?.filename).toBe('recording.wav');
  });

  it('returns supported instruments from service response', async () => {
    const client = createMockClient();
    const service = createInstrumentDetectionService(client);
    client.GET.mockResolvedValueOnce({
      data: {
        data: ['Dan bau', 'Dan nhi', 1, null],
      },
      response: new Response(null, { status: 200 }),
    });

    const result = await service.getSupportedInstruments();

    expect(result).toEqual(['Dan bau', 'Dan nhi']);
  });

  it('extracts instruments from { value: { instruments } } envelope', async () => {
    const client = createMockClient();
    const service = createInstrumentDetectionService(client);
    vi.mocked(legacyPost).mockResolvedValueOnce({
      value: {
        instruments: [
          { id: 'v1', name: 'Đàn tranh', confidence: 0.92 },
          { id: 'v2', name: 'Sáo trúc', confidence: 0.64 },
        ],
      },
    });

    const file = new File([new Uint8Array([1])], 'a.mp3', { type: 'audio/mpeg' });
    const result = await service.analyzeOnlyFromFile(file);

    expect(result.instruments).toHaveLength(2);
    expect(result.instruments[0]?.name).toBe('Đàn tranh');
    expect(result.instruments[0]?.confidence).toBe(0.92);
    expect(result.instruments[1]?.name).toBe('Sáo trúc');
    expect(result.instruments[1]?.confidence).toBe(0.64);
  });

  it('parses string confidence values from backend', async () => {
    const client = createMockClient();
    const service = createInstrumentDetectionService(client);
    vi.mocked(legacyPost).mockResolvedValueOnce({
      instruments: [
        { id: 's1', name: 'Đàn bầu', confidence: '0.41' },
        { id: 's2', name: 'Sáo trúc', confidence: '0.64' },
      ],
    });

    const file = new File([new Uint8Array([1])], 'a.mp3', { type: 'audio/mpeg' });
    const result = await service.analyzeOnlyFromFile(file);

    expect(result.instruments).toHaveLength(2);
    expect(result.instruments[0]?.confidence).toBe(0.41);
    expect(result.instruments[1]?.confidence).toBe(0.64);
  });

  it('extracts instruments from double-nested { data: { data: { instruments } } }', async () => {
    const client = createMockClient();
    const service = createInstrumentDetectionService(client);
    vi.mocked(legacyPost).mockResolvedValueOnce({
      data: {
        data: {
          instruments: [{ id: 'd1', name: 'Đàn tranh', confidence: 0.88 }],
        },
      },
    });

    const file = new File([new Uint8Array([1])], 'a.mp3', { type: 'audio/mpeg' });
    const result = await service.analyzeOnlyFromFile(file);

    expect(result.instruments).toHaveLength(1);
    expect(result.instruments[0]?.name).toBe('Đàn tranh');
    expect(result.instruments[0]?.confidence).toBe(0.88);
  });

  it('returns empty list when supported-instruments fails', async () => {
    const client = createMockClient();
    const service = createInstrumentDetectionService(client);
    client.GET.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'server down' },
      response: new Response(null, { status: 500 }),
    });

    const result = await service.getSupportedInstruments();

    expect(result).toEqual([]);
  });
});
