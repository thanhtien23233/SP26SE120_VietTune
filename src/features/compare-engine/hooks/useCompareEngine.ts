import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Spectrogram from 'wavesurfer.js/plugins/spectrogram';

import { AudioEngine } from '../AudioEngine';
import { USE_CUSTOM_SPECTROGRAM_RENDERER } from '../compareRendererMode';
import { DEFAULT_FFT_SIZE, DEFAULT_HOP_SIZE } from '../constants';
import { buildDifferenceMatrix, summarizeDifference } from '../DifferenceAnalysis';
import { computeSpectrogramFallback, computeSpectrogramWithWorker } from '../SpectrogramComputer';
import { SpectrogramRenderer } from '../SpectrogramRenderer';
import { SyncController } from '../SyncController';
import type {
  DifferenceSummary,
  FocusMode,
  SpectrogramDiagnostics,
  SpectrogramMatrix,
  SpectrogramMode,
} from '../types';

type Params = {
  leftSource: string;
  rightSource: string;
  mode: SpectrogramMode;
};

const DIFF_SUMMARY_WAVESURFER: DifferenceSummary = {
  divergence: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  similarity: 0,
  signedRangeDb: 24,
};

const WS_BASE_MIN_PX = 28;
const WS_WAVE_HEIGHT = 38;
const WS_SPEC_HEIGHT = 200;

function safeDestroy(ws: WaveSurfer | null) {
  if (!ws) return;
  try {
    ws.destroy();
  } catch {
    /* teardown noise */
  }
}

function createSpectrogramWs(
  container: HTMLElement,
  url: string,
  options: {
    waveColor: string;
    progressColor: string;
  },
): WaveSurfer {
  const ws = WaveSurfer.create({
    container,
    url,
    height: WS_WAVE_HEIGHT,
    minPxPerSec: WS_BASE_MIN_PX,
    waveColor: options.waveColor,
    progressColor: options.progressColor,
    cursorColor: '#fef3c7',
    cursorWidth: 2,
    normalize: true,
    interact: false,
    dragToSeek: false,
    hideScrollbar: false,
    autoScroll: true,
    autoCenter: false,
    fetchParams: { credentials: 'omit' },
    backend: 'MediaElement',
    plugins: [
      Spectrogram.create({
        labels: false,
        height: WS_SPEC_HEIGHT,
        splitChannels: false,
        scale: 'mel',
        colorMap: 'roseus',
        gainDB: 20,
        rangeDB: 75,
      }),
    ],
  });
  ws.setVolume(0);
  return ws;
}

export function useCompareEngine({ leftSource, rightSource, mode }: Params) {
  const engineRef = useRef<AudioEngine | null>(null);
  const syncRef = useRef<SyncController | null>(null);
  const rendererRef = useRef<SpectrogramRenderer | null>(null);
  const leftWsRef = useRef<WaveSurfer | null>(null);
  const rightWsRef = useRef<WaveSurfer | null>(null);
  const leftSpectrogramMountRef = useRef<HTMLDivElement | null>(null);
  const rightSpectrogramMountRef = useRef<HTMLDivElement | null>(null);

  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [focusMode, setFocusMode] = useState<FocusMode>('both');
  const [crossfade, setCrossfade] = useState(0.5);
  const [zoomX, setZoomX] = useState(1);
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [matrixA, setMatrixA] = useState<SpectrogramMatrix | null>(null);
  const [matrixB, setMatrixB] = useState<SpectrogramMatrix | null>(null);
  const [difference, setDifference] = useState<SpectrogramMatrix | null>(null);
  const [regionStart, setRegionStart] = useState(0);
  const [regionEnd, setRegionEnd] = useState(0);
  const [motifSimilarity, setMotifSimilarity] = useState(0);
  const [summary, setSummary] = useState<DifferenceSummary>({
    divergence: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    similarity: 1,
    signedRangeDb: 24,
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    trackA: SpectrogramDiagnostics | null;
    trackB: SpectrogramDiagnostics | null;
  }>({ trackA: null, trackB: null });
  const renderRafRef = useRef<number | null>(null);
  /** Bump when muted WaveSurfer instances become ready so zoom reapplies after late mount. */
  const [spectrogramWsReadyTick, setSpectrogramWsReadyTick] = useState(0);

  useEffect(() => {
    const engine = new AudioEngine();
    const sync = new SyncController();
    engineRef.current = engine;
    syncRef.current = sync;
    const unsubscribe = sync.onTimeUpdate((t) => setTime(t));
    const unsubscribeWsSync =
      USE_CUSTOM_SPECTROGRAM_RENDERER
        ? () => {}
        : sync.onTimeUpdate((t) => {
            leftWsRef.current?.setTime(t);
            rightWsRef.current?.setTime(t);
          });

    return () => {
      unsubscribe();
      unsubscribeWsSync();
      sync.stop();
      if (renderRafRef.current !== null) {
        window.cancelAnimationFrame(renderRafRef.current);
      }
      engine.dispose();
      engineRef.current = null;
      syncRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  /** Custom renderer: resize canvas backing store */
  useEffect(() => {
    if (!USE_CUSTOM_SPECTROGRAM_RENDERER) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const updateCanvasSize = () => {
      const base = container ?? canvas;
      const rect = base.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
      const nextHeight = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      if (!rendererRef.current) rendererRef.current = new SpectrogramRenderer(canvas);
    };

    updateCanvasSize();
    const observerTarget = container ?? canvas;
    const ro = new ResizeObserver(() => updateCanvasSize());
    ro.observe(observerTarget);
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  /** Decode audio (+ custom FFT pipeline when enabled). */
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!engineRef.current || !leftSource || !rightSource) return;
      setReady(false);
      setAnalysisLoading(true);
      setAnalysisError(null);
      if (!USE_CUSTOM_SPECTROGRAM_RENDERER) {
        setMatrixA(null);
        setMatrixB(null);
        setDifference(null);
        setDiagnostics({ trackA: null, trackB: null });
        setSummary(DIFF_SUMMARY_WAVESURFER);
      }
      try {
        await Promise.all([
          engineRef.current.loadTrack('A', leftSource),
          engineRef.current.loadTrack('B', rightSource),
        ]);
        if (cancelled) return;
        const dur = Math.max(engineRef.current.getDuration('A'), engineRef.current.getDuration('B'));
        setDuration(dur);
        setRegionStart(0);
        setRegionEnd(dur);
        setMotifSimilarity(0);
        setReady(true);

        if (USE_CUSTOM_SPECTROGRAM_RENDERER) {
          const bufferA = engineRef.current.getBuffer('A');
          const bufferB = engineRef.current.getBuffer('B');
          if (!bufferA || !bufferB) {
            setAnalysisLoading(false);
            return;
          }

          const inputA = {
            pcm: new Float32Array(bufferA.getChannelData(0)),
            sampleRate: bufferA.sampleRate,
            fftSize: DEFAULT_FFT_SIZE,
            hopSize: DEFAULT_HOP_SIZE,
          };
          const inputB = {
            pcm: new Float32Array(bufferB.getChannelData(0)),
            sampleRate: bufferB.sampleRate,
            fftSize: DEFAULT_FFT_SIZE,
            hopSize: DEFAULT_HOP_SIZE,
          };

          const [outputA, outputB] = await Promise.all([
            computeSpectrogramWithWorker(inputA).catch(() => computeSpectrogramFallback(inputA)),
            computeSpectrogramWithWorker(inputB).catch(() => computeSpectrogramFallback(inputB)),
          ]);
          if (cancelled) return;
          setMatrixA(outputA.matrix);
          setMatrixB(outputB.matrix);
          setDiagnostics({ trackA: outputA.diagnostics, trackB: outputB.diagnostics });
          const diff = buildDifferenceMatrix(outputA.matrix, outputB.matrix);
          setDifference(diff);
          setSummary(summarizeDifference(diff));
        }
        /* WaveSurfer path: analysisLoading cleared when both WS instances ready (separate effect). */
        if (!USE_CUSTOM_SPECTROGRAM_RENDERER && !cancelled) {
          /* stays true until WS mount effect */
        }
        if (USE_CUSTOM_SPECTROGRAM_RENDERER && !cancelled) {
          setAnalysisLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setReady(false);
          setAnalysisError(error instanceof Error ? error.message : 'Unable to load audio analysis');
          setAnalysisLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
      syncRef.current?.stop();
      engineRef.current?.pause();
      setIsPlaying(false);
      setTime(0);
      if (USE_CUSTOM_SPECTROGRAM_RENDERER) {
        setAnalysisLoading(false);
      }
    };
  }, [leftSource, rightSource]);

  /** Muted WaveSurfer + Spectrogram: follow AudioEngine time only (no WS audio output). */
  useEffect(() => {
    if (USE_CUSTOM_SPECTROGRAM_RENDERER) return;

    let cancelled = false;
    let raf = 0;
    let mountAttempts = 0;

    const start = () => {
      if (cancelled) return;
      mountAttempts++;
      const leftEl = leftSpectrogramMountRef.current;
      const rightEl = rightSpectrogramMountRef.current;
      if (!leftEl || !rightEl || !leftSource || !rightSource) {
        if (mountAttempts > 300) {
          setAnalysisLoading(false);
          setAnalysisError((prev) => prev ?? 'Spectrogram mounts did not attach');
          return;
        }
        raf = window.requestAnimationFrame(start);
        return;
      }

      safeDestroy(leftWsRef.current);
      safeDestroy(rightWsRef.current);
      leftWsRef.current = null;
      rightWsRef.current = null;

      try {
        const leftWs = createSpectrogramWs(leftEl, leftSource, {
          waveColor: '#E8C98E',
          progressColor: '#9B2C2C',
        });
        const rightWs = createSpectrogramWs(rightEl, rightSource, {
          waveColor: '#93c5fd',
          progressColor: '#1d4ed8',
        });
        leftWsRef.current = leftWs;
        rightWsRef.current = rightWs;

        let leftReady = false;
        let rightReady = false;
        const onReady = () => {
          if (cancelled) return;
          const t0 = engineRef.current?.getCurrentTime() ?? 0;
          leftWs.setTime(t0);
          rightWs.setTime(t0);
        };

        const tryDone = () => {
          if (cancelled || !leftReady || !rightReady) return;
          setAnalysisLoading(false);
          setSpectrogramWsReadyTick((n) => n + 1);
          onReady();
        };

        leftWs.once('ready', () => {
          leftReady = true;
          tryDone();
        });
        rightWs.once('ready', () => {
          rightReady = true;
          tryDone();
        });

        const onErr = (side: string) => (e: Error) => {
          if (cancelled) return;
          setAnalysisError((prev) => prev ?? `Spectrogram load (${side}): ${e.message}`);
          setAnalysisLoading(false);
        };
        leftWs.on('error', onErr('A'));
        rightWs.on('error', onErr('B'));
      } catch (e) {
        if (!cancelled) {
          setAnalysisError(e instanceof Error ? e.message : 'Spectrogram init failed');
          setAnalysisLoading(false);
        }
      }
    };

    setAnalysisLoading(true);
    raf = window.requestAnimationFrame(start);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      safeDestroy(leftWsRef.current);
      safeDestroy(rightWsRef.current);
      leftWsRef.current = null;
      rightWsRef.current = null;
    };
  }, [leftSource, rightSource, mode]);

  useEffect(() => {
    if (USE_CUSTOM_SPECTROGRAM_RENDERER) return;
    const z = Math.max(0.2, zoomX) * WS_BASE_MIN_PX;
    leftWsRef.current?.zoom(z);
    rightWsRef.current?.zoom(z);
  }, [zoomX, spectrogramWsReadyTick]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const dur = Math.max(duration, 0.01);
    if (!USE_CUSTOM_SPECTROGRAM_RENDERER || !renderer) return;
    if (renderRafRef.current !== null) window.cancelAnimationFrame(renderRafRef.current);
    renderRafRef.current = window.requestAnimationFrame(() => {
      renderer.draw({
        mode,
        matrixA,
        matrixB,
        diff: difference,
        cursorNorm: Math.min(1, time / dur),
        opacity: overlayOpacity,
        zoomX,
        contentKey: `${leftSource}|${rightSource}`,
      });
      renderRafRef.current = null;
    });
  }, [
    mode,
    matrixA,
    matrixB,
    difference,
    time,
    duration,
    overlayOpacity,
    zoomX,
    leftSource,
    rightSource,
  ]);

  useEffect(() => {
    if (!USE_CUSTOM_SPECTROGRAM_RENDERER) return;
    if (!matrixA || !matrixB || duration <= 0) {
      setMotifSimilarity(0);
      return;
    }
    const startNorm = Math.max(0, Math.min(1, regionStart / duration));
    const endNorm = Math.max(startNorm, Math.min(1, regionEnd / duration));
    const startX = Math.floor(startNorm * Math.min(matrixA.width, matrixB.width));
    const endX = Math.max(startX + 1, Math.floor(endNorm * Math.min(matrixA.width, matrixB.width)));
    let dot = 0;
    let sumA = 0;
    let sumB = 0;
    for (let y = 0; y < Math.min(matrixA.height, matrixB.height); y++) {
      for (let x = startX; x < endX; x++) {
        const a = matrixA.data[y * matrixA.width + x];
        const b = matrixB.data[y * matrixB.width + x];
        dot += a * b;
        sumA += a * a;
        sumB += b * b;
      }
    }
    const similarity = dot / Math.max(1e-6, Math.sqrt(sumA) * Math.sqrt(sumB));
    setMotifSimilarity((similarity + 1) / 2);
  }, [duration, matrixA, matrixB, regionEnd, regionStart]);

  const exportSpectrogramImage = useCallback(async (slot: 'A' | 'B') => {
    if (!USE_CUSTOM_SPECTROGRAM_RENDERER) {
      const ws = slot === 'A' ? leftWsRef.current : rightWsRef.current;
      if (!ws) return null;
      const urls = await ws.exportImage('image/png', 0.92, 'dataURL');
      return urls[0] ?? null;
    }
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }, []);

  const togglePlay = useCallback(() => {
    if (!engineRef.current || !syncRef.current || !ready) return;
    if (engineRef.current.getPlaying()) {
      engineRef.current.pause();
      syncRef.current.stop();
      syncRef.current.emitOnce();
      setIsPlaying(false);
      return;
    }
    void engineRef.current.play().then(() => {
      syncRef.current?.start(
        () => engineRef.current?.getCurrentTime() ?? 0,
        () => engineRef.current?.getPlaying() ?? false,
      );
      setIsPlaying(true);
    });
  }, [ready]);

  const seek = useCallback((next: number) => {
    if (!engineRef.current || !syncRef.current) return;
    engineRef.current.seek(next);
    syncRef.current.emitOnce();
    setTime(next);
    if (!USE_CUSTOM_SPECTROGRAM_RENDERER) {
      leftWsRef.current?.setTime(next);
      rightWsRef.current?.setTime(next);
    }
  }, []);

  const reset = useCallback(() => {
    if (!engineRef.current || !syncRef.current) return;
    engineRef.current.pause();
    engineRef.current.seek(0);
    syncRef.current.stop();
    syncRef.current.emitOnce();
    setTime(0);
    setIsPlaying(false);
    leftWsRef.current?.setTime(0);
    rightWsRef.current?.setTime(0);
  }, []);

  const setFocus = useCallback((next: FocusMode) => {
    setFocusMode(next);
    engineRef.current?.setFocusMode(next);
  }, []);

  const setCrossfadeSafe = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    setCrossfade(clamped);
    engineRef.current?.setCrossfade(clamped);
  }, []);

  return useMemo(
    () => ({
      spectrogramBackend: USE_CUSTOM_SPECTROGRAM_RENDERER ? ('custom' as const) : ('wavesurfer' as const),
      canvasRef,
      leftSpectrogramMountRef,
      rightSpectrogramMountRef,
      ready,
      isPlaying,
      time,
      duration,
      focusMode,
      crossfade,
      zoomX,
      overlayOpacity,
      summary,
      motifSimilarity,
      regionStart,
      regionEnd,
      setZoomX,
      setOverlayOpacity,
      setRegionStart,
      setRegionEnd,
      setCrossfade: setCrossfadeSafe,
      setFocus,
      togglePlay,
      seek,
      reset,
      analysisLoading,
      analysisError,
      diagnostics,
      exportSpectrogramImage,
    }),
    [
      crossfade,
      duration,
      exportSpectrogramImage,
      focusMode,
      isPlaying,
      overlayOpacity,
      ready,
      reset,
      seek,
      setCrossfadeSafe,
      setFocus,
      summary,
      motifSimilarity,
      regionStart,
      regionEnd,
      time,
      togglePlay,
      zoomX,
      analysisLoading,
      analysisError,
      diagnostics,
    ],
  );
}
