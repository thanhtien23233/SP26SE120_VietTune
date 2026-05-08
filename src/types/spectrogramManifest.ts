export interface SpectrogramAssetManifest {
  recordingId: string;
  version: string;
  sampleRate: number;
  fftSize: number;
  hopSize: number;
  frequencyBins: number;
  durationSec: number;
  dbMin: number;
  dbMax: number;
  tileDurationSec: number;
  zoomLevels: number[];
  generatedAtUtc: string;
}

export interface SpectrogramTileRequest {
  recordingId: string;
  version: string;
  zoomLevel: number;
  tileIndex: number;
  preset: 'magma' | 'inferno' | 'difference';
}

