import { reportError } from '@/services/errorReporting';

function asError(message: string, value?: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string' && value.trim()) return new Error(`${message}: ${value}`);
  return new Error(message);
}

export function logServiceError(message: string, error?: unknown): void {
  reportError(asError(message, error), undefined, {
    source: 'service',
    message,
  });
}

export function logServiceWarn(message: string, detail?: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(message, detail);
  }
}

export function logServiceInfo(message: string, detail?: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(message, detail);
  }
}
