import { runFFTProcessor, type FFTJobInput, type FFTJobOutput } from './FFTProcessor';

export type SpectrogramJobInput = FFTJobInput;

export function computeSpectrogramFallback(input: SpectrogramJobInput): FFTJobOutput {
  return runFFTProcessor(input);
}

export async function computeSpectrogramWithWorker(
  input: SpectrogramJobInput,
): Promise<FFTJobOutput> {
  try {
    const worker = new Worker(new URL('./workers/spectrogramWorker.ts', import.meta.url), {
      type: 'module',
    });
    return await new Promise<FFTJobOutput>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker timeout'));
      }, 60_000);
      worker.onmessage = (evt: MessageEvent<FFTJobOutput>) => {
        window.clearTimeout(timer);
        worker.terminate();
        resolve(evt.data);
      };
      worker.onerror = () => {
        window.clearTimeout(timer);
        worker.terminate();
        reject(new Error('Worker error'));
      };
      worker.postMessage(input, [input.pcm.buffer]);
    });
  } catch {
    return computeSpectrogramFallback(input);
  }
}

