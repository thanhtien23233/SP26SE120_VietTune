import type { SpectrogramAssetManifest, SpectrogramTileRequest } from '@/types/spectrogramManifest';

export async function fetchSpectrogramManifest(
  recordingId: string,
): Promise<SpectrogramAssetManifest> {
  const response = await fetch(`/api/spectrogram/${recordingId}/manifest`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error(`Manifest request failed (${response.status})`);
  return (await response.json()) as SpectrogramAssetManifest;
}

export function buildSpectrogramTileUrl(req: SpectrogramTileRequest): string {
  const params = new URLSearchParams({
    version: req.version,
    zoomLevel: String(req.zoomLevel),
    tileIndex: String(req.tileIndex),
    preset: req.preset,
  });
  return `/api/spectrogram/${req.recordingId}/tile?${params.toString()}`;
}

