# Spectrogram Backend Precompute Contract

This document defines the backend-facing API and storage strategy for pre-generated spectrogram assets.

## Goals

- Offload expensive FFT from browser for long recordings
- Ensure deterministic visualization across devices
- Support CDN-friendly tiled spectrogram delivery

## API Endpoints

### GET `/api/spectrogram/{recordingId}/manifest`

Returns rendering metadata and tiling information:

```json
{
  "recordingId": "uuid",
  "version": "v1",
  "sampleRate": 44100,
  "fftSize": 1024,
  "hopSize": 256,
  "frequencyBins": 512,
  "durationSec": 310.4,
  "dbMin": -92.5,
  "dbMax": -18.7,
  "tileDurationSec": 10,
  "zoomLevels": [1, 2, 4, 8],
  "generatedAtUtc": "2026-05-08T03:00:00Z"
}
```

### GET `/api/spectrogram/{recordingId}/tile`

Query params:

- `version`
- `zoomLevel`
- `tileIndex`
- `preset` (`magma | inferno | difference`)

Returns `image/webp` tile for fast canvas drawing.

## Storage Layout

Suggested object path format:

`/spectrogram/{recordingId}/{version}/{preset}/{zoomLevel}/{tileIndex}.webp`

## Generator Pipeline

Python worker stack:

- `ffmpeg` decode -> mono wav
- `librosa.stft` (Hann window)
- dB transform + percentile normalization metadata
- tile rasterization to WebP
- manifest JSON upload

## Frontend Consumption

1. Load manifest once per recording/version
2. Choose zoom level based on viewport
3. Request only visible tiles
4. Cache recent tiles (LRU)
5. Draw tiles + overlays (cursor, labels, markers)

