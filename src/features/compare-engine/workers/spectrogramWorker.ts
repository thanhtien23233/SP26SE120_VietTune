import { runFFTProcessor, type FFTJobInput, type FFTJobOutput } from '../FFTProcessor';

const workerSelf = globalThis as {
  onmessage: ((evt: MessageEvent<FFTJobInput>) => void) | null;
  postMessage: (message: FFTJobOutput) => void;
};

workerSelf.onmessage = (evt: MessageEvent<FFTJobInput>) => {
  const result = runFFTProcessor(evt.data);
  workerSelf.postMessage(result);
};

