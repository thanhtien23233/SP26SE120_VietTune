import { describe, expect, it, vi } from 'vitest';

import { createGeocodeService } from '@/services/geocodeService';
import { createMetadataSuggestService } from '@/services/metadataSuggestService';
import type { ServiceApiClient } from '@/services/serviceApiClient';

function createMockClient(): ServiceApiClient & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  };
}

describe('ai utility service factories', () => {
  it('normalizes metadata suggest response using injected client', async () => {
    const client = createMockClient();
    const service = createMetadataSuggestService(client);
    client.post.mockResolvedValueOnce({
      Ethnicity: 'Kinh',
      Region: 'Mien Bac',
      Instruments: ['Dan tranh', 123, 'Sao truc'],
    });

    const result = await service.suggestMetadata({
      genre: 'folk',
      title: 'Song',
      description: 'Desc',
    });

    expect(client.post).toHaveBeenCalledWith('MetadataSuggest', {
      genre: 'folk',
      title: 'Song',
      description: 'Desc',
    });
    expect(result).toEqual({
      ethnicity: 'Kinh',
      region: 'Mien Bac',
      instruments: ['Dan tranh', 'Sao truc'],
      message: null,
    });
  });

  it('returns backend error message for metadata suggest failure', async () => {
    const client = createMockClient();
    const service = createMetadataSuggestService(client);
    client.post.mockRejectedValueOnce({
      response: {
        data: { message: 'Gemini unavailable' },
      },
    });

    await expect(service.suggestMetadata({})).resolves.toEqual({
      message: 'Gemini unavailable',
    });
  });

  it('falls back to coordinate text for geocode failure', async () => {
    const client = createMockClient();
    const service = createGeocodeService(client);
    client.get.mockRejectedValueOnce(new Error('network down'));

    const result = await service.getAddressFromCoordinates(10.1234567, 106.7654321);

    expect(result).toEqual({
      address: 'Tọa độ: 10.123457, 106.765432',
      coordinates: '10.123457, 106.765432',
      addressFromService: false,
      message: 'network down',
    });
  });
});
