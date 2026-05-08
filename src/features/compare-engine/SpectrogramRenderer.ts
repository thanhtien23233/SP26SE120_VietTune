import { diverging, magma } from './colorMaps';
import { DIFFERENCE_CLAMP_DB, RENDER_TILE_WIDTH, TRACK_A_COLOR, TRACK_B_COLOR } from './constants';
import type { SpectrogramMatrix, SpectrogramMode } from './types';

type DrawParams = {
  mode: SpectrogramMode;
  matrixA: SpectrogramMatrix | null;
  matrixB: SpectrogramMatrix | null;
  diff: SpectrogramMatrix | null;
  cursorNorm: number;
  opacity: number;
  zoomX: number;
  /** Busts tile cache when tracks / matrices change (URLs or revision). */
  contentKey: string;
};

export class SpectrogramRenderer {
  private tileCache = new Map<string, ImageData>();

  constructor(private readonly canvas: HTMLCanvasElement) {}

  draw(params: DrawParams) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const width = this.canvas.width;
    const height = this.canvas.height;

    if (import.meta.env.DEV && import.meta.env.VITE_SPECTROGRAM_DEBUG === 'true') {
      // One log per draw is heavy; keep for short debug sessions only.
      // eslint-disable-next-line no-console -- intentional diagnostics
      console.debug('[spectrogram:draw]', {
        dpr: window.devicePixelRatio,
        cssW: this.canvas.style.width || this.canvas.getBoundingClientRect().width,
        cssH: this.canvas.style.height || this.canvas.getBoundingClientRect().height,
        backingW: width,
        backingH: height,
        contentKey: params.contentKey.slice(0, 120),
        mode: params.mode,
        zoomX: params.zoomX,
      });
    }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (!params.matrixA && !params.matrixB && !params.diff) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '14px sans-serif';
      ctx.fillText('Loading spectrogram analysis...', 16, 24);
    } else if (params.mode === 'difference' && params.diff) {
      this.drawDifference(ctx, params.diff, width, height, params.zoomX);
    } else if (params.mode === 'overlay' && params.matrixA && params.matrixB) {
      this.drawOverlay(
        ctx,
        params.matrixA,
        params.matrixB,
        width,
        height,
        params.zoomX,
        params.opacity,
      );
    } else if (params.matrixA && params.matrixB) {
      this.drawSideBySide(ctx, params.matrixA, params.matrixB, width, height, params.zoomX, params.contentKey);
    }

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    const x = Math.round(params.cursorNorm * width);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  private drawSideBySide(
    ctx: CanvasRenderingContext2D,
    a: SpectrogramMatrix,
    b: SpectrogramMatrix,
    w: number,
    h: number,
    zoomX: number,
    contentKey: string,
  ) {
    this.drawSingle(ctx, a, 0, 0, w, h / 2, zoomX, contentKey);
    this.drawSingle(ctx, b, 0, h / 2, w, h / 2, zoomX, contentKey);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '12px sans-serif';
    ctx.fillText('Track A', 8, 16);
    ctx.fillText('Track B', 8, h / 2 + 16);
  }

  private drawSingle(
    ctx: CanvasRenderingContext2D,
    matrix: SpectrogramMatrix,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    zoomX: number,
    contentKey: string,
  ) {
    for (let tileX = 0; tileX < dw; tileX += RENDER_TILE_WIDTH) {
      const tileW = Math.min(RENDER_TILE_WIDTH, dw - tileX);
      const cacheKey = `single:${contentKey}:${matrix.width}:${matrix.height}:${zoomX.toFixed(4)}:${tileX}:${tileW}:${dh}:${matrix.dbP05 ?? -90}:${matrix.dbP95 ?? -20}`;
      const cached = this.tileCache.get(cacheKey);
      if (cached) {
        ctx.putImageData(cached, dx + tileX, dy);
        continue;
      }
      const img = ctx.createImageData(tileW, dh);
      for (let y = 0; y < dh; y++) {
        const srcY = Math.floor((y / dh) * matrix.height);
        for (let x = 0; x < tileW; x++) {
          const absoluteX = tileX + x;
          const srcX = Math.floor(((absoluteX / dw) * matrix.width) / Math.max(zoomX, 0.2));
          const idxM = srcY * matrix.width + Math.min(matrix.width - 1, srcX);
          const [r, g, b, a] = magma(this.normalizeDb(matrix, matrix.data[idxM]));
          const idx = (y * tileW + x) * 4;
          img.data[idx] = r;
          img.data[idx + 1] = g;
          img.data[idx + 2] = b;
          img.data[idx + 3] = a;
        }
      }
      this.tileCache.set(cacheKey, img);
      ctx.putImageData(img, dx + tileX, dy);
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    a: SpectrogramMatrix,
    b: SpectrogramMatrix,
    w: number,
    h: number,
    zoomX: number,
    opacity: number,
  ) {
    /** `opacity`: emphasis on B (0 = A-heavy, 1 = B-heavy). Blend magma(norm) textures, not raw brand RGB weights (was saturating blue). */
    const t = Math.max(0, Math.min(1, opacity));
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const srcY = Math.floor((y / h) * Math.min(a.height, b.height));
      for (let x = 0; x < w; x++) {
        const srcX = Math.floor(((x / w) * Math.min(a.width, b.width)) / Math.max(zoomX, 0.2));
        const idxA = srcY * a.width + Math.min(a.width - 1, srcX);
        const idxB = srcY * b.width + Math.min(b.width - 1, srcX);
        const na = this.normalizeDb(a, a.data[idxA]);
        const nb = this.normalizeDb(b, b.data[idxB]);
        const [ra, ga, ba, aa] = magma(na);
        const [rb, gb, bm, bmA] = magma(nb);
        const idx = (y * w + x) * 4;
        const ar = TRACK_A_COLOR[0] / 255;
        const ag = TRACK_A_COLOR[1] / 255;
        const abTint = TRACK_A_COLOR[2] / 255;
        const br = TRACK_B_COLOR[0] / 255;
        const bgTint = TRACK_B_COLOR[1] / 255;
        const bbTint = TRACK_B_COLOR[2] / 255;
        const taR = Math.min(255, ra * ar * 1.85);
        const taG = Math.min(255, ga * ag * 1.85);
        const taB = Math.min(255, ba * abTint * 1.85);
        const tbR = Math.min(255, rb * br * 1.85);
        const tbG = Math.min(255, gb * bgTint * 1.85);
        const tbB = Math.min(255, bm * bbTint * 1.85);
        img.data[idx] = Math.round(taR * (1 - t) + tbR * t);
        img.data[idx + 1] = Math.round(taG * (1 - t) + tbG * t);
        img.data[idx + 2] = Math.round(taB * (1 - t) + tbB * t);
        img.data[idx + 3] = Math.round((aa + bmA) / 2);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private drawDifference(
    ctx: CanvasRenderingContext2D,
    diff: SpectrogramMatrix,
    w: number,
    h: number,
    zoomX: number,
  ) {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const srcY = Math.floor((y / h) * diff.height);
      for (let x = 0; x < w; x++) {
        const srcX = Math.floor(((x / w) * diff.width) / Math.max(zoomX, 0.2));
        const idxD = srcY * diff.width + Math.min(diff.width - 1, srcX);
        const [r, g, b, a] = diverging(
          Math.max(-1, Math.min(1, diff.data[idxD] / DIFFERENCE_CLAMP_DB)),
        );
        const idx = (y * w + x) * 4;
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.drawDiffLegend(ctx, w);
  }

  private normalizeDb(matrix: SpectrogramMatrix, db: number) {
    let min = matrix.dbP05 ?? matrix.dbMin ?? -90;
    let max = matrix.dbP95 ?? matrix.dbMax ?? -20;
    if (max - min < 0.25) {
      min = matrix.dbMin ?? -90;
      max = matrix.dbMax ?? -20;
    }
    if (max <= min) return 0;
    return Math.max(0, Math.min(1, (db - min) / (max - min)));
  }

  private drawDiffLegend(ctx: CanvasRenderingContext2D, width: number) {
    const legendW = 180;
    const legendH = 10;
    const x0 = width - legendW - 14;
    const y0 = 14;
    const grad = ctx.createLinearGradient(x0, 0, x0 + legendW, 0);
    grad.addColorStop(0, '#2563eb');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#dc2626');
    ctx.fillStyle = grad;
    ctx.fillRect(x0, y0, legendW, legendH);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '11px sans-serif';
    ctx.fillText(`-${DIFFERENCE_CLAMP_DB}dB`, x0, y0 + 24);
    ctx.fillText('0', x0 + legendW / 2 - 3, y0 + 24);
    ctx.fillText(`+${DIFFERENCE_CLAMP_DB}dB`, x0 + legendW - 38, y0 + 24);
  }
}

